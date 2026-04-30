import json
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database import AiMessage, Card, KanbanColumn
from app.utils.chat import apply_updates, serialize_board, validate_update


# --- Helpers ---

def _get_board(client, auth_headers):
    resp = client.get("/api/board", headers=auth_headers)
    assert resp.status_code == 200
    return resp.json()


def _make_ai_raw(response: str, board_updates: list = None) -> str:
    return json.dumps({"response": response, "board_updates": board_updates or []})


def _patch_ai(raw: str):
    return patch("app.routers.chat.call_ai_with_retry", return_value=raw)


# --- Unit: board serialization ---

def test_serialize_board_includes_columns_and_cards(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    with Session(test_engine) as session:
        from app.models.database import Board
        board = session.get(Board, board_data["id"])
        result = serialize_board(board)

    assert result["id"] == board_data["id"]
    assert len(result["columns"]) == 5
    for col in result["columns"]:
        assert "id" in col
        assert "title" in col
        assert "position" in col
        assert "cards" in col


# --- Unit: validate_update ---

def test_validate_update_create_card_valid():
    assert validate_update(
        {"type": "create_card", "column_id": 1, "title": "New Card"},
        valid_column_ids={1}, valid_card_ids=set()
    )


def test_validate_update_create_card_bad_column():
    assert not validate_update(
        {"type": "create_card", "column_id": 99, "title": "X"},
        valid_column_ids={1}, valid_card_ids=set()
    )


def test_validate_update_create_card_empty_title():
    assert not validate_update(
        {"type": "create_card", "column_id": 1, "title": "  "},
        valid_column_ids={1}, valid_card_ids=set()
    )


def test_validate_update_rename_column_valid():
    assert validate_update(
        {"type": "rename_column", "column_id": 1, "title": "New Name"},
        valid_column_ids={1}, valid_card_ids=set()
    )


def test_validate_update_move_card_valid():
    assert validate_update(
        {"type": "move_card", "card_id": 5, "column_id": 2, "position": 0},
        valid_column_ids={1, 2}, valid_card_ids={5}
    )


def test_validate_update_move_card_bad_card():
    assert not validate_update(
        {"type": "move_card", "card_id": 99, "column_id": 1, "position": 0},
        valid_column_ids={1}, valid_card_ids={5}
    )


def test_validate_update_delete_card_valid():
    assert validate_update(
        {"type": "delete_card", "card_id": 3},
        valid_column_ids=set(), valid_card_ids={3}
    )


def test_validate_update_unknown_type():
    assert not validate_update(
        {"type": "explode_board"},
        valid_column_ids={1}, valid_card_ids={1}
    )


# --- Integration: POST /api/chat ---

def test_chat_requires_auth(client):
    resp = client.post("/api/chat", json={"message": "hello"})
    assert resp.status_code == 401


def test_chat_returns_response(client, auth_headers):
    with _patch_ai(_make_ai_raw("Hello! No changes needed.")):
        resp = client.post("/api/chat", json={"message": "hi"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["response"] == "Hello! No changes needed."
    assert resp.json()["applied_updates"] == []


def test_chat_create_card_applied(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    first_col_id = board_data["columns"][0]["id"]

    raw = _make_ai_raw("Created a card.", [
        {"type": "create_card", "column_id": first_col_id, "title": "AI Card", "details": "from AI"}
    ])
    with _patch_ai(raw):
        resp = client.post("/api/chat", json={"message": "create a card"}, headers=auth_headers)

    assert resp.status_code == 200
    assert len(resp.json()["applied_updates"]) == 1

    # Verify card persisted in database
    with Session(test_engine) as session:
        card = session.query(Card).filter_by(title="AI Card").first()
        assert card is not None
        assert card.details == "from AI"


def test_chat_rename_column_applied(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    col_id = board_data["columns"][0]["id"]

    raw = _make_ai_raw("Renamed.", [
        {"type": "rename_column", "column_id": col_id, "title": "Sprint 1"}
    ])
    with _patch_ai(raw):
        resp = client.post("/api/chat", json={"message": "rename backlog"}, headers=auth_headers)

    assert resp.status_code == 200
    assert len(resp.json()["applied_updates"]) == 1

    with Session(test_engine) as session:
        col = session.get(KanbanColumn, col_id)
        assert col.title == "Sprint 1"


def test_chat_delete_card_applied(client, auth_headers, test_engine):
    # First create a card via the board API
    board_data = _get_board(client, auth_headers)
    col_id = board_data["columns"][0]["id"]
    create_resp = client.post(
        f"/api/board/columns/{col_id}/cards",
        json={"title": "To Delete"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    card_id = create_resp.json()["id"]

    raw = _make_ai_raw("Deleted.", [{"type": "delete_card", "card_id": card_id}])
    with _patch_ai(raw):
        resp = client.post("/api/chat", json={"message": "delete it"}, headers=auth_headers)

    assert resp.status_code == 200
    assert len(resp.json()["applied_updates"]) == 1

    with Session(test_engine) as session:
        assert session.get(Card, card_id) is None


def test_chat_invalid_update_rejected(client, auth_headers):
    raw = _make_ai_raw("Done.", [
        {"type": "delete_card", "card_id": 99999}  # non-existent card
    ])
    with _patch_ai(raw):
        resp = client.post("/api/chat", json={"message": "delete card"}, headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["applied_updates"] == []


def test_chat_saves_conversation_history(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    board_id = board_data["id"]

    with _patch_ai(_make_ai_raw("Got it.")):
        client.post("/api/chat", json={"message": "what is on the board?"}, headers=auth_headers)

    with Session(test_engine) as session:
        msgs = session.scalars(
            select(AiMessage).where(AiMessage.board_id == board_id).order_by(AiMessage.created_at)
        ).all()
        assert len(msgs) == 2
        assert msgs[0].role == "user"
        assert msgs[0].content == "what is on the board?"
        assert msgs[1].role == "assistant"
        assert msgs[1].content == "Got it."


def test_chat_multiple_turns_loads_history_from_db(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    board_id = board_data["id"]

    with _patch_ai(_make_ai_raw("Turn 1.")):
        client.post("/api/chat", json={"message": "turn 1"}, headers=auth_headers)

    # On the second request the server should load turn 1 from the DB automatically.
    # Capture the messages actually sent to the AI to verify history was included.
    with patch("app.routers.chat.call_ai_with_retry", return_value=_make_ai_raw("Turn 2.")) as mock_ai:
        resp = client.post("/api/chat", json={"message": "turn 2"}, headers=auth_headers)

    assert resp.status_code == 200

    # The messages list passed to the AI: system + 2 history msgs + current user msg = 4
    call_messages = mock_ai.call_args[0][2]
    roles = [m["role"] for m in call_messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert call_messages[1]["content"] == "turn 1"
    assert call_messages[2]["content"] == "Turn 1."

    with Session(test_engine) as session:
        msgs = session.scalars(
            select(AiMessage).where(AiMessage.board_id == board_id).order_by(AiMessage.created_at)
        ).all()
        assert len(msgs) == 4


def test_chat_invalid_json_from_ai_returns_502(client, auth_headers):
    with patch("app.routers.chat.call_ai_with_retry", return_value="not json at all"):
        resp = client.post("/api/chat", json={"message": "hello"}, headers=auth_headers)
    assert resp.status_code == 502


def test_chat_network_error_returns_502(client, auth_headers):
    with patch("app.routers.chat.call_ai_with_retry", side_effect=Exception("timeout")):
        resp = client.post("/api/chat", json={"message": "hello"}, headers=auth_headers)
    assert resp.status_code == 502


def test_chat_move_card_applied(client, auth_headers, test_engine):
    board_data = _get_board(client, auth_headers)
    src_col_id = board_data["columns"][0]["id"]
    dst_col_id = board_data["columns"][1]["id"]

    # Create a card to move
    create_resp = client.post(
        f"/api/board/columns/{src_col_id}/cards",
        json={"title": "Moveable"},
        headers=auth_headers,
    )
    card_id = create_resp.json()["id"]

    raw = _make_ai_raw("Moved.", [
        {"type": "move_card", "card_id": card_id, "column_id": dst_col_id, "position": 0}
    ])
    with _patch_ai(raw):
        resp = client.post("/api/chat", json={"message": "move it"}, headers=auth_headers)

    assert resp.status_code == 200
    assert len(resp.json()["applied_updates"]) == 1

    with Session(test_engine) as session:
        card = session.get(Card, card_id)
        assert card.column_id == dst_col_id
