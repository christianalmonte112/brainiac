"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface HighlightTutorProps {
  selectedText: string | null;
  surroundingParagraph: string | null;
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

type StreamStatus = "idle" | "streaming" | "done" | "error";

/**
 * Slide-in panel for the Highlight Tutor (Phase 3, F-004 extension).
 *
 * When the user highlights 3+ words and clicks "Ask Tutor", this panel
 * slides in from the right and streams Claude's explanation in real time.
 *
 * Lives at z-50 so it sits above the VocabularyPanel (z-40) — both panels
 * have independent open/close state and can coexist without interference.
 * The panel is always mounted so the slide animation plays on open/close;
 * content is keyed by selectedText so state resets on each new highlight.
 */
export function HighlightTutor({
  selectedText,
  surroundingParagraph,
  sessionId,
  isOpen,
  onClose,
}: HighlightTutorProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-indigo-100 bg-white shadow-2xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600">✦</span>
            <span className="text-sm font-semibold text-slate-900">Highlight Tutor</span>
          </div>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700">
            Close
          </button>
        </div>

        {selectedText && (
          <HighlightTutorContent
            key={selectedText}
            selectedText={selectedText}
            surroundingParagraph={surroundingParagraph}
            sessionId={sessionId}
          />
        )}
      </div>
    </aside>
  );
}

function HighlightTutorContent({
  selectedText,
  surroundingParagraph,
  sessionId,
}: {
  selectedText: string;
  surroundingParagraph: string | null;
  sessionId: string;
}) {
  const [streamedText, setStreamedText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setStreamedText("");

    (async () => {
      try {
        const response = await fetch("/api/tutor/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedText, surroundingParagraph, sessionId }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setStreamedText((prev) => prev + decoder.decode(value, { stream: true }));
        }

        setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedText, surroundingParagraph, sessionId]);

  return (
    <div className="flex flex-col gap-4">
      {/* The highlighted passage */}
      <div className="rounded-lg bg-indigo-50 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">You highlighted</p>
        <p className="mt-1 text-sm italic text-slate-700">&ldquo;{selectedText}&rdquo;</p>
      </div>

      {/* Streamed tutor response */}
      <div className="min-h-[6rem]">
        {status === "streaming" && streamedText.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            <span className="ml-1">Thinking…</span>
          </div>
        )}

        {streamedText.length > 0 && (
          <div className="text-sm text-slate-800">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-700">{children}</em>
                ),
                h1: ({ children }) => (
                  <h1 className="mb-1 text-base font-semibold text-slate-900">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-1 text-sm font-semibold text-slate-900">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-1 text-sm font-semibold text-slate-800">{children}</h3>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ children }) => (
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">
                    {children}
                  </code>
                ),
              }}
            >
              {streamedText}
            </ReactMarkdown>
            {status === "streaming" && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-500" />
            )}
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-500">
            The tutor is unavailable right now. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
