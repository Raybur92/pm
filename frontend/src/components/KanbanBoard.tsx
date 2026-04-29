"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { moveCard, toColumnDndId, type BoardData } from "@/lib/kanban";
import { useAuth } from "@/lib/auth";
import { api, type ApiBoard } from "@/lib/api";

function apiBoardToBoardData(apiBoard: ApiBoard): BoardData {
  const columns = apiBoard.columns.map((col) => ({
    id: col.id,
    title: col.title,
    position: col.position,
    cardIds: col.cards.map((c) => c.id),
  }));
  const cards: BoardData["cards"] = {};
  for (const col of apiBoard.columns) {
    for (const card of col.cards) {
      cards[card.id] = { id: card.id, title: card.title, details: card.details };
    }
  }
  return { columns, cards };
}

export const KanbanBoard = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [overItemId, setOverItemId] = useState<number | string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    api
      .getBoard()
      .then((data) => setBoard(apiBoardToBoardData(data)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load board")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverItemId(event.over?.id ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    setOverItemId(null);
    if (!over || active.id === over.id || !board) return;

    const cardId = active.id as number;
    // over.id is either a numeric card id or a "col-N" string column id
    const overId = over.id as number | string;

    const updatedColumns = moveCard(board.columns, cardId, overId);
    const targetCol = updatedColumns.find((c) => c.cardIds.includes(cardId));
    if (!targetCol) return;

    const targetPosition = targetCol.cardIds.indexOf(cardId);
    const snapshot = board;
    setBoard({ ...board, columns: updatedColumns });

    try {
      await api.moveCard(cardId, targetCol.id, targetPosition);
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to move card");
    }
  };

  const handleRenameColumn = async (columnId: number, title: string) => {
    if (!board) return;
    const snapshot = board;
    setBoard({
      ...board,
      columns: board.columns.map((col) =>
        col.id === columnId ? { ...col, title } : col
      ),
    });
    try {
      await api.renameColumn(columnId, title);
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to rename column");
    }
  };

  const handleAddCard = async (columnId: number, title: string, details: string) => {
    try {
      const card = await api.createCard(columnId, title, details);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              cards: {
                ...prev.cards,
                [card.id]: { id: card.id, title: card.title, details: card.details },
              },
              columns: prev.columns.map((col) =>
                col.id === columnId
                  ? { ...col, cardIds: [...col.cardIds, card.id] }
                  : col
              ),
            }
          : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add card");
    }
  };

  const handleDeleteCard = async (columnId: number, cardId: number) => {
    if (!board) return;
    const snapshot = board;
    setBoard({
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => Number(id) !== cardId)
      ),
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
          : col
      ),
    });
    try {
      await api.deleteCard(cardId);
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const handleUpdateCard = async (columnId: number, cardId: number, title: string, details: string) => {
    if (!board) return;
    const snapshot = board;
    setBoard({
      ...board,
      cards: { ...board.cards, [cardId]: { ...board.cards[cardId], title, details } },
    });
    try {
      await api.updateCard(cardId, title, details);
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to update card");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Loading...</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-500">{error ?? "Failed to load board"}</p>
      </div>
    );
  }

  const activeCard = activeCardId != null ? board.cards[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      {error && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                aria-label="Sign out"
                className="rounded-lg bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Sign Out
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                isHighlighted={
                  overItemId === toColumnDndId(column.id) ||
                  column.cardIds.some((id) => id === overItemId)
                }
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onUpdateCard={handleUpdateCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
