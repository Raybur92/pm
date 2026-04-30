# AI Setup

The app uses [OpenRouter](https://openrouter.ai) to make LLM calls. The model is `openai/gpt-oss-120b`.

## Configuration

Set your API key in `.env` at the project root:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

This is passed into the Docker container via `--env-file .env` in the start scripts.

## Test connectivity

Run the standalone script from the project root (requires `openai` and `python-dotenv`):

```
python scripts/test_ai.py
```

Or hit the test endpoint while the server is running:

```
curl -X POST http://localhost:8000/api/ai/test
```

Expected response: `{"answer":"4"}`
