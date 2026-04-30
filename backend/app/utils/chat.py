import json
import time
from typing import Any

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database import AiMessage, Board
from app.utils.board import create_card, delete_card, move_card, rename_column, update_card

SYSTEM_PROMPT_TEMPLATE = """You are a Kanban board assistant. You help users manage their project board.

Current board state:
{board_json}

You MUST respond with valid JSON matching this exact schema:
{{
  "response": "<your message to the user>",
  "board_updates": [
    // zero or more of:
    {{"type": "create_card", "column_id": <int>, "title": "<str>", "details": "<str>"}}
    {{"type": "rename_column", "column_id": <int>, "title": "<str>"}}
    {{"type": "move_card", "card_id": <int>, "column_id": <int>, "position": <int>}}
    {{"type": "update_card", "card_id": <int>, "title": "<str>", "details": "<str>"}}
    {{"type": "delete_card", "card_id": <int>}}
  ]
}}

Use board_updates to make changes to the board. If no changes are needed, use an empty array."""


def serialize_board(board: Board) -> dict:
    return {
        "id": board.id,
        "title": board.title,
        "columns": [
            {
                "id": col.id,
                "title": col.title,
                "position": col.position,
                "cards": [
                    {
                        "id": card.id,
                        "title": card.title,
                        "details": card.details,
                        "position": card.position,
                    }
                    for card in col.cards
                ],
            }
            for col in board.columns
        ],
    }


def call_ai_with_retry(client: OpenAI, model: str, messages: list, max_retries: int = 2) -> str:
    from openai import AuthenticationError, RateLimitError

    last_error: Exception = RuntimeError("No attempts made")
    for attempt in range(max_retries + 1):
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            return completion.choices[0].message.content.strip()
        except AuthenticationError:
            raise
        except (RateLimitError, Exception) as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(1)
    raise last_error


def validate_update(update: Any, valid_column_ids: set, valid_card_ids: set) -> bool:
    if not isinstance(update, dict):
        return False
    t = update.get("type")
    if t == "create_card":
        return (
            isinstance(update.get("column_id"), int)
            and update["column_id"] in valid_column_ids
            and isinstance(update.get("title"), str)
            and bool(update["title"].strip())
        )
    if t == "rename_column":
        return (
            isinstance(update.get("column_id"), int)
            and update["column_id"] in valid_column_ids
            and isinstance(update.get("title"), str)
            and bool(update["title"].strip())
        )
    if t == "move_card":
        return (
            isinstance(update.get("card_id"), int)
            and update["card_id"] in valid_card_ids
            and isinstance(update.get("column_id"), int)
            and update["column_id"] in valid_column_ids
            and isinstance(update.get("position"), int)
        )
    if t == "update_card":
        return (
            isinstance(update.get("card_id"), int)
            and update["card_id"] in valid_card_ids
        )
    if t == "delete_card":
        return (
            isinstance(update.get("card_id"), int)
            and update["card_id"] in valid_card_ids
        )
    return False


def apply_updates(session: Session, updates: list, board: Board) -> list:
    board_id = board.id
    valid_column_ids = {col.id for col in board.columns}
    valid_card_ids = {card.id for col in board.columns for card in col.cards}
    applied = []

    for update in updates:
        if not validate_update(update, valid_column_ids, valid_card_ids):
            continue
        try:
            t = update["type"]
            if t == "create_card":
                create_card(session, update["column_id"], update["title"], update.get("details", ""), board_id)
                applied.append(update)
            elif t == "rename_column":
                rename_column(session, update["column_id"], update["title"], board_id)
                applied.append(update)
            elif t == "move_card":
                move_card(session, update["card_id"], update["column_id"], update["position"], board_id)
                applied.append(update)
            elif t == "update_card":
                update_card(session, update["card_id"], board_id, update.get("title"), update.get("details"))
                applied.append(update)
            elif t == "delete_card":
                delete_card(session, update["card_id"], board_id)
                valid_card_ids.discard(update["card_id"])
                applied.append(update)
        except Exception:
            pass

    return applied


def load_history(session: Session, board_id: int) -> list[dict]:
    msgs = session.scalars(
        select(AiMessage)
        .where(AiMessage.board_id == board_id)
        .order_by(AiMessage.created_at)
    ).all()
    return [{"role": msg.role, "content": msg.content} for msg in msgs]


def save_messages(session: Session, board_id: int, user_message: str, ai_response: str) -> None:
    session.add(AiMessage(board_id=board_id, role="user", content=user_message))
    session.add(AiMessage(board_id=board_id, role="assistant", content=ai_response))
    session.commit()
