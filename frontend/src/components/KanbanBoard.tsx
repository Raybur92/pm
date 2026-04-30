"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { apiBoardToBoardData, moveCard, toColumnDndId, type BoardData } from "@/lib/kanban";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export const KanbanBoard = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [overItemId, setOverItemId] = useState<number | string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const markSaved = () => setSavedAt(Date.now());

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
    if (typeof active.id !== "number") return;

    const cardId = active.id;
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
      markSaved();
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
      markSaved();
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to rename column");
    }
  };

  const handleAddCard = async (columnId: number, title: string, details: string) => {
    try {
      const card = await api.createCard(columnId, title, details);
      markSaved();
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
      markSaved();
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const handleUpdateCard = async (_columnId: number, cardId: number, title: string, details: string) => {
    if (!board) return;
    const snapshot = board;
    setBoard({
      ...board,
      cards: { ...board.cards, [cardId]: { ...board.cards[cardId], title, details } },
    });
    try {
      await api.updateCard(cardId, title, details);
      markSaved();
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to update card");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const refreshBoard = async () => {
    try {
      const data = await api.getBoard();
      setBoard(apiBoardToBoardData(data));
    } catch {
      // Keep current board state on refresh failure
    }
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
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      </div>

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

      <main className="mx-auto flex max-w-[1800px] flex-col gap-8 px-6 pb-16 pt-8">
        <header className="flex items-center justify-between rounded-2xl border border-[rgba(3,33,71,0.1)] border-t-4 border-t-[var(--accent-yellow)] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(3,33,71,0.1)]">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
            <span
              aria-live="polite"
              className={`text-xs text-[var(--gray-text)] transition-opacity duration-500 ${savedAt ? "opacity-100" : "opacity-0"}`}
            >
              Saved
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen((v) => !v)}
              aria-label="Toggle AI chat"
              className="lg:hidden rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
            >
              {isChatOpen ? "Hide Chat" : "Chat"}
            </button>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              aria-label="Sign out"
              className="rounded-lg bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <section className="grid gap-6" style={{ gridTemplateColumns: "repeat(5, minmax(220px, 1fr))" }}>
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
          </div>
          <div className={isChatOpen ? "block" : "hidden lg:block"}>
            <ChatSidebar onBoardUpdated={refreshBoard} />
          </div>
        </div>
      </main>
    </>
  );
};
