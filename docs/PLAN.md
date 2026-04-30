# Project Management MVP — Detailed Execution Plan

## Part 1: Plan & Documentation ✓ COMPLETE

**Goal**: Establish a detailed roadmap with success criteria and testing strategy for all 10 parts.

### Substeps

- [x] Review and document existing frontend architecture (AGENTS.md in frontend/)
- [x] Define database schema proposal for Part 5
- [x] Create detailed substeps for Parts 2–10 with test cases
- [x] Define success criteria and validation gates for each part
- [x] Get user approval before proceeding to Part 2

### Tests & Validation

**Manual**:
- [x] User reviews PLAN.md for clarity and completeness
- [x] User confirms database schema direction is acceptable

**Success Criteria**:
- [x] AGENTS.md documents all components, data types, props, state management, and testing approach
- [x] PLAN.md includes substeps, tests, and success criteria for Parts 2–10
- [x] User signs off on plan before Part 2 starts

---

## Part 2: Scaffolding & Docker Setup ✓ COMPLETE

**Goal**: Set up Docker infrastructure, FastAPI backend skeleton, and start/stop scripts. Verify local execution with a "hello world" example.

### Substeps

- [x] Create Dockerfile with Python 3.11, uv package manager, and multi-stage build
- [x] Create `.env.example` (with placeholder for OPENROUTER_API_KEY)
- [x] Create `backend/` directory structure (app/, routers/, models/, utils/)
- [x] Initialize FastAPI app with basic health check endpoint (`GET /health`)
- [x] Create `pyproject.toml` with FastAPI, uvicorn, openai, sqlalchemy, python-dotenv
- [x] Create start script for macOS (`scripts/start.sh`), Linux (`scripts/start_linux.sh`), Windows (`scripts/start.bat`)
- [x] Create stop script for all platforms
- [x] Add static HTML hello world at `backend/static/index.html` (served at `/`)
- [x] Test local Docker build and run
- [x] Make a backend API call from the app to `/health` and display response

### Tests

**Unit**:
- [x] FastAPI app starts without errors
- [x] `/health` endpoint returns 200 with correct JSON

**E2E**:
- [x] Docker container builds successfully
- [x] Container starts and exposes port 8000
- [x] Static HTML loads at `http://localhost:8000/`
- [x] Backend health check endpoint responds

**Manual**:
- [x] Verify start/stop scripts work on target OS

### Success Criteria

- [x] Docker image builds with no errors
- [x] Local development environment runs via `./scripts/start.sh`
- [x] `/health` endpoint responds with `{"status": "ok"}`
- [x] Static HTML hello world renders at root
- [x] Stop scripts cleanly shut down container

---

## Part 3: Integrate Frontend into Docker & Serve Statically ✓ COMPLETE

**Goal**: Build Next.js frontend and serve as static content from FastAPI. Kanban board displays at `/`.

### Substeps

- [x] Create `frontend/.dockerignore` and `backend/.dockerignore`
- [x] Update Dockerfile to build Next.js app in first stage, copy static output to backend/static/
- [x] Configure Next.js `next.config.ts` to output static files
- [x] Verify frontend builds successfully in Docker
- [x] Create FastAPI route to serve frontend index.html for `/` (catch-all for SPA routing)
- [x] Update start/stop scripts to build and run full Docker container with frontend + backend
- [x] Verify Kanban board appears at `http://localhost:8000/`

### Tests

**Unit**:
- [x] Frontend builds with no TypeScript or build errors
- [x] Next.js static export succeeds

**E2E (Playwright)**:
- [x] Load `http://localhost:8000/`, verify Kanban board renders
- [x] Verify 5 columns (Backlog, Discovery, In Progress, Review, Done) are visible
- [x] Verify sample cards appear in columns
- [x] Add a card to a column and verify it appears locally
- [x] Drag a card between columns and verify reorder works locally
- [x] Rename a column and verify change appears

**Integration**:
- [x] Frontend + Backend serve together from single Docker container
- [x] No console errors in browser dev tools

### Success Criteria

