"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatSidebarProps = {
  onBoardUpdated: () => void;
};

export const ChatSidebar = ({ onBoardUpdated }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.chat(text);
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      if (result.applied_updates.length > 0) {
        onBoardUpdated();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside
      aria-label="AI Assistant"
      className="flex w-[340px] flex-none flex-col self-start sticky top-6 rounded-[24px] border border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur max-h-[calc(100vh-6rem)]"
    >
      <header className="flex-none border-b border-[var(--stroke)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--primary-blue)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
            AI Assistant
          </p>
        </div>
        <h2 className="mt-1 font-display text-base font-semibold text-[var(--navy-dark)]">
          Chat with your board
        </h2>
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-xs text-[var(--gray-text)]">
            Ask me to create, move, or edit cards on your board.
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <div className="flex justify-start" aria-label="AI is responding">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--stroke)] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(3,33,71,0.06)]">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-semibold underline"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none border-t border-[var(--stroke)] p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to manage your board..."
            rows={2}
            disabled={isLoading}
            aria-label="Message input"
            className="flex-1 resize-none rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)] focus:ring-2 focus:ring-[var(--primary-blue)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="self-end rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--gray-text)]">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </aside>
  );
};
