import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.database import Base, get_session
from app.utils import auth as auth_utils

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    import bcrypt
    from app.models.database import Board, KanbanColumn, User

    with Session(engine) as session:
        pw_hash = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode()
        user = User(username="user", password_hash=pw_hash)
        session.add(user)
        session.flush()
        board = Board(user_id=user.id, title="My Board")
        session.add(board)
        session.flush()
        for i, title in enumerate(["Backlog", "Discovery", "In Progress", "Review", "Done"]):
            session.add(KanbanColumn(board_id=board.id, title=title, position=i))
        session.commit()

    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def client(test_engine):
    # Clear in-memory sessions between tests
    auth_utils._sessions.clear()

    def override_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_headers(client):
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert resp.status_code == 200
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