- [x] Kanban board fully functional at `http://localhost:8000/`
- [x] All E2E tests from Part 3 pass
- [x] Frontend unit tests still pass (no regressions)
- [x] Browser loads Kanban without CORS errors or missing assets

---

## Part 4: Authentication Layer (Frontend) ✓ COMPLETE

**Goal**: Add login/logout flow. On load, redirect to `/login` if not authenticated. After login, store session and show Kanban at `/`.

### Substeps

- [x] Create `LoginPage` component with hardcoded credentials ("user", "password")
- [x] Create authentication context (`useAuth` hook) to manage session state
- [x] Create protected route wrapper (redirect unauthenticated users to `/login`)
- [x] Create logout button in Kanban header
- [x] Update root layout to check auth state and redirect as needed
- [x] Store session token in httpOnly cookie or localStorage (with HTTPS notes for MVP)
- [x] Clear session on logout
- [x] Add aria-labels and test-ids for test automation

### Tests

**Unit (Vitest)**:
- [x] LoginPage renders with email/password inputs
- [x] Form submission with correct credentials calls auth handler
- [x] Form submission with wrong credentials shows error message
- [x] Logout button clears session

**E2E (Playwright)**:
- [x] Unauthenticated user is redirected to `/login` on page load
- [x] Login with "user" / "password" redirects to Kanban at `/`
- [x] Kanban board loads after successful login
- [x] Logout button clears session and redirects to `/login`
- [x] Attempting to access Kanban while logged out redirects to `/login`
- [x] Session persists across page reload after login

### Success Criteria

- [x] Only authenticated users can access Kanban
- [x] Login with hardcoded credentials works
- [x] Session persists across page reloads (until logout)
- [x] Logout clears session
- [x] All authentication E2E tests pass (9/9 E2E + 12/12 Unit)

---

## Part 5: Database Schema & Documentation ✓ COMPLETE

**Goal**: Design SQLite schema supporting multi-user Kanban boards. Document assumptions and get user approval.

### Substeps

- [x] Define users table: `id`, `username`, `password_hash`, `created_at`
- [x] Define boards table: `id`, `user_id`, `title`, `created_at`, `updated_at`
- [x] Define columns table: `id`, `board_id`, `title`, `position`, `created_at`, `updated_at`
- [x] Define cards table: `id`, `column_id`, `title`, `details`, `position`, `created_at`, `updated_at`
- [x] Define ai_messages table: `id`, `board_id`, `role` (user/assistant), `content`, `created_at` (for conversation history)
- [x] Document schema as JSON schema file (save to `docs/DATABASE_SCHEMA.json`)
- [x] Document design decisions (e.g., denormalization, cascade rules, indexes)
- [x] Identify potential queries and N+1 issues
- [x] Create migration/initialization SQL

### Tests

**Manual**:
- [x] User reviews schema and approves
- [x] Schema supports multi-user isolation
- [x] Identify edge cases (e.g., what happens if user deletes board)

### Success Criteria

- [x] `docs/DATABASE_SCHEMA.json` documents all tables and relationships
- [x] User approves schema before Part 6 starts
- [x] Schema supports MVP requirements: multiple users, one board per user, multiple columns/cards

---

## Part 6: Backend API & Database Integration ✓ COMPLETE

**Goal**: Implement REST API to fetch and modify Kanban state. Create SQLite database on startup.

### Substeps

- [x] Create SQLAlchemy models based on schema (user, board, column, card, ai_message)
- [x] Set up database initialization (create tables if not exist)
- [x] Create API routes:
  - `GET /api/board` — fetch entire board state for authenticated user
  - `POST /api/board/columns/:id/rename` — rename column
  - `POST /api/board/columns/:id/cards` — create new card
  - `PUT /api/board/cards/:id` — update card (title, details)
  - `DELETE /api/board/cards/:id` — delete card
  - `POST /api/board/cards/:id/move` — move card (columnId, position)
- [x] Add authentication middleware to validate session token
- [x] Create service layer to handle board logic (moveCard, createCard, etc.)
- [x] Add error handling (404s, 400s, 500s with clear messages)
- [x] Create fixtures/seed data for testing

### Tests

