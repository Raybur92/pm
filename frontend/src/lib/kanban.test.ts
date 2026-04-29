import { moveCard, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: 1, title: "A", position: 0, cardIds: [1, 2] },
    { id: 2, title: "B", position: 1, cardIds: [3] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, 2, 1);
    expect(result[0].cardIds).toEqual([2, 1]);
  });

  it("moves cards to another column over a card", () => {
    const result = moveCard(baseColumns, 2, 3);
    expect(result[0].cardIds).toEqual([1]);
    expect(result[1].cardIds).toEqual([2, 3]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, 1, "col-2");
    expect(result[0].cardIds).toEqual([2]);
    expect(result[1].cardIds).toEqual([3, 1]);
  });
});
