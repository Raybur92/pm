import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { api } from "@/lib/api";
import type { ApiBoard } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getBoard: vi.fn(),
    renameColumn: vi.fn().mockResolvedValue({}),
    createCard: vi.fn(),
    deleteCard: vi.fn().mockResolvedValue(undefined),
    moveCard: vi.fn().mockResolvedValue({}),
    updateCard: vi.fn().mockResolvedValue({}),
    chat: vi.fn().mockResolvedValue({ response: "", applied_updates: [] }),
  },
}));

const mockBoard: ApiBoard = {
  id: 1,
  title: "My Board",
  columns: [
    { id: 1, title: "Backlog", position: 0, cards: [] },
    { id: 2, title: "Discovery", position: 1, cards: [] },
    { id: 3, title: "In Progress", position: 2, cards: [] },
    { id: 4, title: "Review", position: 3, cards: [] },
    { id: 5, title: "Done", position: 4, cards: [] },
  ],
};

beforeEach(() => {
  vi.mocked(api.getBoard).mockResolvedValue(mockBoard);
  vi.mocked(api.renameColumn).mockResolvedValue({
    id: 1, title: "", position: 0, cards: [],
  });
  vi.mocked(api.deleteCard).mockResolvedValue(undefined);
  vi.mocked(api.moveCard).mockResolvedValue({
    id: 1, column_id: 1, title: "", details: "", position: 0,
  });
});

async function renderAndLoad() {
  render(<KanbanBoard />);
  await screen.findAllByTestId(/^column-/);
}

const getFirstColumn = () => screen.getAllByTestId(/^column-/)[0];

describe("KanbanBoard", () => {
  it("renders five columns", async () => {
    await renderAndLoad();
    expect(screen.getAllByTestId(/^column-/)).toHaveLength(5);
  });

  it("renames a column and calls API on blur", async () => {
    await renderAndLoad();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
    await userEvent.tab();
    await waitFor(() =>
      expect(vi.mocked(api.renameColumn)).toHaveBeenCalledWith(1, "New Name")
    );
  });

  it("adds a card via API and shows it", async () => {
    vi.mocked(api.createCard).mockResolvedValue({
      id: 99, column_id: 1, title: "New card", details: "Notes", position: 0,
    });

    await renderAndLoad();
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(await within(column).findByText("New card")).toBeInTheDocument();
    expect(vi.mocked(api.createCard)).toHaveBeenCalledWith(1, "New card", "Notes");
  });

  it("removes a card optimistically and calls API", async () => {
    vi.mocked(api.getBoard).mockResolvedValue({
      ...mockBoard,
      columns: [
        {
          id: 1, title: "Backlog", position: 0,
          cards: [{ id: 7, column_id: 1, title: "Existing card", details: "", position: 0 }],
        },
        ...mockBoard.columns.slice(1),
      ],
    });

    await renderAndLoad();
    const column = getFirstColumn();
    expect(within(column).getByText("Existing card")).toBeInTheDocument();

    await userEvent.click(
      within(column).getByRole("button", { name: /delete existing card/i })
    );

    expect(within(column).queryByText("Existing card")).not.toBeInTheDocument();
    expect(vi.mocked(api.deleteCard)).toHaveBeenCalledWith(7);
  });
});
