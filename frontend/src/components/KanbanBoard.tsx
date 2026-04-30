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

type UndoCard = { columnId: number; title: string; details: string } | null;

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
  const [flashingColumnIds, setFlashingColumnIds] = useState<Set<number>>(new Set());
  const [undoCard, setUndoCard] = useState<UndoCard>(null);
  const [addCardShortcut, setAddCardShortcut] = useState(0);
  const [dragWidth, setDragWidth] = useState(260);

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

  useEffect(() => {
    if (!undoCard) return;
    const t = setTimeout(() => setUndoCard(null), 5000);
    return () => clearTimeout(t);
  }, [undoCard]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      setAddCardShortcut((c) => c + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as number);
    setDragWidth(event.active.rect.current.initial?.width ?? 260);
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
    const cardToDelete = board.cards[cardId];
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
      setUndoCard({ columnId, title: cardToDelete.title, details: cardToDelete.details });
    } catch (err: unknown) {
      setBoard(snapshot);
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const handleUndoDelete = async () => {
    if (!undoCard) return;
    const { columnId, title, details } = undoCard;
    setUndoCard(null);
    await handleAddCard(columnId, title, details);
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

  const refreshBoard = async (updates: Array<Record<string, unknown>> = []) => {
    try {
      const data = await api.getBoard();
      setBoard(apiBoardToBoardData(data));

      const colIds = new Set<number>(
        updates
          .map((u) => u.column_id as number | undefined)
          .filter((id): id is number => typeof id === "number")
      );
      if (colIds.size > 0) {
        setFlashingColumnIds(colIds);
        setTimeout(() => setFlashingColumnIds(new Set()), 1500);
      }
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
  const totalCards = Object.keys(board.cards).length;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      </div>

      <a
        href="#kanban-board"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--navy-dark)] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
      >
        Skip to board
      </a>

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

      {undoCard && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] shadow-lg"
        >
          <span>Card deleted</span>
          <button
            onClick={handleUndoDelete}
            className="font-semibold text-[var(--primary-blue)] hover:underline"
          >
            Undo
          </button>
          <button
            onClick={() => setUndoCard(null)}
            aria-label="Dismiss"
            className="text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
          >
            ✕
          </button>
        </div>
      )}

      <main className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-8 px-6 pb-16 pt-8">
        <header className="flex items-center justify-between rounded-2xl border border-[rgba(3,33,71,0.1)] border-t-4 border-t-[var(--accent-yellow)] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(3,33,71,0.1)]">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
            <span className="text-xs text-[var(--gray-text)]">
              {totalCards} card{totalCards !== 1 ? "s" : ""}
            </span>
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
              className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
            >
              {isChatOpen ? "Hide Chat" : "Chat"}
            </button>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              aria-label="Sign out"
              className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto py-2 lg:self-stretch">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <section id="kanban-board" className="grid h-full gap-6" style={{ gridTemplateColumns: "repeat(5, minmax(220px, 1fr))" }}>
                {board.columns.map((column, index) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    cards={column.cardIds.map((cardId) => board.cards[cardId])}
                    isHighlighted={
                      overItemId === toColumnDndId(column.id) ||
                      column.cardIds.some((id) => id === overItemId)
                    }
                    isFlashing={flashingColumnIds.has(column.id)}
                    addCardShortcut={index === 0 ? addCardShortcut : undefined}
                    onRename={handleRenameColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                    onUpdateCard={handleUpdateCard}
                  />
                ))}
              </section>
              <DragOverlay>
                {activeCard ? (
                  <div style={{ width: dragWidth }}>
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className={isChatOpen ? "block" : "hidden"}>
            <ChatSidebar board={board} onBoardUpdated={refreshBoard} />
          </div>
        </div>
      </main>
    </>
  );
};