**Unit (Pytest)**:
- [x] Database initialization creates all tables
- [x] moveCard service logic works correctly
- [x] API returns 401 for unauthenticated requests
- [x] API returns 404 for non-existent boards/cards

**Integration (Pytest with test database)**:
- [x] GET /api/board returns correct board structure
- [x] POST /api/board/columns/:id/rename updates column title
- [x] POST /api/board/columns/:id/cards creates new card with auto-incremented position
- [x] DELETE /api/board/cards/:id removes card from database
- [x] POST /api/board/cards/:id/move moves card to new column and position
- [x] Multiple users cannot see each other's boards

### Success Criteria

- [x] All backend tests pass (17/17)
- [x] Database file created at startup (`kanban.db`)
- [x] API correctly isolates data by user
- [x] Error responses are informative and return correct HTTP codes

---

## Part 7: Frontend + Backend Integration ✓ COMPLETE

**Goal**: Update frontend to fetch/persist state from backend API instead of local state.

### Substeps

- [x] Create API client (`frontend/src/lib/api.ts`) with typed request/response
- [x] Update KanbanBoard to fetch board on mount (`useEffect` with `/api/board`)
- [x] Replace local state mutations with API calls:
  - Rename column → `POST /api/board/columns/:id/rename`
  - Add card → `POST /api/board/columns/:id/cards`
  - Edit card title/details → `PUT /api/board/cards/:id`
  - Delete card → `DELETE /api/board/cards/:id`
  - Move card → `POST /api/board/cards/:id/move`
- [x] Add inline card editing UI (Edit/Save/Cancel with optimistic update)
- [x] Fix drag-and-drop column highlight for columns that contain cards (track `overItemId` in KanbanBoard via `onDragOver`; highlight if over column droppable OR over any card within that column)
- [x] Add loading states and error handling (toast notifications)
- [x] Add optimistic updates (update UI immediately, revert on error)
- [x] Handle race conditions (disable buttons during async operations)
- [x] Test API calls with mocked responses
- [x] Test with real backend running locally

### Tests

**Unit (Vitest with MSW or fetch mocks)**:
- [x] API client methods format requests correctly
- [x] KanbanBoard fetches board on mount
- [x] Rename column sends correct API call
- [x] Add card sends correct API call
- [x] Delete card sends correct API call
- [x] Move card sends correct API call
- [x] Error responses display toast notification

**E2E (Playwright)**:
- [x] Log in and load Kanban from backend
- [x] Add card, verify it persists across page reload
- [x] Rename column, verify it persists
- [x] Delete card, verify it's gone
- [x] Edit card title, verify it persists
- [x] Drag card to another column, verify it persists
- [x] Multiple cards in different orders persist correctly

**Manual**:
- [x] Start backend, load frontend, verify no console errors
- [ ] Test with real API calls
- [ ] Verify data isolation between users

### Success Criteria

- [x] Board state persists across page reloads
- [x] All create/read/update/delete operations work via backend API
- [x] E2E tests pass with backend running
- [x] Optimistic updates improve perceived performance
- [x] Error handling prevents data loss or corruption

---

## Part 8: AI Connectivity Setup

**Goal**: Verify OpenRouter API connectivity with a simple test call.

### Substeps

- [ ] Add `OPENROUTER_API_KEY` to `.env` file
- [ ] Create `ai.py` module with OpenRouter client initialization
- [ ] Create `POST /api/ai/test` endpoint that calls OpenRouter with "2+2" prompt
- [ ] Parse and return OpenRouter response
- [ ] Create test script to validate API key and connectivity
- [ ] Document OpenRouter setup in `docs/AI_SETUP.md`

### Tests

**Unit**:
- [ ] OpenRouter client initializes with API key
- [ ] Test endpoint formats request correctly

**Integration**:
- [ ] POST /api/ai/test returns correct response (4)
- [ ] Invalid API key returns 401
- [ ] Network timeout handled gracefully

**Manual**:
- [ ] Run test script, verify "2+2" response is returned

### Success Criteria

- [ ] OpenRouter API key validated
- [ ] Test endpoint returns correct math response
- [ ] API call completes within 10 seconds
- [ ] Error handling for API failures

