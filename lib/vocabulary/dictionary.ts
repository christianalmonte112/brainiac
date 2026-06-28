/**
 * Free, keyless dictionary lookup for the vocabulary mapper (F-004).
 * Phase 2 is intentionally Claude-free (the Anthropic integration is Phase 3
 * work) so word definitions come from https://dictionaryapi.dev instead.
 * Etymology is best-effort: most entries from this API don't include one.
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

/** Looks up `word` (already lowercased/sanitized by the caller). Returns null if the dictionary has no entry. */
export async function lookupWord(word: string): Promise<WordLookupResult | null> {
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
