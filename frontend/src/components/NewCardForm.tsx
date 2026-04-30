import { useEffect, useRef, useState, type FormEvent } from "react";

const initialFormState = { title: "", details: "" };

type NewCardFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, details: string) => void;
};

export const NewCardForm = ({ isOpen, onOpenChange, onAdd }: NewCardFormProps) => {
  const [formState, setFormState] = useState(initialFormState);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) return;
    onAdd(formState.title.trim(), formState.details.trim());
    setFormState(initialFormState);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormState(initialFormState);
  };

  if (!isOpen) return null;

  return (
    <div ref={formRef} className="mt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          autoFocus
          value={formState.title}
          onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Escape") handleCancel(); }}
          placeholder="Card title"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          required
        />
        <textarea
          value={formState.details}
          onChange={(e) => setFormState((prev) => ({ ...prev, details: e.target.value }))}
          placeholder="Details"
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Add card
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