---

## Part 9: AI Board Awareness & Structured Outputs

**Goal**: Extend AI calls to include full board context and accept Structured Outputs for board mutations.

### Substeps

- [ ] Define Structured Output schema (JSON) for AI responses:
  ```json
  {
    "response": "string (user-facing message)",
    "board_updates": [
      { "type": "create_card", "column_id": "...", "title": "...", "details": "..." },
      { "type": "rename_column", "column_id": "...", "title": "..." },
      { "type": "move_card", "card_id": "...", "column_id": "...", "position": "..." },
      { "type": "delete_card", "card_id": "..." }
    ]
  }
  ```
- [ ] Create `POST /api/chat` endpoint:
  - Accept `{ message: string, conversation_history?: [{role, content}] }`
  - Fetch current board state
  - Build AI prompt with board JSON + user message + conversation history
  - Call OpenRouter with Structured Outputs schema
  - Parse response and validate against schema
  - Apply board_updates (create/update/delete cards/columns)
  - Save message to `ai_messages` table
  - Return response + applied updates
- [ ] Create conversation history storage (save user + AI messages)
- [ ] Add validation layer to reject invalid board updates
- [ ] Create retry logic for transient API failures

### Tests

**Unit (Pytest)**:
- [ ] Board JSON serialization includes all cards/columns
- [ ] Response validator accepts valid Structured Output
- [ ] Response validator rejects invalid updates
- [ ] Conversation history formatting is correct

**Integration**:
- [ ] POST /api/chat processes simple request (e.g., "Create a card named X")
- [ ] AI response includes user-facing message
- [ ] board_updates are applied to database
- [ ] Conversation history saved and retrieved correctly
- [ ] Multiple turns of conversation work correctly
- [ ] Invalid board updates are rejected (e.g., delete non-existent card)

**Manual**:
- [ ] Test with various prompts (create card, move card, rename column, multi-step)
- [ ] Verify conversation history builds naturally

### Success Criteria

- [ ] All chat API tests pass
- [ ] AI correctly understands board structure
- [ ] Structured Outputs applied without errors
- [ ] Conversation history maintained
- [ ] Invalid updates rejected gracefully

---

## Part 10: AI Chat Sidebar UI & Live Updates

**Goal**: Build beautiful chat sidebar allowing full conversation with AI and live Kanban updates.

### Substeps

- [ ] Create `ChatSidebar` component with:
  - Message list (scrollable, newest at bottom)
  - Input box with submit button
  - Loading state while awaiting AI response
  - Error state with retry
- [ ] Create `ChatMessage` component (role-based styling: user vs assistant)
- [ ] Integrate ChatSidebar into KanbanBoard layout (main board + sidebar)
- [ ] Add API call to `POST /api/chat` on message submit
- [ ] Stream or batch display messages (send updates to Kanban on board_updates)
- [ ] On board updates from AI, refresh Kanban board state via callback
- [ ] Add Markdown rendering for AI responses
- [ ] Add loading skeleton or spinner
- [ ] Handle edge cases (empty messages, rapid submits, network errors)
- [ ] Add accessibility (aria-labels, keyboard navigation, screen reader support)

### Tests

**Unit (Vitest)**:
- [ ] ChatSidebar renders with message history
- [ ] Input box allows typing and submit
- [ ] ChatMessage renders user/assistant messages with correct styling
- [ ] Loading state appears while awaiting response

**E2E (Playwright)**:
- [ ] Sidebar appears on page load
- [ ] Type message and submit, AI responds
- [ ] AI response displays in sidebar
- [ ] If AI creates card, card appears on board immediately
- [ ] If AI moves card, card movement reflects on board
- [ ] If AI renames column, column rename reflects on board
- [ ] Multiple messages build conversation history
- [ ] Error messages display if API fails

**Manual**:
- [ ] Sidebar styling matches design system (colors, spacing, typography)
- [ ] Markdown links render correctly in AI responses
- [ ] Rapid submits don't cause race conditions

### Success Criteria

