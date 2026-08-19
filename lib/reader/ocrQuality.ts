/**
 * Heuristic: Google Vision sometimes returns punctuation soup when the image
 * is over-processed or mostly non-text. Real book pages are letter-heavy.
 */
export function looksLikeGarbageOcr(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 40) return true;

  const letters = (compact.match(/[A-Za-z]/g) ?? []).length;
  const letterRatio = letters / compact.length;
  return letterRatio < 0.45;
}
