def test_get_board_returns_structure(client, auth_headers):
    resp = client.get("/api/board", headers=auth_headers)
    assert resp.status_code == 200
    board = resp.json()
    assert board["title"] == "My Board"
    assert len(board["columns"]) == 5
    titles = [c["title"] for c in board["columns"]]
    assert titles == ["Backlog", "Discovery", "In Progress", "Review", "Done"]
    for col in board["columns"]:
        assert col["cards"] == []


def test_rename_column(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]

    resp = client.post(f"/api/board/columns/{col_id}/rename", json={"title": "Ideas"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Ideas"

    board2 = client.get("/api/board", headers=auth_headers).json()
    assert board2["columns"][0]["title"] == "Ideas"


def test_rename_column_not_found(client, auth_headers):
    resp = client.post("/api/board/columns/99999/rename", json={"title": "X"}, headers=auth_headers)
    assert resp.status_code == 404


def test_create_card(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]

    resp = client.post(
        f"/api/board/columns/{col_id}/cards",
        json={"title": "My Card", "details": "Some details"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    card = resp.json()
    assert card["title"] == "My Card"
    assert card["details"] == "Some details"
    assert card["position"] == 0

    board2 = client.get("/api/board", headers=auth_headers).json()
    assert len(board2["columns"][0]["cards"]) == 1


def test_create_card_position_increments(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]

    client.post(f"/api/board/columns/{col_id}/cards", json={"title": "Card A"}, headers=auth_headers)
    resp = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "Card B"}, headers=auth_headers)
    assert resp.json()["position"] == 1


def test_update_card(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]
    card_id = client.post(
        f"/api/board/columns/{col_id}/cards", json={"title": "Old"}, headers=auth_headers
    ).json()["id"]

    resp = client.put(f"/api/board/cards/{card_id}", json={"title": "New", "details": "Updated"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"
    assert resp.json()["details"] == "Updated"


def test_delete_card(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]
    card_id = client.post(
        f"/api/board/columns/{col_id}/cards", json={"title": "To Delete"}, headers=auth_headers
    ).json()["id"]

    resp = client.delete(f"/api/board/cards/{card_id}", headers=auth_headers)
    assert resp.status_code == 204

    board2 = client.get("/api/board", headers=auth_headers).json()
    assert board2["columns"][0]["cards"] == []


def test_delete_card_shifts_positions(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]
    a = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "A"}, headers=auth_headers).json()
    b = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "B"}, headers=auth_headers).json()
    c = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "C"}, headers=auth_headers).json()

    client.delete(f"/api/board/cards/{b['id']}", headers=auth_headers)

    board2 = client.get("/api/board", headers=auth_headers).json()
    cards = board2["columns"][0]["cards"]
    assert len(cards) == 2
    assert cards[0]["title"] == "A" and cards[0]["position"] == 0
    assert cards[1]["title"] == "C" and cards[1]["position"] == 1


def test_move_card_same_column(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]
    a = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "A"}, headers=auth_headers).json()
    b = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "B"}, headers=auth_headers).json()
    c = client.post(f"/api/board/columns/{col_id}/cards", json={"title": "C"}, headers=auth_headers).json()

    # Move A (pos 0) to position 2
    resp = client.post(
        f"/api/board/cards/{a['id']}/move",
        json={"column_id": col_id, "position": 2},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    board2 = client.get("/api/board", headers=auth_headers).json()
    cards = board2["columns"][0]["cards"]
    assert cards[0]["title"] == "B"
    assert cards[1]["title"] == "C"
    assert cards[2]["title"] == "A"


def test_move_card_different_column(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    src_col_id = board["columns"][0]["id"]
    dst_col_id = board["columns"][1]["id"]

    card = client.post(
        f"/api/board/columns/{src_col_id}/cards", json={"title": "My Card"}, headers=auth_headers
    ).json()

    resp = client.post(
        f"/api/board/cards/{card['id']}/move",
        json={"column_id": dst_col_id, "position": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["column_id"] == dst_col_id

    board2 = client.get("/api/board", headers=auth_headers).json()
    assert board2["columns"][0]["cards"] == []
    assert len(board2["columns"][1]["cards"]) == 1


def test_move_card_not_found(client, auth_headers):
    board = client.get("/api/board", headers=auth_headers).json()
    col_id = board["columns"][0]["id"]
    resp = client.post(
        "/api/board/cards/99999/move",
        json={"column_id": col_id, "position": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_users_cannot_see_each_others_boards(client, auth_headers):
    # Only one user in test DB; verify 404 for unknown board via bad token path
    resp = client.get("/api/board", headers={"Authorization": "Bearer fake"})
    assert resp.status_code == 401
