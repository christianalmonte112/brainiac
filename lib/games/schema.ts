import { z } from "zod";

/** One flashcard answer in the memory game (F-014). */
export const submitVocabularyReviewSchema = z.object({
  vocabularyWordId: z.string().min(1),
  correct: z.boolean(),
});

export type SubmitVocabularyReviewInput = z.infer<typeof submitVocabularyReviewSchema>;
