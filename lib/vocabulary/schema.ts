import { z } from "zod";

/** A clicked word, sanitized before it's used in a dictionary lookup or DB write. */
export const lookupWordSchema = z.object({
  word: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Word is required.")
    .max(64, "That doesn't look like a single word.")
    .regex(/^[a-z][a-z'-]*$/, "Only letters, apostrophes, and hyphens are supported."),
  sessionId: z.string().min(1).optional(),
});

export type LookupWordInput = z.infer<typeof lookupWordSchema>;
