#!/usr/bin/env node

/**
 * Audits how many reader-vocabulary words the free dictionary API covers.
 * Run without flags for the dictionary-only baseline; pass --with-fallback to
 * also try Claude on misses (requires ANTHROPIC_API_KEY in .env.local).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const withFallback = process.argv.includes("--with-fallback");
const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

/** Words readers are likely to click from the baseline passage and quiz stems. */
const SAMPLE_WORDS = [
  "octopus",
  "octopuses",
  "neurons",
  "skeleton",
  "flexibility",
  "intelligence",
  "researchers",
  "aquarium",
  "solitary",
  "offspring",
  "humbling",
  "den",
  "Inky",
  "cephalopod",
  "suction",
  "cunning",
  "hatching",
  "chimpanzees",
  "reinvent",
  "zzzznotaword",
];

async function lookupDictionary(word) {
  const response = await fetch(`${DICTIONARY_API_BASE}/${encodeURIComponent(word.toLowerCase())}`, {
    headers: { Accept: "application/json" },
  });
  return response.ok;
}

async function lookupClaude(word) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local for --with-fallback.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      system:
        'Return JSON only: {"word","partOfSpeech","phonetic","definition","etymology","synonyms":[]}. Use null for unknown words.',
      messages: [{ role: "user", content: word }],
    }),
  });

  if (!response.ok) return false;

  const payload = await response.json();
  const text = payload.content?.[0]?.text;
  if (!text) return false;

  try {
    const parsed = JSON.parse(text);
    return typeof parsed?.definition === "string" && parsed.definition.trim().length > 0;
  } catch {
    return false;
  }
}

async function lookupWord(word) {
  if (await lookupDictionary(word)) return true;
  if (!withFallback) return false;
  return lookupClaude(word);
}

async function main() {
  const hits = [];
  const misses = [];

  for (const word of SAMPLE_WORDS) {
    const found = await lookupWord(word);
    if (found) hits.push(word);
    else misses.push(word);
  }

  const mode = withFallback ? "dictionary + Claude fallback" : "dictionary API only";
  const coverage = Math.round((hits.length / SAMPLE_WORDS.length) * 100);

  console.log(`Vocabulary coverage audit (${mode})`);
  console.log(`Sample size: ${SAMPLE_WORDS.length}`);
  console.log(`Found: ${hits.length} (${coverage}%)`);
  console.log(`Missing: ${misses.length}`);
  if (misses.length > 0) {
    console.log(`Missed words: ${misses.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
