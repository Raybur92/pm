import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatSidebar } from "@/components/ChatSidebar";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    chat: vi.fn(),
  },
}));

describe("ChatSidebar", () => {
  const onBoardUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state prompt", () => {
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    expect(screen.getByText(/ask me to/i)).toBeInTheDocument();
  });

  it("renders heading and label", () => {
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    expect(screen.getByRole("heading", { name: /chat with your board/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /ai assistant/i })).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("send button is enabled when input has text", async () => {
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    expect(screen.getByRole("button", { name: /send message/i })).not.toBeDisabled();
  });

  it("shows user message immediately after submit", async () => {
    vi.mocked(api.chat).mockResolvedValue({ response: "Got it!", applied_updates: [] });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "Create a card");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText("Create a card")).toBeInTheDocument();
  });

  it("shows AI response after submit", async () => {
    vi.mocked(api.chat).mockResolvedValue({ response: "Sure!", applied_updates: [] });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText("Sure!")).toBeInTheDocument());
  });

  it("clears input after submit", async () => {
    vi.mocked(api.chat).mockResolvedValue({ response: "Done.", applied_updates: [] });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    const input = screen.getByLabelText(/message input/i);
    await userEvent.type(input, "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(input).toHaveValue("");
  });

  it("shows loading indicator while awaiting response", async () => {
    let resolve: (v: unknown) => void;
    vi.mocked(api.chat).mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByLabelText("AI is responding")).toBeInTheDocument();
    resolve!({ response: "Done", applied_updates: [] });
  });

  it("calls onBoardUpdated when applied_updates is non-empty", async () => {
    vi.mocked(api.chat).mockResolvedValue({
      response: "Created.",
      applied_updates: [{ type: "create_card", column_id: 1, title: "X" }],
    });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "create a card");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(onBoardUpdated).toHaveBeenCalledOnce());
  });

  it("does not call onBoardUpdated when applied_updates is empty", async () => {
    vi.mocked(api.chat).mockResolvedValue({ response: "Nothing to do.", applied_updates: [] });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => screen.getByText("Nothing to do."));
    expect(onBoardUpdated).not.toHaveBeenCalled();
  });

  it("shows error message when API call fails", async () => {
    vi.mocked(api.chat).mockRejectedValue(new Error("Network error"));
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it("dismisses error on Dismiss click", async () => {
    vi.mocked(api.chat).mockRejectedValue(new Error("Oops"));
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => screen.getByRole("alert"));
    await userEvent.click(screen.getByRole("button", { name: /dismiss error/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits on Enter key", async () => {
    vi.mocked(api.chat).mockResolvedValue({ response: "OK", applied_updates: [] });
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello{Enter}");
    await waitFor(() => expect(vi.mocked(api.chat)).toHaveBeenCalledOnce());
  });

  it("does not submit on Shift+Enter", async () => {
    render(<ChatSidebar onBoardUpdated={onBoardUpdated} />);
    await userEvent.type(screen.getByLabelText(/message input/i), "hello{Shift>}{Enter}{/Shift}");
    expect(vi.mocked(api.chat)).not.toHaveBeenCalled();
  });
});
