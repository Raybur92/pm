"use client";

import type { ReactNode } from "react";

type InlinePart = { type: "text" | "bold" | "code"; text: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", text: text.slice(last, match.index) });
    }
    const m = match[0];
    if (m.startsWith("**")) {
      parts.push({ type: "bold", text: m.slice(2, -2) });
    } else {
      parts.push({ type: "code", text: m.slice(1, -1) });
    }
    last = match.index + m.length;
  }
  if (last < text.length) {
    parts.push({ type: "text", text: text.slice(last) });
  }
  return parts;
}

function InlineContent({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "bold") {
          return (
            <strong key={i} className="font-semibold">
              {part.text}
            </strong>
          );
        }
        if (part.type === "code") {
          return (
            <code
              key={i}
              className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs"
            >
              {part.text}
            </code>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
}

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="mb-2 list-disc pl-4">
          {items.map((item, j) => (
            <li key={j}>
              <InlineContent text={item} />
            </li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      elements.push(
        <p key={`p-${i}`} className="mb-1.5 leading-6 last:mb-0">
          <InlineContent text={line} />
        </p>
      );
      i++;
    }
  }

  return <>{elements}</>;
}

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--secondary-purple)] px-4 py-2.5 text-sm text-white">
          <span className="sr-only">You: </span>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] shadow-[0_4px_12px_rgba(3,33,71,0.06)]">
        <span className="sr-only">Assistant: </span>
        <SimpleMarkdown content={content} />
      </div>
    </div>
  );
};
