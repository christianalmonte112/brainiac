"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { submitFeedback } from "@/lib/feedback/actions";
import { MAX_FEEDBACK_LENGTH } from "@/lib/feedback/validate";

/**
 * A small always-available feedback entry point for the beta (Phase 5).
 *
 * Deliberately a corner panel rather than a full-screen modal (unlike
 * SummaryModal/QuizModal) — feedback capture shouldn't block the reading
 * flow, and this is meant to feel lightweight and low-friction so it
 * actually gets used. Mounted once in app/reader/layout.tsx.
 */
export function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setIsOpen(false);
    // Reset after the close animation would run, so re-opening starts fresh
    // rather than showing a stale success/error state.
    setTimeout(() => {
      setMessage("");
      setError(null);
      setSubmitted(false);
    }, 200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitFeedback(message, pathname);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-neutral-900"
      >
        <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Feedback
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-neutral-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <p className="text-sm font-semibold text-black">Send feedback</p>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close feedback"
          className="text-neutral-400 transition-colors hover:text-neutral-600"
        >
          ✕
        </button>
      </header>

      <div className="px-4 py-4">
        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm font-medium text-black">Thanks — got it!</p>
            <p className="text-xs text-neutral-500">We read every note.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's working, what's not, what you wish existed…"
              maxLength={MAX_FEEDBACK_LENGTH}
              rows={4}
              autoFocus
              disabled={isPending}
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending || message.trim().length === 0}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
