import { getAnthropic } from "../ai/client";
import type { WordLookupResult } from "../vocabulary/dictionary";

export const VOCABULARY_FALLBACK_MODEL = "claude-sonnet-4-5";

/**
 * Fallback for the vocabulary mapper (F-004) when the free dictionary API
 * (dictionaryapi.dev) has no entry for a word. That's a crowd-sourced,
 * English-only source with real coverage gaps — proper nouns (country
 * names, people), technical/scientific jargon, and slang are the most
 * common misses, confirmed directly: "stigmergy", "yemen", and "pakistan"
 * all returned nothing from it during testing, even though every one of
 * them has a perfectly real, definable meaning. Rather than show
 * "no entry found" for a word that usually IS real, ask Claude directly —
 * this only runs on the free API's misses, not every lookup, so it stays
 * cheap in aggregate.
 */
const SYSTEM_PROMPT = `You are a dictionary. Given a single word or short proper noun, respond with a concise, accurate entry — including for names of countries, people, places, and technical/scientific terms the word might be, not just common dictionary words.

Respond ONLY as a JSON object with this exact shape:
{"found": true, "partOfSpeech": "<noun/verb/proper noun/etc, or null>", "definition": "<one clear, factual sentence>", "synonyms": [<up to 5 real synonyms, or empty array if none genuinely apply — e.g. proper nouns usually have none>]}

If the input is genuinely not a real word, name, or term in any domain (pure gibberish, a typo with no sensible reading), respond with exactly:
{"found": false}

No markdown, no commentary, no text outside the JSON object.`;

/**
 * Looks up `word` via Claude. Returns null both when Claude reports the
 * word doesn't exist and when its response can't be parsed — the caller
 * treats both the same way (report not-found), so they aren't
 * distinguished further here.
 */
export async function lookupWordWithClaudeFallback(word: string): Promise<WordLookupResult | null> {
  const message = await getAnthropic().messages.create({
    model: VOCABULARY_FALLBACK_MODEL,
    max_tokens: 250,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: word }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") return null;

  try {
    const cleaned = raw.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      found?: boolean;
      partOfSpeech?: string | null;
      definition?: string;
      synonyms?: string[];
    };

    if (!parsed.found || !parsed.definition) return null;

    return {
      word,
      partOfSpeech: parsed.partOfSpeech ?? null,
      phonetic: null, // Claude doesn't reliably produce real IPA notation — leaving this null is more honest than a guessed one.
      definition: parsed.definition,
      etymology: null, // Same reasoning as the free API: best-effort only, and not worth an extra round-trip to guess at here.
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 8) : [],
    };
  } catch {
    return null;
  }
}
