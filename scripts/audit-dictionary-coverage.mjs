#!/usr/bin/env node
/**
 * Audits the free dictionary API's real coverage without manual clicking.
 *
 * Run: node scripts/audit-dictionary-coverage.mjs
 *
 * Hits https://api.dictionaryapi.dev directly against a representative
 * wordlist — common everyday words, harder/less common ones, technical
 * jargon, and proper nouns — and reports exactly which fail and in which
 * category. This is what actually answers "how big is the problem,"
 * rather than impressions from a handful of manual clicks.
 *
 * Deliberately NOT a Vitest test: it makes ~90 real network calls to a
 * third-party API, which is slow and would be flaky/rate-limit-prone if it
 * ran on every CI push. Run it by hand whenever you want a fresh coverage
 * snapshot — e.g. right after applying the Claude-fallback fix, to see the
 * miss rate drop to (close to) zero.
 */

const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

/** Ordinary words a reading app will hit constantly — these should never miss. */
const COMMON_WORDS = [
  "house", "water", "happy", "run", "beautiful", "quickly", "because", "although",
  "consider", "important", "decide", "believe", "however", "therefore", "although",
  "environment", "community", "government", "experience", "opportunity",
];

/** Less common but still ordinary vocabulary a curious reader might click. */
const UNCOMMON_WORDS = [
  "ephemeral", "ubiquitous", "cacophony", "serendipity", "melancholy",
  "quintessential", "juxtapose", "ambivalent", "conundrum", "vestigial",
  "obfuscate", "perfunctory", "ineffable", "sardonic", "capricious",
];

/** Technical/scientific terms — exactly the category "stigmergy" fell into. */
const TECHNICAL_WORDS = [
  "stigmergy", "pheromone", "homeostasis", "entropy", "algorithm",
  "quantum", "mitochondria", "photosynthesis", "epistemology", "heuristic",
];

/** Proper nouns — exactly the category "yemen"/"pakistan" fell into. Expected to fail; included so the report clearly separates "acceptable miss" from "real problem." */
const PROPER_NOUNS = [
  "pakistan", "yemen", "einstein", "shakespeare", "tokyo",
  "everest", "amazon", "sahara", "napoleon", "gandhi",
];

const CATEGORIES = [
  { name: "Common words (should never miss)", words: COMMON_WORDS },
  { name: "Uncommon vocabulary", words: UNCOMMON_WORDS },
  { name: "Technical/scientific terms", words: TECHNICAL_WORDS },
  { name: "Proper nouns (expected to miss — free dictionaries don't cover names)", words: PROPER_NOUNS },
];

async function checkWord(word) {
  try {
    const res = await fetch(`${DICTIONARY_API_BASE}/${encodeURIComponent(word)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { word, found: false };
    if (!res.ok) return { word, found: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { word, found: Array.isArray(data) && data.length > 0 && data[0]?.meanings?.length > 0 };
  } catch (err) {
    return { word, found: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log("Auditing dictionaryapi.dev coverage — this makes real network calls, give it a moment...\n");

  let totalWords = 0;
  let totalMisses = 0;

  for (const category of CATEGORIES) {
    const results = await Promise.all(category.words.map(checkWord));
    const misses = results.filter((r) => !r.found);
    totalWords += results.length;
    totalMisses += misses.length;

    console.log(`${category.name}: ${results.length - misses.length}/${results.length} found`);
    if (misses.length > 0) {
      console.log(`  Missing: ${misses.map((m) => m.word).join(", ")}`);
    }
    console.log("");
  }

  console.log("─".repeat(60));
  console.log(`Overall: ${totalWords - totalMisses}/${totalWords} found (${totalMisses} misses)`);
  console.log("\nWhat to look for:");
  console.log("- Misses in 'Common words' = a real problem, worth investigating further.");
  console.log("- Misses in 'Uncommon vocabulary' or 'Technical terms' = the free API's");
  console.log("  known coverage gap — this is exactly what the Claude fallback fixes.");
  console.log("- Misses in 'Proper nouns' = expected and acceptable — no general-purpose");
  console.log("  dictionary indexes every place/person name; the Claude fallback also");
  console.log("  covers these now, but a miss here isn't itself evidence of a bug.");
}

main();
