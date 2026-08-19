/**
 * Reflow noisy OCR output into readable paragraphs.
 * Tesseract often emits a newline (or blank line) per printed line; without
 * this, the chunker treats each line as its own paragraph and splits a single
 * page into many short sections.
 *
 * Also strips common phone-photo OCR junk: footer page numbers and short
 * digit clusters that Vision sometimes injects mid-sentence.
 */

const SENTENCE_END = /[.!?]["')\]]?$/;
const SHORT_LINE_MAX = 90;
/** Lone page numbers / OCR digit lines. */
const PAGE_NUMBER_LINE = /^\d{1,4}$/;

function looksLikeWrappedLine(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  // Hyphenated wrap: "morn-" + "ing" → "morning"
  if (/-$/.test(prev)) return true;
  // Mid-sentence wrap: previous doesn't end a sentence and next is lowercase/continuation.
  if (!SENTENCE_END.test(prev) && /^[a-z0-9("']/.test(next)) return true;
  // Typical book line: short previous line without sentence end.
  if (!SENTENCE_END.test(prev) && prev.length <= SHORT_LINE_MAX) return true;
  return false;
}

/** Join a run of OCR lines into one paragraph, fixing end-of-line hyphens. */
function joinLines(lines: string[]): string {
  if (lines.length === 0) return "";
  let out = lines[0]!;
  for (let i = 1; i < lines.length; i++) {
    const next = lines[i]!;
    if (/-$/.test(out)) {
      out = `${out.slice(0, -1)}${next}`;
    } else {
      out = `${out} ${next}`;
    }
  }
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Remove page-number bleed and digit-soup tokens that aren't real prose.
 * Keeps ages/years like "I was 12 years" (number between longer words).
 */
export function stripOcrDigitJunk(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      // Preserve blank lines so paragraph breaks survive.
      if (!line.trim()) return "";

      let s = line.trim();
      if (PAGE_NUMBER_LINE.test(s)) return "";

      // "Yeah. 95 999 Eddie" — two+ short numbers between letters/punct
      s = s.replace(
        /([A-Za-z.?'"”’])\s+\d{1,3}(?:\s+\d{1,3}){1,3}\s+(?=[A-Za-z"“‘])/g,
        "$1 ",
      );

      // "I 92 my" — page bleed wedged between tiny words (not "was 12 years")
      s = s.replace(/\b([A-Za-z]{1,2})\s+\d{1,3}\s+([a-z]{1,2})\b/g, "$1 $2");

      // Trailing footer number left on a paragraph line
      s = s.replace(/\s+\d{1,3}\s*$/g, "");

      return s.replace(/[ \t]{2,}/g, " ").trim();
    })
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Collapse OCR line wraps into paragraphs separated by blank lines only when
 * the break looks intentional (sentence end + new capital / empty gap between blocks).
 */
export function normalizeOcrText(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\f\v]/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""));

  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const joined = joinLines(current);
    if (joined) paragraphs.push(joined);
    current = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      // Blank line: only start a new paragraph if we already have content
      // AND the last line looks finished (sentence end). Otherwise keep wrapping
      // — OCR loves blank lines between every printed line.
      if (current.length === 0) continue;
      const last = current[current.length - 1]!;
      if (SENTENCE_END.test(last) && last.length > 20) {
        flush();
      }
      continue;
    }

    const trimmed = line.trim();
    // Drop common single-character OCR junk lines and lone page numbers.
    if (/^[^\w]{1,3}$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
      continue;
    }
    if (PAGE_NUMBER_LINE.test(trimmed)) {
      continue;
    }

    if (current.length === 0) {
      current.push(trimmed);
      continue;
    }

    const prev = current[current.length - 1]!;
    if (looksLikeWrappedLine(prev, trimmed)) {
      current.push(trimmed);
    } else if (SENTENCE_END.test(prev) && /^[A-Z"'(]/.test(trimmed)) {
      flush();
      current.push(trimmed);
    } else {
      current.push(trimmed);
    }
  }

  flush();

  const reflowed = paragraphs
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return stripOcrDigitJunk(reflowed)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
