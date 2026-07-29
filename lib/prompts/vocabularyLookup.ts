import { getAnthropic } from "@/lib/ai/client";
import type { WordLookupResult } from "@/lib/vocabulary/dictionary";

export const VOCABULARY_LOOKUP_MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a concise English dictionary for adult readers building vocabulary while reading.

Given a single English word, return a helpful dictionary-style entry. Use plain language. If the word is not a real English word, respond with null.

Respond ONLY as a JSON object with this exact shape:
{"word":"<word>","partOfSpeech":"<noun|verb|adjective|etc or null>","phonetic":"<IPA or simple pronunciation or null>","definition":"<one clear sentence>","etymology":"<brief origin or null>","synonyms":["<up to 8 short synonyms>"]}

No markdown, no extra keys, no explanation outside the JSON.`;

function normalizeLookup(parsed: unknown, requestedWord: string): WordLookupResult | null {
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const definition = typeof record.definition === "string" ? record.definition.trim() : "";
  if (!definition) return null;

  const synonyms = Array.isArray(record.synonyms)
    ? record.synonyms.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 8)
    : [];

  return {
    word: typeof record.word === "string" && record.word.trim().length > 0 ? record.word.trim() : requestedWord,
    partOfSpeech: typeof record.partOfSpeech === "string" ? record.partOfSpeech.trim() || null : null,
    phonetic: typeof record.phonetic === "string" ? record.phonetic.trim() || null : null,
    definition,
    etymology: typeof record.etymology === "string" ? record.etymology.trim() || null : null,
    synonyms,
  };
}

/** Claude fallback when dictionaryapi.dev has no entry for a clicked word. */
export async function lookupWordWithClaude(word: string): Promise<WordLookupResult | null> {
  const message = await getAnthropic().messages.create({
    model: VOCABULARY_LOOKUP_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: word }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") return null;

  try {
    const parsed = JSON.parse(raw.text) as unknown;
    if (parsed === null) return null;
    return normalizeLookup(parsed, word);
  } catch {
    return null;
  }
}
