import { lookupWordWithClaude } from "@/lib/prompts/vocabularyLookup";
import { lookupWord, type WordLookupResult } from "./dictionary";

/** Tries the free dictionary API first, then Claude for words with no public entry. */
export async function lookupWordWithFallback(word: string): Promise<WordLookupResult | null> {
  const dictionaryResult = await lookupWord(word);
  if (dictionaryResult) return dictionaryResult;
  return lookupWordWithClaude(word);
}
