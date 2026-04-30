"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { toColumnDndId } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  isHighlighted?: boolean;
  onRename: (columnId: number, title: string) => void;
  onAddCard: (columnId: number, title: string, details: string) => void;
  onDeleteCard: (columnId: number, cardId: number) => void;
  onUpdateCard: (columnId: number, cardId: number, title: string, details: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  isHighlighted,
  onRename,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: toColumnDndId(column.id) });
  const [localTitle, setLocalTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);

  useEffect(() => {
    setLocalTitle(column.title);
  }, [column.title]);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[520px] flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)] transition",
        (isHighlighted || isOver) && "ring-2 ring-[var(--accent-yellow)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className="h-2 w-10 rounded-full bg-[var(--accent-yellow)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              {cards.length} cards
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCard(true)}
              aria-label={`Add card to ${column.title}`}
              className="ml-auto rounded-full border border-dashed border-[var(--stroke)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
            >
              + Add
            </button>
          </div>
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              const trimmed = localTitle.trim();
              if (trimmed && trimmed !== column.title) {
                onRename(column.id, trimmed);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLocalTitle(column.title);
                e.currentTarget.blur();
              }
            }}
            className="mt-3 w-full cursor-text bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none border-b border-transparent hover:border-[var(--stroke)] focus:border-[var(--primary-blue)] transition-colors"
            aria-label={`Rename column ${column.title}`}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onUpdate={(cardId, title, details) => onUpdateCard(column.id, cardId, title, details)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">No cards yet</p>
            <p className="text-xs text-[var(--gray-text)]">Add one below or drop a card here</p>
          </div>
        )}
      </div>
      <NewCardForm
        isOpen={isAddingCard}
        onOpenChange={setIsAddingCard}
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
