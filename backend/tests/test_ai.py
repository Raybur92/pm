from unittest.mock import MagicMock, patch

import pytest


def make_completion(content: str):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    completion = MagicMock()
    completion.choices = [choice]
    return completion


# --- Unit: client initializes with API key ---

def test_get_client_raises_without_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    from app.utils.ai import get_client
    with pytest.raises(ValueError, match="OPENROUTER_API_KEY not set"):
        get_client()


def test_get_client_returns_openai_instance(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key")
    from openai import OpenAI
    from app.utils.ai import get_client
    client = get_client()
    assert isinstance(client, OpenAI)
    assert client.base_url.host == "openrouter.ai"


# --- Integration: POST /api/ai/test (mocked OpenRouter) ---

def test_ai_test_endpoint_returns_answer(client):
    with patch("app.routers.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_completion("4")
        mock_get_client.return_value = mock_client

        resp = client.post("/api/ai/test")

    assert resp.status_code == 200
    assert resp.json()["answer"] == "4"


def test_ai_test_endpoint_formats_request_correctly(client):
    with patch("app.routers.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_completion("4")
        mock_get_client.return_value = mock_client

        client.post("/api/ai/test")

        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "openai/gpt-oss-120b"
        assert any("2+2" in m["content"] for m in call_kwargs.kwargs["messages"])


def test_ai_test_endpoint_returns_401_on_auth_error(client):
    from openai import AuthenticationError
    with patch("app.routers.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = AuthenticationError(
            message="Invalid API key",
            response=MagicMock(status_code=401, headers={}),
            body=None,
        )
        mock_get_client.return_value = mock_client

        resp = client.post("/api/ai/test")

    assert resp.status_code == 401


def test_ai_test_endpoint_returns_500_when_no_key(client):
    with patch("app.routers.ai.get_client", side_effect=ValueError("OPENROUTER_API_KEY not set")):
        resp = client.post("/api/ai/test")
    assert resp.status_code == 500


def test_ai_test_endpoint_returns_502_on_network_error(client):
    with patch("app.routers.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Connection timeout")
        mock_get_client.return_value = mock_client

        resp = client.post("/api/ai/test")

    assert resp.status_code == 502
