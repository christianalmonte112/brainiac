import { lookupWordWithClaudeFallback } from "../prompts/vocabularyLookup";

/**
 * Dictionary lookup for the vocabulary mapper (F-004).
 *
 * Primary source: the free, keyless dictionaryapi.dev. Fast and good
 * coverage for common English words, with best-effort etymology (most
 * entries don't include one).
 *
 * Fallback: when the free API has no entry, lookupWord() asks Claude
 * instead of just reporting "not found" — see
 * lib/prompts/vocabularyLookup.ts for exactly why this matters (real
 * words the free source is missing, confirmed by live testing).
 */
const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

interface DictionaryApiDefinition {
  definition: string;
  synonyms?: string[];
}

interface DictionaryApiMeaning {
  partOfSpeech: string;
  definitions: DictionaryApiDefinition[];
  synonyms?: string[];
}

interface DictionaryApiPhonetic {
  text?: string;
}

interface DictionaryApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
  origin?: string;
  meanings: DictionaryApiMeaning[];
}

export interface WordLookupResult {
  word: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  definition: string;
  etymology: string | null;
  synonyms: string[];
}

const MAX_SYNONYMS = 8;

/** The free-API lookup alone, with no fallback — exported for the coverage-audit script (scripts/audit-dictionary-coverage.mjs) to measure raw miss rate. */
export async function lookupFreeApiWord(word: string): Promise<WordLookupResult | null> {
  const response = await fetch(`${DICTIONARY_API_BASE}/${encodeURIComponent(word)}`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Dictionary lookup failed with status ${response.status}.`);
  }

  const entries = (await response.json()) as DictionaryApiEntry[];
  const entry = entries[0];
  if (!entry || entry.meanings.length === 0) {
    return null;
  }

  const firstMeaning = entry.meanings[0];
  const firstDefinition = firstMeaning.definitions[0];
  if (!firstDefinition) {
    return null;
  }

  const phonetic = entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text ?? null;

  const synonyms = Array.from(
    new Set(
      entry.meanings.flatMap((meaning) => [
        ...(meaning.synonyms ?? []),
        ...meaning.definitions.flatMap((definition) => definition.synonyms ?? []),
      ]),
    ),
  ).slice(0, MAX_SYNONYMS);

  return {
    word: entry.word,
    partOfSpeech: firstMeaning.partOfSpeech ?? null,
    phonetic,
    definition: firstDefinition.definition,
    etymology: entry.origin ?? null,
    synonyms,
  };
}

/**
 * Pure orchestration: try `lookupPrimary` first, only call `lookupFallback`
 * on an actual miss (null), never on both succeeding or both failing
 * unnecessarily. Exported and parameterized specifically so this decision
 * is unit-testable with fake async functions — no real network calls or
 * mocking of fetch/Claude needed (see dictionary.test.ts).
 */
export async function resolveWordLookup(
  word: string,
  lookupPrimary: (word: string) => Promise<WordLookupResult | null>,
  lookupFallback: (word: string) => Promise<WordLookupResult | null>,
): Promise<WordLookupResult | null> {
  const primaryResult = await lookupPrimary(word);
  if (primaryResult) return primaryResult;
  return lookupFallback(word);
}

/** Looks up `word` (already lowercased/sanitized by the caller): free API first, Claude fallback on a miss. Returns null only if both report no entry. */
export async function lookupWord(word: string): Promise<WordLookupResult | null> {
  return resolveWordLookup(word, lookupFreeApiWord, lookupWordWithClaudeFallback);
}
