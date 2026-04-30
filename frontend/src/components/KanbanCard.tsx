"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: number) => void;
  onUpdate: (cardId: number, title: string, details: string) => void;
};

export const KanbanCard = ({ card, onDelete, onUpdate }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);

  // treat touch-primary devices as always-active so buttons stay visible
  const [isTouchDevice] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches
  );

  useEffect(() => {
    setTitle(card.title);
    setDetails(card.details);
  }, [card.title, card.details]);

  const showActions = pendingDelete || isActive || isTouchDevice;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onUpdate(card.id, trimmed, details.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setDetails(card.details);
    setEditing(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        editing ? "cursor-default" : isDragging ? "cursor-grabbing" : "cursor-grab",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      data-testid={`card-${card.id}`}
      onMouseEnter={() => { if (!editing) setIsActive(true); }}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => { if (!editing) setIsActive(true); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsActive(false);
      }}
      {...attributes}
      {...(editing ? {} : listeners)}
    >
      {editing ? (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            className="w-full rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-sm font-semibold text-[var(--navy-dark)] outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
            aria-label="Card title"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-sm leading-6 text-[var(--gray-text)] outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
            aria-label="Card details"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[var(--primary-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1 flex-shrink-0 select-none text-xs leading-none text-[var(--gray-text)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 [@media(hover:none)]:hidden"
          >
            ⠿
          </span>
          <div className="flex flex-1 items-start justify-between gap-2">
            <div>
              <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
                {card.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
                {card.details}
              </p>
            </div>
            <div
              aria-hidden={showActions ? undefined : true}
              className={clsx(
                "flex flex-col gap-1 shrink-0 transition-opacity duration-150",
                showActions ? "opacity-100" : "opacity-0"
              )}
            >
              {pendingDelete ? (
                <>
                  <button
                    type="button"
                    tabIndex={showActions ? 0 : -1}
                    onClick={() => onDelete(card.id)}
                    className="rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                    aria-label={`Confirm delete ${card.title}`}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    tabIndex={showActions ? 0 : -1}
                    onClick={() => setPendingDelete(false)}
                    className="rounded-full border border-[var(--stroke)] px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
                    aria-label="Cancel delete"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    tabIndex={showActions ? 0 : -1}
                    onClick={() => setEditing(true)}
                    className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                    aria-label={`Edit ${card.title}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    tabIndex={showActions ? 0 : -1}
                    onClick={() => setPendingDelete(true)}
                    className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                    aria-label={`Delete ${card.title}`}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
