/** Short connector words excluded from keyword candidates — not exhaustive, just enough to surface meaningful words. */
const STOPWORDS = new Set([
  "the", "and", "that", "with", "from", "this", "have", "were", "their", "which", "about", "would",
  "there", "could", "other", "after", "first", "being", "these", "those", "while", "where", "under",
  "over", "such", "than", "then", "them", "some", "more", "most", "very", "just", "only", "also",
  "each", "every", "into", "onto", "upon", "among", "between", "before", "during", "without",
  "within", "because", "since", "until", "unless", "although", "what", "when", "will", "your",
  "they", "been", "much", "even", "still", "again", "once", "here",
]);

/**
 * Candidate keywords a reader can pick from for the micro-summary step
 * (F-003), pulled from the chunk's own words rather than generated. Dedupes
 * case-insensitively, keeps first-seen casing, strips punctuation, and
 * filters short/common words.
 */
export function extractCandidateKeywords(chunkText: string, max: number = 12): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const words = chunkText.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];

  for (const word of words) {
    const normalized = word.toLowerCase();
    if (normalized.length <= 3 || STOPWORDS.has(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    candidates.push(word);
    if (candidates.length >= max) break;
  }

  return candidates;
}
