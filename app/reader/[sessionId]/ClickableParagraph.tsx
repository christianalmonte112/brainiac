"use client";

import { useEffect, useState } from "react";

// Includes à-ÿ/À-Ÿ (accented Latin letters: é, ï, ñ, etc.) and the curly
// apostrophe ’ (U+2019) alongside the straight one — curly quotes are the
// default output of Word, Google Docs, Notes, and most published websites,
// so without this, pasting from any of those breaks contractions like
// "don't" into a clickable "don" + a dead, unclickable "'" + a clickable
// "t", and splits loanwords like "naïve" or "café" into unclickable pieces.
const WORD_PATTERN = /([A-Za-zà-ÿÀ-Ÿ][A-Za-zà-ÿÀ-Ÿ'\u2019-]*)/;

interface TooltipState {
  /** Horizontal center of the selection in viewport px. */
  x: number;
  /** Top edge of the selection in viewport px. */
  y: number;
  /** The highlighted text string. */
  text: string;
}

interface ClickableParagraphProps {
  text: string;
  onWordClick: (word: string) => void;
  /** Called when the user selects 3+ words and clicks "Ask Tutor". */
  onHighlight?: (selectedText: string, paragraphText: string) => void;
}

/**
 * Renders a paragraph with every word clickable for the vocabulary mapper (F-004).
 * Also detects multi-word text selections (3+ words) and surfaces an "Ask Tutor"
 * tooltip above the selection for the Highlight Tutor (Phase 3).
 *
 * Single-word clicks go to vocabulary; multi-word selections go to the tutor.
 * When an active multi-word selection exists, individual word `onClick` is
 * suppressed so the two paths don't collide.
 */
export function ClickableParagraph({ text, onWordClick, onHighlight }: ClickableParagraphProps) {
  const tokens = text.split(WORD_PATTERN);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Dismiss the tooltip when the user clicks anywhere outside the tooltip button.
  useEffect(() => {
    if (!tooltip) return;

    function handleDocMouseDown(e: MouseEvent) {
      if ((e.target as Element).closest("[data-tutor-tooltip]")) return;
      setTooltip(null);
    }

    document.addEventListener("mousedown", handleDocMouseDown);
    return () => document.removeEventListener("mousedown", handleDocMouseDown);
  }, [tooltip]);

  function handleMouseUp() {
    if (!onHighlight) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setTooltip(null);
      return;
    }

    const selectedText = selection.toString().trim();
    const wordCount = selectedText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 3) {
      setTooltip(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selectedText,
    });
  }

  function handleWordButtonClick(word: string) {
    // If a multi-word selection is active, suppress vocabulary lookup — the
    // user is in the middle of making a highlight selection, not clicking a word.
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 3) return;

    setTooltip(null);
    onWordClick(word);
  }

  return (
    <>
      <p onMouseUp={handleMouseUp}>
        {tokens.map((token, index) =>
          index % 2 === 1 ? (
            <button
              key={index}
              onClick={() => handleWordButtonClick(token)}
              className="rounded-sm transition-colors hover:bg-amber-100"
            >
              {token}
            </button>
          ) : (
            <span key={index}>{token}</span>
          ),
        )}
      </p>

      {tooltip && (
        <div
          data-tutor-tooltip=""
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 40,
            transform: "translateX(-50%)",
            zIndex: 200,
          }}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              onHighlight?.(tooltip.text, text);
              setTooltip(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700 active:scale-95"
          >
            <span>✦</span>
            <span>Ask Tutor</span>
          </button>
        </div>
      )}
    </>
  );
}
