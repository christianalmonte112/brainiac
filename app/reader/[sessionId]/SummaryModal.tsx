"use client";

import ReactMarkdown from "react-markdown";

interface SummaryModalProps {
  documentTitle: string;
  content: string;
  onClose: () => void;
}

/**
 * Full-session summary modal (F-004).
 *
 * Renders Claude's markdown summary in a simple readable container.
 * Layered at z-[80], below QuizModal (z-[90]) and SocraticTutor (z-[100]).
 */
export function SummaryModal({ documentTitle, content, onClose }: SummaryModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 px-4 py-8">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="shrink-0 border-b border-slate-200 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Full Session Summary</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{documentTitle}</h2>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="text-sm text-slate-800">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold text-slate-900">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 text-base font-semibold text-slate-900">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold text-slate-900">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