- [ ] Chat sidebar is fully functional and beautiful
- [ ] AI can read board context and respond meaningfully
- [ ] AI mutations to board update UI in real-time
- [ ] Conversation history persists and displays
- [ ] All E2E tests pass
- [ ] No console errors or warnings
- [ ] Responsive design works on mobile/tablet

---

## Summary: Test & Success Gate Checklist

| Part | Key Deliverables | Gate Criteria |
|------|------------------|---------------|
| 1 | AGENTS.md, Detailed PLAN.md, DB schema outline | User approval |
| 2 | Docker, FastAPI hello world, start/stop scripts | `/health` endpoint works |
| 3 | Frontend served, Kanban functional locally | All Kanban operations work |
| 4 | Login/logout UI, session management | Auth E2E tests pass |
| 5 | DB schema document, approved by user | User sign-off |
| 6 | REST API for board operations | All integration tests pass |
| 7 | Frontend uses API, data persists | E2E tests with backend pass |
| 8 | OpenRouter connectivity confirmed | Test endpoint returns 4 |
| 9 | AI board awareness, Structured Outputs | Chat API tests pass |
| 10 | Chat sidebar, live Kanban updates | Full E2E flow works |

---

## Key Notes

- **Simplicity First**: No over-engineering; follow existing patterns
- **Testing Strategy**: Unit tests validate logic; E2E tests validate user flows
- **Commit Points**: Finish each part before moving to next; validate success criteria
- **Documentation**: Keep README minimal; API docs in code comments or Markdown
- **Error Handling**: Graceful degradation; clear user-facing error messages

---

## Design Decisions (Implementation Notes)

Key decisions made during implementation, recorded here for future reference.

### Authentication
- Session tokens stored in `localStorage` (not httpOnly cookies) — SPA with static export can't set httpOnly cookies server-side; acceptable for MVP
- Backend uses an in-memory `dict[str, int]` (token → user_id) as the session store; tokens are reset on server restart, which is fine for MVP
- Passwords hashed with `bcrypt` (4 rounds salt); seed user `"user"` / `"password"` is created on first startup if no users exist

### Backend
- SQLAlchemy model for `columns` table is named `KanbanColumn` (not `Column`) to avoid collision with SQLAlchemy's `Column` construct
- Python 3.9 compatibility: used `Optional[str]` from `typing` instead of `str | None` union syntax throughout; `from __future__ import annotations` was avoided because it breaks Pydantic v2 `get_type_hints()` on Python 3.9
- `pyproject.toml` requires `[tool.hatch.build.targets.wheel] packages = ["app"]` so hatchling can locate the package during `uv pip install .` in Docker
- `CardOut` response schema includes `column_id` field (needed by the move-card endpoint to return the card's new location)
- `PRAGMA foreign_keys = ON` is set on every new SQLite connection via a SQLAlchemy event listener to enforce cascade deletes

### Testing
- SQLite in-memory databases for pytest use `StaticPool` from `sqlalchemy.pool` — without it each connection gets a fresh empty database, causing all queries after setup to fail on a different connection
- Vitest globals (`describe`, `it`, `expect`) require `/// <reference types="vitest/globals" />` in the type declaration file, not just `/// <reference types="vitest" />`

### Frontend / DnD
- Column droppable IDs use a `"col-N"` string prefix (`toColumnDndId(id)`) to prevent collision between numeric column IDs (1–5) and numeric card IDs (1+) in @dnd-kit — without this, `moveCard` cannot tell whether `overId` refers to a column or a card
- `moveCard(columns, activeCardId, overId: number | string)`: `typeof overId === "string"` means the pointer is over the empty-column droppable; a number means it's over another card
- Column highlight during drag: `useDroppable`'s `isOver` only fires when the pointer is directly over the droppable element. For columns that contain cards, the `useSortable` items intercept the pointer. Fixed by tracking `overItemId` in `KanbanBoard` via `onDragOver` and passing `isHighlighted` (overId matches column droppable OR any card in that column) as a prop to `KanbanColumn`
- `next.config.ts` rewrites (`/api/*` → `http://localhost:8000/api/*`) are applied only when `NODE_ENV !== "production"` so the static export build is unaffected