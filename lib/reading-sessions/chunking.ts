import { countWords } from "../text/word-count";

/**
 * Default chunk size for the chunk reader (F-002): 3 paragraphs per chunk,
 * the middle of the "3-4 paragraphs" target. Chunks are derived from
 * sourceText on every read rather than persisted, so this can change at
 * any time without a migration.
 */
const DEFAULT_PARAGRAPHS_PER_CHUNK = 3;

/**
 * Short documents (one photo page, a brief paste) stay as a single section
 * so readers aren't forced through multiple micro-summaries.
 */
export const SHORT_DOCUMENT_WORD_LIMIT = 500;

/** Splits source text into paragraphs (blank-line separated), dropping any empty entries. */
export function splitIntoParagraphs(sourceText: string): string[] {
  return sourceText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** Groups paragraphs into reader chunks, each containing up to `paragraphsPerChunk` paragraphs. */
export function chunkText(sourceText: string, paragraphsPerChunk: number = DEFAULT_PARAGRAPHS_PER_CHUNK): string[] {
  const trimmed = sourceText.trim();
  if (!trimmed) return [""];

  // One photo page / short paste → one reading section.
  if (countWords(trimmed) <= SHORT_DOCUMENT_WORD_LIMIT) {
    return [trimmed];
  }

  const paragraphs = splitIntoParagraphs(trimmed);
  const chunks: string[] = [];

  for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
    chunks.push(paragraphs.slice(i, i + paragraphsPerChunk).join("\n\n"));
  }

  return chunks.length > 0 ? chunks : [""];
}
