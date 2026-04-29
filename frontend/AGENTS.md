# Frontend Architecture & Codebase

## Overview

A React 19 + Next.js 16 frontend using TypeScript, built with Tailwind CSS and dnd-kit for drag-and-drop functionality. The app displays a Kanban board with 5 fixed columns (Backlog, Discovery, In Progress, Review, Done) containing draggable cards that can be edited and deleted.

## Project Setup

- **Package Manager**: npm
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Next.js with TypeScript
- **Styling**: Tailwind CSS 4 with custom CSS variables
- **Drag & Drop**: @dnd-kit (sortable, core, utilities)

## State Management

**Client-only**: React hooks (useState, useMemo) with component-level state in KanbanBoard.
- No global state library; all state lives in the `<KanbanBoard>` component
- State shape: `BoardData` containing `columns: Column[]` and `cards: Record<string, Card>`

## Key Data Types

[kanban.ts](src/lib/kanban.ts#L1-L10):
```typescript
type Card = { id: string; title: string; details: string }
type Column = { id: string; title: string; cardIds: string[] }
type BoardData = { columns: Column[]; cards: Record<string, Card> }
```

## Component Hierarchy

### [KanbanBoard](src/components/KanbanBoard.tsx) (Client Component)
**Props**: None (root component)  
**State**:
- `board: BoardData` — entire Kanban state
- `activeCardId: string | null` — card being dragged

**Handlers**:
- `handleDragStart(event)` — sets activeCardId
- `handleDragEnd(event)` — calls moveCard utility and updates columns
- `handleRenameColumn(columnId, title)` — edits column.title
- `handleAddCard(columnId, title, details)` — creates new card, appends to column.cardIds
- `handleDeleteCard(columnId, cardId)` — removes card from cards dict and column.cardIds

**Children**: KanbanColumn (one per column)

### [KanbanColumn](src/components/KanbanColumn.tsx)
**Props**:
```typescript
{
  column: Column
  cards: Card[]
  onRename: (columnId, title) => void
  onAddCard: (columnId, title, details) => void
  onDeleteCard: (columnId, cardId) => void
}
```
**Renders**: Input for column rename, KanbanCard children, NewCardForm  
**Droppable**: Uses useDroppable to accept dropped cards; highlights with ring-2 on hover  
**Card Count**: Displays "X cards" label

### [KanbanCard](src/components/KanbanCard.tsx)
**Props**:
```typescript
{ card: Card, onDelete: (cardId) => void }
```
**Sortable**: Uses useSortable for drag behavior; applies CSS transform  
**Opacity**: isDragging state reduces opacity to 0.6  
**Delete**: "Remove" button triggers onDelete callback

### [NewCardForm](src/components/NewCardForm.tsx)
**Props**:
```typescript
{ onAdd: (title, details) => void }
```
**State**:
- `isOpen: boolean` — toggles form visibility
- `formState: { title: string, details: string }`

**Validation**: Requires non-empty title; trims both fields  
**UI**: Toggle "Add a card" button; form collapses after submit

### [KanbanCardPreview](src/components/KanbanCardPreview.tsx)
Used in DragOverlay during drag; renders a preview of the card being dragged.

### [Home](src/app/page.tsx)
Simple page component that renders `<KanbanBoard />`.

## Utility Functions

### [kanban.ts](src/lib/kanban.ts)

**createId(prefix)**: Generates `"${prefix}-${timestamp}-${random}"`

**moveCard(columns, activeId, overId)**: Core reordering logic
- Finds column containing activeId
- Finds column containing overId (or if overId is a column, uses that)
- Removes card from source column
- Appends to target column (preserves order)
- Returns new columns array

**initialData**: Hardcoded 5-column setup with 8 sample cards (Backlog, Discovery, In Progress, Review, Done)

## Testing Strategy

### Unit Tests

**[KanbanBoard.test.tsx](src/components/KanbanBoard.test.tsx)**
- Verifies 5 columns render
- Tests column rename functionality
- Tests add/remove card flow

Uses @testing-library/react + userEvent

**[kanban.test.ts](src/lib/kanban.test.ts)**
- Tests moveCard within same column (reordering)
- Tests moveCard across columns
- Tests moveCard to empty column

### E2E Tests

**[tests/kanban.spec.ts](tests/kanban.spec.ts)** (Playwright)
- Loads page, verifies board headings and column count
- Adds a card via form
- Drags card between columns with mouse simulation

## Styling

- **Color Variables**: `--primary-blue`, `--secondary-purple`, `--accent-yellow`, `--navy-dark`, `--gray-text`, `--stroke`, `--surface-strong`, `--shadow`
- **Layout**: Flexbox; responsive max-w-[1500px] with px-6 gutters
- **Cards**: White bg, rounded-2xl, subtle shadow, smooth transitions
- **Columns**: Rounded-3xl border, light bg, min-h-[520px]
- **Drag State**: Reduced opacity (0.6) and increased shadow during drag

## Test Commands

```bash
npm run test:unit          # Vitest unit tests
npm run test:unit:watch    # Vitest watch mode
npm run test:e2e          # Playwright E2E
npm run test:all          # Both unit + E2E
```

## Known Limitations (MVP)

1. **No persistence**: Board state resets on page reload
2. **No authentication**: Single hardcoded user (to be added in Part 4)
3. **No AI integration**: Chat sidebar not yet implemented (Part 10)
4. **No backend**: Runs entirely client-side (Parts 6+ add backend)
5. **Fixed columns**: Column creation/deletion not implemented; only rename
