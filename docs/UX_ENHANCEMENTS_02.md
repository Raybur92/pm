# UX Enhancements — Round 2

Review date: 2026-04-30
Source: Full component code review + heuristic analysis (KanbanBoard, KanbanColumn, KanbanCard, ChatSidebar, LoginPage, NewCardForm, globals.css)
Prior round: UX_ENHANCEMENTS.md (Round 1) — score entering this round: 5.9 / 10 (up from 4.8)

Naming convention: `UX_ENHANCEMENTS_NN.md` for rounds 2+. Item IDs continue sequentially from Round 1 (F-18) so any ID is globally unique across all rounds.

---

## Design Decisions

Notable choices made during implementation that deviate from or clarify the original plan.

**F-22 + F-32 (merged into one approach):** The original plan for F-22 was a CSS `@media(hover:none)` rule and F-32 was `aria-hidden` managed via CSS `focus-within`. CSS alone cannot drive `aria-hidden` or `tabIndex`, so both were solved together with a React state approach: `isActive` (set via `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` on the card article) and `isTouchDevice` (initialized once at mount from `window.matchMedia("(hover: none)")`). `showActions = pendingDelete || isActive || isTouchDevice` drives opacity, `aria-hidden`, and `tabIndex` as a single source of truth. CSS `group-hover` and `focus-within` were removed from the action container entirely.

**F-24 — `getChips` as a pure function outside the component:** Chip generation is a stateless transformation of board data with no side effects, so it lives as a module-level function rather than a hook or derived state. Three chips are generated: first column name, first non-empty column summary, and fullest column list. Falls back to the original static strings when board is null or has no columns.

**F-25 — column-level flash only, not card-level:** The `applied_updates` payload includes `column_id` on `create_card`, `rename_column`, and `move_card`, but `create_card` does not return the new card's ID (the backend returns the original request dict). Card-level highlighting would require a backend response change. Flash is implemented on columns only using a `Set<number>` of column IDs cleared after 1.5s. Ring color is `--primary-blue` to distinguish from the drag-over yellow ring.

**F-26 — total count only, not "in progress" breakdown:** The original spec suggested "12 cards · 4 in progress". "In progress" is ambiguous because column names can be renamed. Computing it by column position (index 2) would be fragile. Implemented as total card count only: `Object.keys(board.cards).length`. No API calls needed.

**F-27 — undo re-creates via `api.createCard`, not soft-delete:** Undo calls `handleAddCard` which calls `api.createCard`. The restored card gets a new database ID and is appended at the end of the column rather than its original position. The original card ID is stored in the `UndoCard` type but is not used in the restore path. Accepted for MVP — position recovery would require a dedicated restore endpoint.

**F-31 — incrementing counter as trigger prop:** `isAddingCard` state stays local to `KanbanColumn` (not lifted). The keyboard shortcut passes `addCardShortcut: number` to only the first column (index 0). The column's `useEffect` watches the counter and opens the form when it increments. This avoids managing per-column open state in KanbanBoard. The shortcut is guarded against firing when an `INPUT` or `TEXTAREA` has focus.

**F-35 — drag width from `event.active.rect.current.initial`:** Width is read from the dnd-kit drag start event rather than a DOM ref or CSS value. Stored in `dragWidth` state and applied as an inline style on the DragOverlay wrapper. Falls back to 260px if the rect is unavailable (e.g., during keyboard drag where no pointer rect exists).

**F-37 — full-height columns via CSS flex/grid chain, not fixed pixel height:** The previous `min-h-[520px]` was a static floor. The new approach makes height flow from `<main>` down through the flex chain: `min-h-screen flex flex-col` → `flex-1` on the board row → `lg:self-stretch` on the overflow wrapper → `h-full` on the grid section → grid items stretch by default (`align-items: stretch`). The `min-h-[520px]` on columns is preserved as a floor for small viewports. The ring-clipping bug was caused by `overflow-x: auto` forcing `overflow-y: auto` per CSS spec — fixed by adding `py-2` to the overflow wrapper so rings render within the padding area.

**F-37 — collapsible sidebar: closed by default, no animation:** The sidebar defaults to hidden (`isChatOpen = false`) on both desktop and mobile. The `lg:hidden` guard on the toggle button was removed — it is now always visible. No slide/fade animation was added because `overflow: hidden` on the animation wrapper would break the sidebar's `position: sticky`, and a transform-based approach would require holding layout space. Simple display toggle is sufficient for this use case.

---

## Immediate — High Severity

- [x] **F-19 Fix login username placeholder**
  `LoginPage.tsx` has `placeholder="user"` on the username input. This exposes a valid credential to anyone who opens the login screen. Replace with `placeholder="Username"`.

---

## Planned — Medium Severity

- [x] **F-20 Add drag affordance to cards**
  Cards are draggable but show no cursor change and no drag handle. Add `cursor-grab` (and `cursor-grabbing` while active) to the card's non-editing state in `KanbanCard.tsx`. Add a small `⠿` drag-handle icon (left edge, visible on hover alongside Edit/Remove). Without this, the core Kanban mechanic is invisible to first-time users.

- [x] **F-21 Add pencil icon to column rename**
  The bottom-border-on-hover rename affordance (F-02) is too subtle — users don't discover it. Add a `✎` icon (12px, `--gray-text`) to the right of the column title in `KanbanColumn.tsx`, visible on header hover. The border approach stays; the icon makes the intent explicit.

- [x] **F-22 Card actions accessible on touch devices**
  Edit and Remove are `opacity-0` until hover. On touch devices there is no hover state, so these buttons are permanently invisible. Use `@media (hover: none)` to make the action button group always visible on touch. A `useTouchDevice` hook is an alternative if more control is needed.

