export type Card = {
  id: number;
  title: string;
  details: string;
};

export type Column = {
  id: number;
  title: string;
  position: number;
  cardIds: number[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<number, Card>;
};

// Columns use "col-{id}" as DnD droppable IDs to avoid collisions with numeric card IDs
export const toColumnDndId = (columnId: number) => `col-${columnId}`;

export const moveCard = (
  columns: Column[],
  activeCardId: number,
  overId: number | string,
): Column[] => {
  const isOverColumn = typeof overId === "string";

  const overColumnId = isOverColumn
    ? parseInt((overId as string).slice(4), 10)
    : columns.find((col) => col.cardIds.includes(overId as number))?.id;

  const activeColumnId = columns.find((col) =>
    col.cardIds.includes(activeCardId)
  )?.id;

  if (!activeColumnId || !overColumnId) return columns;

  const activeColumn = columns.find((col) => col.id === activeColumnId)!;
  const overColumn = columns.find((col) => col.id === overColumnId)!;

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter((id) => id !== activeCardId);
      nextCardIds.push(activeCardId);
      return columns.map((col) =>
        col.id === activeColumnId ? { ...col, cardIds: nextCardIds } : col
      );
    }
    const oldIndex = activeColumn.cardIds.indexOf(activeCardId);
    const newIndex = activeColumn.cardIds.indexOf(overId as number);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return columns;
    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeCardId);
    return columns.map((col) =>
      col.id === activeColumnId ? { ...col, cardIds: nextCardIds } : col
    );
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeCardId);
  if (activeIndex === -1) return columns;

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeCardId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId as number);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeCardId);
  }

  return columns.map((col) => {
    if (col.id === activeColumnId) return { ...col, cardIds: nextActiveCardIds };
    if (col.id === overColumnId) return { ...col, cardIds: nextOverCardIds };
    return col;
  });
};
