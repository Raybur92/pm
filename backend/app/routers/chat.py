import json

from fastapi import APIRouter, Depends, HTTPException
from openai import AuthenticationError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_session
from app.utils.ai import MODEL, get_client
from app.utils.auth import require_auth
from app.utils.board import get_board_for_user
from app.utils.chat import (
    SYSTEM_PROMPT_TEMPLATE,
    apply_updates,
    call_ai_with_retry,
    load_history,
    save_messages,
    serialize_board,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    applied_updates: list


@router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    board_json = serialize_board(board)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(board_json=json.dumps(board_json, indent=2))

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(load_history(session, board.id))
    messages.append({"role": "user", "content": body.message})

    try:
        client = get_client()
        raw = call_ai_with_retry(client, MODEL, messages)
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenRouter API key")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter error: {e}")

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned invalid JSON")

    ai_response = parsed.get("response", "")
    if not isinstance(ai_response, str):
        ai_response = str(ai_response)

    board_updates = parsed.get("board_updates", [])
    if not isinstance(board_updates, list):
        board_updates = []

    applied = apply_updates(session, board_updates, board)
    save_messages(session, board.id, body.message, ai_response)

    return ChatResponse(response=ai_response, applied_updates=applied)
