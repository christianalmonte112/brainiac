"use client";

const WORD_PATTERN = /([A-Za-z][A-Za-z'-]*)/;

interface ClickableParagraphProps {
  text: string;
  onWordClick: (word: string) => void;
}

/**
 * Renders a paragraph with every word clickable for the vocabulary mapper
 * (F-004), leaving whitespace and punctuation as plain text. Splitting on a
 * capturing group keeps every token (word and non-word) in the result, so
 * odd indices are always words and even indices are always separators.
 */
export function ClickableParagraph({ text, onWordClick }: ClickableParagraphProps) {
  const tokens = text.split(WORD_PATTERN);

  return (
    <p>
      {tokens.map((token, index) =>
        index % 2 === 1 ? (
          <button
            key={index}
            onClick={() => onWordClick(token)}
            className="rounded-sm transition-colors hover:bg-amber-100"
          >
            {token}
          </button>
        ) : (
          <span key={index}>{token}</span>
        ),
      )}
    </p>
  );
}
