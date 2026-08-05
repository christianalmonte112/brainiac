"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { countWords } from "@/lib/text/word-count";
import { OPEN_NEW_DOCUMENT_EVENT, type OpenNewDocumentDetail } from "@/lib/reader/newDocumentEvents";
import { createReadingSession, type CreateSessionActionState } from "./actions";
import { ImagePageUpload } from "./ImagePageUpload";

const initialState: CreateSessionActionState = {};

/** Collapsible "new document" form — black CTA (ChatGPT mock). */
export function NewSessionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"paste" | "photos">("paste");
  const [sourceText, setSourceText] = useState("");
  const [state, formAction, isPending] = useActionState(createReadingSession, initialState);
  const wordCount = useMemo(() => countWords(sourceText), [sourceText]);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<OpenNewDocumentDetail>).detail;
      if (detail?.mode) setInputMode(detail.mode);
      setIsOpen(true);
    }
    window.addEventListener(OPEN_NEW_DOCUMENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NEW_DOCUMENT_EVENT, onOpen);
  }, []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition-all duration-180 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New Document
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
    >
      <input
        name="title"
        placeholder="Title"
        required
        maxLength={200}
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-black focus:border-neutral-400 focus:outline-none"
      />

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setInputMode("paste")}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            inputMode === "paste" ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setInputMode("photos")}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            inputMode === "photos" ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Upload photos
        </button>
      </div>

      {inputMode === "photos" && (
        <ImagePageUpload onExtracted={(text) => setSourceText((prev) => (prev.trim() ? `${prev}\n\n${text}` : text))} disabled={isPending} />
      )}

      <textarea
        name="sourceText"
        placeholder={
          inputMode === "paste"
            ? "Paste the text you want to read..."
            : "Extracted text will appear here — review and edit before saving."
        }
        required
        rows={6}
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        className="resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-black focus:border-neutral-400 focus:outline-none"
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{wordCount} words</span>
        {state.error && <span className="text-red-600">{state.error}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
