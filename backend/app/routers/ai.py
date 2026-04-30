from fastapi import APIRouter, HTTPException
from openai import AuthenticationError
from pydantic import BaseModel

from app.utils.ai import MODEL, get_client

router = APIRouter(prefix="/api/ai", tags=["ai"])


class TestResponse(BaseModel):
    answer: str


@router.post("/test", response_model=TestResponse)
def test_ai():
    try:
        client = get_client()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": "What is 2+2? Reply with just the number."}],
        )
        answer = completion.choices[0].message.content.strip()
        return TestResponse(answer=answer)
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenRouter API key")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter error: {e}")
