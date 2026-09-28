export const READING_TOPICS = [
  { id: "science", label: "Science" },
  { id: "history", label: "History" },
  { id: "ideas", label: "Ideas" },
  { id: "how-things-work", label: "How things work" },
] as const;

export type ReadingTopicId = (typeof READING_TOPICS)[number]["id"];

export interface ReadingSource {
  id: string;
  title: string;
  /** Wikipedia page title used to fetch the opening of the article. */
  wikipediaTitle: string;
  sourceName: string;
  sourceUrl: string;
  topic: ReadingTopicId;
  /** Shared label for "More on this subject". Pieces with the same subject lead to each other. */
  subject: string;
  tags: string[];
  /** Rough reading time for the opening we keep, shown before the text is fetched. */
  minutes: number;
}

function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function source(
  entry: Omit<ReadingSource, "sourceName" | "sourceUrl" | "wikipediaTitle"> & { wikipediaTitle?: string },
): ReadingSource {
  const wikipediaTitle = entry.wikipediaTitle ?? entry.title;
  return {
    ...entry,
    wikipediaTitle,
    sourceName: "Wikipedia",
    sourceUrl: wikiUrl(wikipediaTitle),
  };
}

/** Open articles a reader can start from when they have nothing of their own. */
export const READING_SOURCES: ReadingSource[] = [
  source({
    id: "black-hole",
    title: "Black hole",
    topic: "science",
    subject: "space",
    tags: ["black holes", "space", "astronomy"],
    minutes: 12,
  }),
  source({
    id: "solar-system",
    title: "Solar System",
    topic: "science",
    subject: "space",
    tags: ["planets", "space", "astronomy"],
    minutes: 12,
  }),
  source({
    id: "photosynthesis",
    title: "Photosynthesis",
    topic: "science",
    subject: "biology",
    tags: ["photosynthesis", "plants", "biology"],
    minutes: 11,
  }),
  source({
    id: "evolution",
    title: "Evolution",
    topic: "science",
    subject: "biology",
    tags: ["evolution", "biology"],
    minutes: 12,
  }),
  source({
    id: "printing-press",
    title: "Printing press",
    topic: "history",
    subject: "invention",
    tags: ["printing press", "invention", "books"],
    minutes: 11,
  }),
  source({
    id: "telegraph",
    title: "Electrical telegraph",
    wikipediaTitle: "Electrical telegraph",
    topic: "history",
    subject: "invention",
    tags: ["telegraph", "invention", "communication"],
    minutes: 11,
  }),
  source({
    id: "silk-road",
    title: "Silk Road",
    topic: "history",
    subject: "trade",
    tags: ["silk road", "trade", "history"],
    minutes: 12,
  }),
  source({
    id: "spice-trade",
    title: "Spice trade",
    topic: "history",
    subject: "trade",
    tags: ["spice trade", "trade", "history"],
    minutes: 11,
  }),
  source({
    id: "federal-reserve",
    title: "Federal Reserve",
    topic: "history",
    subject: "money",
    tags: ["federal reserve", "the federal reserve", "money", "banking"],
    minutes: 12,
  }),
  source({
    id: "gold-standard",
    title: "Gold standard",
    topic: "history",
    subject: "money",
    tags: ["gold standard", "money", "banking"],
    minutes: 11,
  }),
  source({
    id: "stoicism",
    title: "Stoicism",
    topic: "ideas",
    subject: "philosophy",
    tags: ["stoicism", "philosophy"],
    minutes: 11,
  }),
  source({
    id: "empiricism",
    title: "Empiricism",
    topic: "ideas",
    subject: "philosophy",
    tags: ["empiricism", "philosophy"],
    minutes: 11,
  }),
  source({
    id: "scientific-method",
    title: "Scientific method",
    topic: "ideas",
    subject: "reasoning",
    tags: ["scientific method", "science"],
    minutes: 12,
  }),
  source({
    id: "occams-razor",
    title: "Occam's razor",
    topic: "ideas",
    subject: "reasoning",
    tags: ["occam's razor", "reasoning"],
    minutes: 10,
  }),
  source({
    id: "internal-combustion-engine",
    title: "Internal combustion engine",
    topic: "how-things-work",
    subject: "machines",
    tags: ["engine", "machines"],
    minutes: 12,
  }),
  source({
    id: "electric-motor",
    title: "Electric motor",
    topic: "how-things-work",
    subject: "machines",
    tags: ["electric motor", "machines"],
    minutes: 11,
  }),
  source({
    id: "internet",
    title: "Internet",
    topic: "how-things-work",
    subject: "networks",
    tags: ["internet", "networks"],
    minutes: 12,
  }),
  source({
    id: "world-wide-web",
    title: "World Wide Web",
    topic: "how-things-work",
    subject: "networks",
    tags: ["world wide web", "internet", "networks"],
    minutes: 11,
  }),
  source({
    id: "supply-and-demand",
    title: "Supply and demand",
    topic: "how-things-work",
    subject: "markets",
    tags: ["supply and demand", "markets", "economics"],
    minutes: 11,
  }),
  source({
    id: "inflation",
    title: "Inflation",
    wikipediaTitle: "Inflation",
    topic: "how-things-work",
    subject: "markets",
    tags: ["inflation", "markets", "economics"],
    minutes: 11,
  }),
];

export function readingSourceById(id: string): ReadingSource | undefined {
  return READING_SOURCES.find((entry) => entry.id === id);
}

export function topicLabel(topic: ReadingTopicId): string {
  return READING_TOPICS.find((entry) => entry.id === topic)?.label ?? topic;
}
