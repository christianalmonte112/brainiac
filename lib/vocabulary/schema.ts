import { z } from "zod";

/**
 * A clicked word, sanitized before it's used in a dictionary lookup or DB
 * write. Must accept the same character range as WORD_PATTERN in
 * ClickableParagraph.tsx (à-ÿ accented letters, curly apostrophe ’) — if
 * the tokenizer can produce "café" or "don't" as a single clickable word,
 * this validation must accept it too, or the click succeeds but the lookup
 * immediately throws a validation error.
 */
export const lookupWordSchema = z.object({
  word: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Word is required.")
    .max(64, "That doesn't look like a single word.")
    .regex(/^[a-zà-ÿ][a-zà-ÿ'\u2019-]*$/, "Only letters, apostrophes, and hyphens are supported."),
  sessionId: z.string().min(1).optional(),
});

export type LookupWordInput = z.infer<typeof lookupWordSchema>;
