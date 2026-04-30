# UX Enhancements

Review date: 2026-04-30  
Source: Full component code review + heuristic analysis  
Overall score: 4.8 / 10 (directional)

---

## Immediate — High Severity

- [ ] **F-01 Collapse header to a compact bar**  
  Replace the full decorative header (tagline, Focus widget, column pills) with a single compact bar: app name left, Sign Out right. The board should be visible without scrolling on any standard monitor.

- [ ] **F-08 Remove demo credentials from login UI**  
  Delete the `"Demo credentials: user / password"` line from `LoginPage.tsx`. Move to `.env.example` or internal docs only.

- [ ] **F-09 Add card delete confirmation / undo**  
  "Remove" currently calls `onDelete` immediately. Add a 5-second undo toast (soft-delete pattern) or an inline "Are you sure?" toggle. No data loss on misclick.

- [ ] **F-11 Basic responsive layout**  
  The board requires ~1450px minimum. Add a breakpoint below 768px: hide the ChatSidebar behind a toggle, switch the column grid to horizontal scroll. Single-column stacked view is the ideal mobile target.

---

## Planned — Medium Severity

- [ ] **F-02 Column rename affordance**  
  The column title looks like plain text. Add a pencil icon on hover or apply `cursor: text` + subtle underline to signal it is editable.

- [ ] **F-03 Hide card actions until hover**  
  Edit and Remove are always visible on every card, creating constant visual noise. Show them only on `group-hover`. Reduces clutter immediately and lowers accidental deletion risk.

- [ ] **F-04 Remove redundant column pills from header**  
  The pill badges in the header repeat the column names already visible in the board. Remove them. Contributes to header height reduction.

- [ ] **F-05 Add / remove columns from the UI**  
  Currently only rename is possible. Add an "Add column" button at the end of the board and a delete affordance on empty columns.

- [ ] **F-06 Empty board onboarding state**  
  New users see 5 empty columns with no guidance. Add a prompt ("Add your first task") that triggers the NewCardForm, or pre-populate one sample card on first login.

- [ ] **F-07 AI suggestion chips in ChatSidebar**  
  Replace or augment the static placeholder with 2–3 clickable example prompts: "Create a card in Backlog", "Move all Done cards", "Summarize what's in Review". Teaches capability at first use.

- [ ] **F-10 Save / persist status indicator**  
  After a drag, rename, or card edit there is no feedback that the change was saved. Add a subtle "Saved" signal near the action or a status line in the header ("All changes saved").

- [ ] **F-12 Remove "Focus" marketing widget from app header**  
  "One board. Five columns. Zero clutter." is landing-page copy, not app UI. Remove the widget. Reclaim header space for the board.

- [ ] **F-16 Keyboard drag-and-drop support**  
  Add `KeyboardSensor` from dnd-kit alongside the existing `PointerSensor`. ~10 lines. Required for WCAG 2.1 SC 2.1.1.

  ```ts
  import { KeyboardSensor } from "@dnd-kit/core";
  import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  ```

- [ ] **F-17 Fix gray text contrast (WCAG AA)**  
  `--gray-text: #888888` on white is 3.55:1 — fails AA for normal text (requires 4.5:1). Change to `#767676` or `#6b6b6b` in `globals.css`. Single variable change.

---

## Backlog — Low Severity

- [ ] **F-13 Auto-dismiss error toast**  
  The global error banner requires manual dismissal. Add auto-dismiss after 6 seconds for non-critical errors. Keep the ✕ button as well.

- [ ] **F-14 Auto-growing chat textarea**  
  Chat input is fixed at `rows={2}`. Use CSS `field-sizing: content` or a JS resize observer to auto-grow up to a max height.

- [ ] **F-15 NewCardForm trigger position**  
  "Add a card" is at the bottom of each column, scrolled out of view for long columns. Add or move the trigger to the column header area.

- [ ] **F-18 Stable key for chat messages**  
  `messages.map((msg, i) => <ChatMessage key={i} />)` uses array index. Replace with a stable ID (timestamp + role, or an incrementing counter).

---

## Cosmetic

- [ ] Normalize login page to use CSS variables (`var(--navy-dark)` etc.) instead of hardcoded hex values. Currently `LoginPage.tsx` uses raw `#032147`, `#888888`, `#209dd7` while the rest of the app uses tokens.
