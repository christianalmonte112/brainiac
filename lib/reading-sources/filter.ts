import { READING_SOURCES, topicLabel, type ReadingSource, type ReadingTopicId } from "./catalog";

const STOP_WORDS = new Set(["the", "a", "an", "of", "and", "or", "to", "for", "on", "in"]);

function haystack(source: ReadingSource): string {
  return [source.title, source.subject, source.sourceName, topicLabel(source.topic), ...source.tags]
    .join(" ")
    .toLowerCase();
}

export function sourceMatchesQuery(source: ReadingSource, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = haystack(source);
  if (text.includes(q)) return true;
  const words = q.split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  return words.length > 0 && words.every((word) => text.includes(word));
}

/** Search across the shelf when a subject is typed; otherwise show the selected topic. */
export function filterReadingSources(topic: ReadingTopicId, query: string, sources: ReadingSource[] = READING_SOURCES): ReadingSource[] {
  const q = query.trim();
  if (q) return sources.filter((source) => sourceMatchesQuery(source, q));
  return sources.filter((source) => source.topic === topic);
}
