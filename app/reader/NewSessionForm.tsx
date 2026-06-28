"use client";

import { useActionState, useMemo, useState } from "react";
import { countWords } from "@/lib/text/word-count";
import { createReadingSession, type CreateSessionActionState } from "./actions";

const initialState: CreateSessionActionState = {};

/** Collapsible "new document" form with a live word count. */
export function NewSessionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [state, formAction, isPending] = useActionState(createReadingSession, initialState);
  const wordCount = useMemo(() => countWords(sourceText), [sourceText]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
      >
        + New document
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <input
        name="title"
        placeholder="Title"
        required
        maxLength={200}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
      />
      <textarea
        name="sourceText"
        placeholder="Paste the text you want to read..."
        required
        rows={6}
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        className="resize-none rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{wordCount} words</span>
        {state.error && <span className="text-red-600">{state.error}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
