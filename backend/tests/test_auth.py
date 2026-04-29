def test_login_success(client):
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/api/auth/login", json={"username": "nobody", "password": "password"})
    assert resp.status_code == 401


def test_board_requires_auth(client):
    resp = client.get("/api/board")
    assert resp.status_code == 401


def test_board_rejects_invalid_token(client):
    resp = client.get("/api/board", headers={"Authorization": "Bearer bad_token"})
    assert resp.status_code == 401
