# UX Enhancements

Review date: 2026-04-30  
Source: Full component code review + heuristic analysis  
Overall score: 4.8 / 10 (directional)

---

## Design Decisions

Notable choices made during implementation that deviate from or clarify the original plan.

**Header (F-01):** The header was originally a floating white card (`bg-white/80`). Root cause of repeated disappearance: the `<div className="relative overflow-hidden">` root wrapper creates a block formatting context that silently suppresses child layout in certain rendering paths — the header was structurally absent from the rendered DOM even though the JSX was correct. Fix: replaced the root wrapper with a React fragment `<>`. The decorative gradient blobs were moved to a `fixed inset-0 -z-10 overflow-hidden` layer so they stay behind all content without affecting layout. Final header: white card (`bg-white`) with a 4px yellow top border, subtle shadow, and a 10%-opacity navy border — distinct enough from the `#f7f8fb` page background. Scrolls with the page (no sticky/fixed).

**Card delete confirmation (F-09):** Original plan was a 5-second undo toast. Implemented instead as an inline two-step confirmation: clicking "Remove" shows "Confirm" (red) and "Cancel" buttons in place. Simpler, requires no backend soft-delete, and keeps interaction self-contained on the card.

**Column rename affordance (F-02):** Used a bottom border approach (transparent → `var(--stroke)` on hover, `var(--primary-blue)` on focus) rather than a pencil icon. Keeps the column header clean and communicates editability through the focus pattern users already recognise from form inputs.

**AI suggestion chips (F-07):** Required extracting the submit logic into a `sendMessage(text: string)` helper to allow chips to bypass the controlled input state. `handleSubmit` now delegates to `sendMessage(input.trim())`.

**Save indicator (F-10):** "Saved" text sits inline next to the app name in the header, toggled via `opacity-0 / opacity-100` CSS transition. Driven by a `savedAt: number | null` state that auto-clears after 2 seconds via `useEffect`. No spinner or blocking state — purely ambient feedback.

---

## Immediate — High Severity

- [x] **F-01 Collapse header to a compact bar**  
  Replaced the full decorative header with a compact white card: app name + "Saved" indicator left, Chat toggle (mobile only) + Sign Out right. White background with 4px yellow top border and a subtle shadow to separate it from the `#f7f8fb` page surface. Scrolls with the page. See Design Decisions for the root-cause investigation.

- [x] **F-08 Remove demo credentials from login UI**  
  Deleted the `"Demo credentials: user / password"` line from `LoginPage.tsx`.

- [x] **F-09 Add card delete confirmation**  
  Inline two-step flow: "Remove" sets `pendingDelete = true`, which swaps to "Confirm" (red) + "Cancel". Actual delete only fires on explicit confirm.

- [x] **F-11 Basic responsive layout**  
  Below `lg` breakpoint, the ChatSidebar is hidden by default. A "Chat / Hide Chat" toggle button appears in the header (mobile only, `lg:hidden`). When open, the sidebar renders full-width below the board. Decorative blobs moved to a `fixed inset-0 -z-10 overflow-hidden` layer (see F-01 Design Decision), removing the need for any `overflow-hidden` on the main layout wrapper.

---

## Planned — Medium Severity

- [x] **F-02 Column rename affordance**  
  Column title input now has `cursor-text`, a bottom border that appears on hover (`var(--stroke)`) and turns blue on focus (`var(--primary-blue)`). `aria-label` updated to `"Rename column <title>"`.

- [x] **F-03 Hide card actions until hover**  
  Edit and Remove buttons are `opacity-0` by default, revealed on `group-hover` or `focus-within`. When `pendingDelete` is active the buttons remain fully visible regardless of hover state.

- [x] **F-04 Remove redundant column pills from header**  
  Resolved by the header replacement (F-01) — the new header contains no column list.

- [ ] **F-05 Add / remove columns from the UI**  
  Deferred — requires backend API endpoints for column creation and deletion that are not yet built. Revisit in Part 6 (backend API) or later.

- [x] **F-06 Empty board onboarding state**  
  Empty columns now show "No cards yet" with a sub-line "Add one below or drop a card here" instead of the instruction-only "Drop a card here".

- [x] **F-07 AI suggestion chips in ChatSidebar**  
  Three clickable chips appear before the first message: "Create a card in Backlog", "Move all Done cards to Backlog", "Summarize what's in Review". Clicking one submits immediately via `sendMessage()`.

- [x] **F-10 Save / persist status indicator**  
  "Saved" fades in next to the app name in the header after every successful drag, rename, add, delete, or update. Auto-clears after 2 seconds. `aria-live="polite"` for screen readers.

- [x] **F-12 Remove "Focus" marketing widget from app header**  
  Resolved by the header replacement (F-01).

- [x] **F-16 Keyboard drag-and-drop support**  
  `KeyboardSensor` added alongside `PointerSensor` with `sortableKeyboardCoordinates`. Cards are now reorderable with keyboard navigation.

- [x] **F-17 Fix gray text contrast (WCAG AA)**  
  `--gray-text` changed from `#888888` (3.55:1) to `#6b6b6b` (5.0:1) in `globals.css`. Passes WCAG AA for normal text.

---

## Backlog — Low Severity

- [x] **F-13 Auto-dismiss error toast**  
  Added a `useEffect` in `KanbanBoard` that clears the error state after 6 seconds whenever a new error is set. The ✕ manual dismiss button remains.

- [x] **F-14 Auto-growing chat textarea**  
  Textarea starts at `rows={1}` and grows on input: `el.style.height = "auto"` then `el.style.height = scrollHeight + "px"` capped at 128px (~8 lines). Height resets to auto on send.

- [x] **F-15 NewCardForm trigger position**  
  `isOpen` state lifted from `NewCardForm` to `KanbanColumn`. A "＋ Add" button added in the column header (next to the card count), always visible without scrolling. `NewCardForm` now accepts `isOpen` / `onOpenChange` props and returns `null` when closed.

- [x] **F-18 Stable key for chat messages**  
  Added `id: string` field to the `Message` type. IDs are set as `${Date.now()}-user` / `${Date.now()}-assistant` at push time. `key={msg.id}` used in the render loop.

---

## Cosmetic

- [x] Normalize login page to use CSS variables. Replaced all hardcoded hex values (`#032147`, `#888888`, `#209dd7`, `#753991`) with `var(--navy-dark)`, `var(--gray-text)`, `var(--primary-blue)`, `var(--secondary-purple)`, and `var(--stroke)`.
