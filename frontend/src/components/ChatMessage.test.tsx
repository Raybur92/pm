import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage role="user" content="Hello there!" />);
    expect(screen.getByText("Hello there!")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    render(<ChatMessage role="assistant" content="Hi! I can help." />);
    expect(screen.getByText("Hi! I can help.")).toBeInTheDocument();
  });

  it("renders bold markdown in assistant message", () => {
    render(<ChatMessage role="assistant" content="This is **important** text" />);
    const bold = screen.getByText("important");
    expect(bold.tagName).toBe("STRONG");
  });

  it("renders inline code in assistant message", () => {
    render(<ChatMessage role="assistant" content="Run `npm install` first" />);
    const code = screen.getByText("npm install");
    expect(code.tagName).toBe("CODE");
  });

  it("renders bullet list in assistant message", () => {
    render(<ChatMessage role="assistant" content={"- Item one\n- Item two"} />);
    expect(screen.getByText("Item one")).toBeInTheDocument();
    expect(screen.getByText("Item two")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("user message does not parse markdown", () => {
    render(<ChatMessage role="user" content="**not bold**" />);
    expect(screen.getByText("**not bold**")).toBeInTheDocument();
    expect(screen.queryByRole("strong")).not.toBeInTheDocument();
  });
});
