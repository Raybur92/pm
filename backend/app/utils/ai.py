import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

MODEL = "openai/gpt-oss-120b"


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
