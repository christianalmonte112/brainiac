/**
 * F-021 badge catalog. `key` is a stable, permanent identifier stored in
 * the database — never rename an existing key (it would orphan already-
 * earned Badge rows); add a new key and retire the old one instead if a
 * badge's criteria fundamentally changes.
 */

export type BadgeCategory = "streak" | "sessions" | "speed" | "comprehension" | "vocabulary";

export interface BadgeDefinition {
  key: string;
  category: BadgeCategory;
  label: string;
  description: string;
  /** Single emoji glyph — keeps this dependency-free and legible at any size, consistent with the rest of the app's monochrome/text-forward style. */
  icon: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { key: "streak_3", category: "streak", label: "3-Day Streak", description: "Read 3 days in a row.", icon: "🔥" },
  { key: "streak_7", category: "streak", label: "Week Streak", description: "Read 7 days in a row.", icon: "🔥" },
  { key: "streak_30", category: "streak", label: "Month Streak", description: "Read 30 days in a row.", icon: "🔥" },

  { key: "sessions_1", category: "sessions", label: "First Session", description: "Complete your first reading session.", icon: "📖" },
  { key: "sessions_10", category: "sessions", label: "10 Sessions", description: "Complete 10 reading sessions.", icon: "📚" },
  { key: "sessions_25", category: "sessions", label: "25 Sessions", description: "Complete 25 reading sessions.", icon: "📚" },

  { key: "speed_10", category: "speed", label: "Picking Up Speed", description: "Read 10% faster than your baseline.", icon: "⚡" },
  { key: "speed_25", category: "speed", label: "Quick Reader", description: "Read 25% faster than your baseline.", icon: "⚡" },
  { key: "speed_50", category: "speed", label: "Speed Reader", description: "Read 50% faster than your baseline.", icon: "⚡" },

  { key: "comprehension_80", category: "comprehension", label: "Sharp Mind", description: "Average 80%+ on quizzes.", icon: "🎯" },
  { key: "comprehension_90", category: "comprehension", label: "Razor Sharp", description: "Average 90%+ on quizzes.", icon: "🎯" },

  { key: "vocabulary_10", category: "vocabulary", label: "Word Collector", description: "Master 10 vocabulary words.", icon: "🧠" },
  { key: "vocabulary_50", category: "vocabulary", label: "Lexicon Builder", description: "Master 50 vocabulary words.", icon: "🧠" },
];

export const BADGE_BY_KEY: ReadonlyMap<string, BadgeDefinition> = new Map(
  BADGE_DEFINITIONS.map((badge) => [badge.key, badge]),
);
