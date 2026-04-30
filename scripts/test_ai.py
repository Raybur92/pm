#!/usr/bin/env python3
"""Validates OpenRouter API key and connectivity by sending a simple test prompt."""

import os
import sys
from pathlib import Path

# Load .env from project root
project_root = Path(__file__).parent.parent
env_file = project_root / ".env"
if env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(env_file)

from openai import AuthenticationError, OpenAI

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    print("ERROR: OPENROUTER_API_KEY not set in .env or environment")
    sys.exit(1)

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

print("Testing OpenRouter connectivity...")
try:
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": "What is 2+2? Reply with just the number."}],
    )
    answer = completion.choices[0].message.content.strip()
    print(f"Response: {answer}")
    if "4" in answer:
        print("SUCCESS: OpenRouter API is working correctly")
    else:
        print(f"WARNING: Unexpected response (expected '4', got '{answer}')")
except AuthenticationError:
    print("ERROR: Invalid API key - check OPENROUTER_API_KEY in .env")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
