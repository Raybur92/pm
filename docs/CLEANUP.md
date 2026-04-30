# Cleanup Plan

Two passes. Pass 1 fixes correctness issues with no behavior change. Pass 2 completes the `ai_messages` integration so conversation history persists across page reloads.

---

## Pass 1 — Correctness

### Backend

- [x] **Replace `session.query()` with `select()`** (`backend/app/utils/board.py`, `backend/app/models/database.py`)
  - `create_card`: `session.query(Card).filter(...).count()` → `select(func.count()).where(...)`
  - `delete_card`: `session.query(Card).filter(...).update(...)` → `update(Card).where(...)`
  - `move_card`: all three `session.query(Card).filter(...).update(...)` calls
  - `init_db`: `session.query(User).count()` → `select(func.count(User.id))`

- [x] **Fix `datetime.utcnow()` deprecation** (`backend/app/models/database.py`)
  - Replace all `default=datetime.utcnow` and `onupdate=datetime.utcnow` with `datetime.now(timezone.utc)`
  - Add `from datetime import timezone` import

- [x] **Fix AI retry to skip non-retryable errors** (`backend/app/utils/chat.py`)
  - `call_ai_with_retry` currently sleeps and retries on `AuthenticationError`
  - Re-raise immediately on `AuthenticationError` before the sleep

- [x] **Bump pydantic to `>=2.11.0`** (`backend/pyproject.toml`)
  - Discovered during Pass 1: pydantic 2.9.2 pins pydantic-core 2.23.4 which does not build on Python 3.14
  - Updated to `>=2.11.0` (and pydantic-settings to `>=2.7.0`) to unblock local test runs
  - Docker still uses Python 3.11, so this was a pre-existing local environment issue

### Frontend

- [x] **Move `apiBoardToBoardData` to `lib/kanban.ts`** (`frontend/src/components/KanbanBoard.tsx`, `frontend/src/lib/kanban.ts`)
  - It is a pure data transformation with no UI concern; it belongs with the other board utilities

- [x] **Add Escape key handler to column title input** (`frontend/src/components/KanbanColumn.tsx`)
  - On Escape: reset `localTitle` to `column.title` and blur the input
  - Makes column rename consistent with card edit (which already has Escape-to-cancel)

- [x] **Add type guard on `active.id` cast in `handleDragEnd`** (`frontend/src/components/KanbanBoard.tsx`)
  - `active.id` is `UniqueIdentifier` (string | number); the cast to `number` is unchecked
  - Guard: if `typeof active.id !== "number"` return early

---

## Pass 2 — Complete `ai_messages` Integration

Currently `save_messages` writes to the DB but the chat endpoint ignores it, reading history from
the client-sent `conversation_history` payload instead. History is lost on every page reload.

- [x] **Load history from DB server-side** (`backend/app/utils/chat.py`, `backend/app/routers/chat.py`)
  - Add `load_history(session, board_id) -> list[dict]` that queries `ai_messages` ordered by `created_at`
  - In the chat router, replace the `conversation_history` loop with `load_history(session, board.id)`
  - Drop `conversation_history` from `ChatRequest` (no longer needed)

- [x] **Remove `conversation_history` from the frontend** (`frontend/src/lib/api.ts`, `frontend/src/components/ChatSidebar.tsx`)
  - Remove the `history` parameter from `api.chat()`
  - Remove the `messages` state that was being passed as history; the server now owns history
  - The frontend still maintains local `messages` state for display, but stops sending it to the API

- [x] **Update backend tests** (`backend/tests/test_chat.py`)
  - Replace tests that pass `conversation_history` in the request body
  - Add tests that verify history is loaded from the DB between requests