- [x] **F-23 Differentiate Sign Out from primary CTAs**
  Sign Out uses the same `bg-[var(--secondary-purple)] text-white` style as Sign In, Send, and Add card. Exit actions should not compete visually with creation/submission actions. Change Sign Out to a border-only style: `border border-[var(--stroke)] text-[var(--navy-dark)]` with a hover darkening. Reserve filled purple for creation and submission.

- [x] **F-24 Context-aware AI suggestion chips**
  The three suggestion chips in `ChatSidebar.tsx` are hardcoded strings. If "Done" is empty, "Move all Done cards to Backlog" runs as a no-op. If a column is renamed, the chip uses the stale name. Pass the current `board` state as a prop to `ChatSidebar` and derive chip labels from actual column names and card counts. Fall back to static chips when board is null.

- [x] **F-25 Visual feedback when AI applies board changes**
  When `onBoardUpdated()` fires after an AI action, the board refreshes silently. Users must visually scan the entire board to find what changed. After the refresh, briefly highlight affected cards or columns (1.5s yellow ring pulse). Requires `applied_updates` in the backend response to include card/column IDs. Without this, the AI feature feels untrustworthy.

- [x] **F-26 Board summary in header**
  The header shows only the app name and "Saved". Add a compact status line: total card count and an in-progress count (e.g., "12 cards · 4 in progress"). All per-column `cards.length` values already exist in board state — a rollup needs no new API calls.

- [x] **F-27 Undo toast for card deletion**
  The two-step delete confirmation (F-09) is good as a gate, but once "Confirm" is clicked there is no recovery. After `api.deleteCard()` completes, show a 5-second undo toast: "Card deleted · Undo". Hold the deleted card data in local state during the window and re-POST it if undo is triggered. No schema change required.

---

## Backlog — Low Severity

- [x] **F-28 Fix empty state copy direction**
  `KanbanColumn.tsx` empty state reads "Add one below or drop a card here." The `+ Add` button is in the column header, above the empty state area — not below it. Change to "Add one above or drop a card here."

- [x] **F-29 Escape key closes NewCardForm**
  `KanbanCard.tsx` edit mode handles Escape to cancel. `NewCardForm.tsx` does not. Add `onKeyDown` to the title input: if `e.key === "Escape"`, call `onOpenChange(false)` and reset form state.

- [x] **F-30 Scroll new card form into view on open**
  Clicking `+ Add` from the column header opens `NewCardForm` at the bottom of the card list. On a full column, the form is below the viewport with no scroll-to behavior. Add a `useEffect` on `isOpen` in `NewCardForm` (or `KanbanColumn`) that calls `formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })`.

- [x] **F-31 Keyboard shortcut to open add-card form**
  There is no keyboard path to add a card without mouse interaction. Add a `keydown` listener in `KanbanBoard` for `N` (or `A`) that opens the new card form on the first or focused column.

- [x] **F-32 aria-hidden on opacity-hidden card buttons**
  In `KanbanCard.tsx`, when the action button group is in its hidden state (`opacity-0`), set `aria-hidden="true"` and `tabIndex={-1}` on the container. Remove both when `focus-within` or `pendingDelete` makes the group visible. This prevents screen readers from announcing invisible buttons during normal tab navigation.

- [x] **F-33 Skip-to-main-content link**
  Add a visually hidden skip link as the first focusable element in `KanbanBoard`: `<a href="#kanban-board" className="sr-only focus:not-sr-only ...">Skip to board</a>`. Add `id="kanban-board"` to the `<section>` grid. Keyboard users currently tab through the full header on every page load before reaching the board.

- [x] **F-34 Screen-reader author labels in chat messages**
  User and assistant messages are visually differentiated by alignment and color but convey no semantic authorship. In `ChatMessage.tsx`, add `<span className="sr-only">{role === "user" ? "You" : "Assistant"}: </span>` before the message content.

- [x] **F-35 Drag overlay width matches actual card width**
  `KanbanBoard.tsx` wraps `DragOverlay` content in `w-[260px]`. Columns use `minmax(220px, 1fr)` and expand on wide viewports — a card can render at 320px while its drag ghost stays at 260px. Replace with `w-full` constrained by the overlay bounds, or read the dragged card's DOM width at `onDragStart` and apply it dynamically.

---

## Additions — Feature Requests

- [x] **F-37 Full-height columns + collapsible AI sidebar**
  Two separate changes implemented together as they both touch the layout structure in `KanbanBoard.tsx`.

  **Full-height columns:** Columns were cut off at the top and bottom by the `overflow-x-auto` wrapper, which also clips `overflow-y` per CSS spec — causing column ring highlights to be clipped during drag-over. Additionally, columns stopped at `min-h-[520px]` instead of filling the remaining page. Fix: `min-h-screen flex flex-col` on `<main>`, `flex-1` on the board row, `py-2 lg:self-stretch` on the overflow wrapper (gives rings room + stretches to row height), `h-full` on the grid section (grid items then stretch to fill via default `align-items: stretch`).

  **Collapsible AI sidebar:** Chat sidebar was always visible on desktop (`hidden lg:block`). The toggle button was `lg:hidden`. Change: toggle button visible on all screen sizes, sidebar defaults to hidden (`isChatOpen = false`) on both desktop and mobile, shown only when the user explicitly opens it. No animation — display toggle only.

---

## Deferred

- [ ] **F-36 Mobile column navigation (single-lane view)**
  On mobile, 5 columns require horizontal scroll that competes with native touch swipe. The correct pattern is a single-column lane view with a tab strip or swipeable column selector. Deferred — revisit in Part 7 (frontend-backend integration) or later when mobile usage patterns are clearer.
