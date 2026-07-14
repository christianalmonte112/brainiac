import { z } from "zod";

/** One flashcard answer in the memory game (F-014). */
export const submitVocabularyReviewSchema = z.object({
  vocabularyWordId: z.string().min(1),
  correct: z.boolean(),
});

export type SubmitVocabularyReviewInput = z.infer<typeof submitVocabularyReviewSchema>;

/** Which visual game to generate (F-013) — mirrors the Prisma enum. */
export const visualGameTypeSchema = z.enum(["MATCHING", "SEQUENCING"]);

export type VisualGameTypeInput = z.infer<typeof visualGameTypeSchema>;

export const generateVisualGameSchema = z.object({
  sessionId: z.string().min(1),
  gameType: visualGameTypeSchema,
});

/**
 * One exercise answer (F-013). Both game types submit index arrays:
 * MATCHING — selections[i] = chosen description position for term i;
 * SEQUENCING — selections[j] = shuffled step placed at position j.
 */
export const visualAnswerSchema = z.object({
  selections: z.array(z.number().int().min(0).max(50)).max(20),
});

export const submitVisualGameAttemptSchema = z.object({
  visualGameId: z.string().min(1),
  answers: z.array(visualAnswerSchema).min(1).max(10),
});

export type SubmitVisualGameAttemptInput = z.infer<typeof submitVisualGameAttemptSchema>;

/** Lyrics are user-supplied by design (F-015) — no search or licensing integration. */
export const generateListeningGameSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  lyrics: z
    .string()
    .trim()
    .min(40, "Paste at least a few lines of lyrics.")
    .max(5000, "Lyrics are too long — 5,000 characters max."),
});

export type GenerateListeningGameInput = z.infer<typeof generateListeningGameSchema>;

/** One segment's answers (F-015): typed blanks plus the question choice. */
export const listeningSegmentAnswerSchema = z.object({
  blanks: z.array(z.string().max(100)).max(10),
  choice: z.number().int().min(0).max(3).nullable(),
});

export const submitListeningAttemptSchema = z.object({
  listeningGameId: z.string().min(1),
  answers: z.array(listeningSegmentAnswerSchema).min(1).max(12),
});

export type SubmitListeningAttemptInput = z.infer<typeof submitListeningAttemptSchema>;
