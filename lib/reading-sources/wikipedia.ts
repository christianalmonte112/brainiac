import { countWords } from "../text/word-count";

/** Openings stay long enough for a few chunks, short enough to finish. */
export const READING_SOURCE_WORD_BUDGET = 1_400;

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

export function trimToWordBudget(text: string, maxWords: number = READING_SOURCE_WORD_BUDGET): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) return "";

  const kept: string[] = [];
  let words = 0;

  for (const paragraph of paragraphs) {
    const count = countWords(paragraph);
    if (words > 0 && words + count > maxWords) break;
    if (words === 0 && count > maxWords) {
      return paragraph.split(/\s+/).slice(0, maxWords).join(" ");
    }
    kept.push(paragraph);
    words += count;
    if (words >= maxWords) break;
  }

  return kept.join("\n\n");
}

export function readingSourceBody(title: string, sourceUrl: string, extract: string): string {
  const opening = trimToWordBudget(extract);
  const credit = `Opening of “${title}” on Wikipedia, used under CC BY-SA. Full article: ${sourceUrl}`;
  return `${credit}\n\n${opening}`;
}

interface WikipediaPage {
  title?: string;
  extract?: string;
  missing?: string;
}

export function extractFromWikipediaResponse(payload: unknown): { title: string; extract: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const query = (payload as { query?: { pages?: Record<string, WikipediaPage> } }).query;
  const pages = query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.extract?.trim() || !page.title) return null;
  if (/may refer to:/i.test(page.extract.slice(0, 240))) return null;
  return { title: page.title, extract: page.extract.trim() };
}

export async function fetchWikipediaExtract(wikipediaTitle: string): Promise<{ title: string; extract: string } | null> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("titles", wikipediaTitle);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Brainiac/0.1 (reading comprehension app; https://brainiac-inky.vercel.app)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 86_400 },
  });

  if (!response.ok) return null;
  return extractFromWikipediaResponse(await response.json());
}
