import { z } from "zod";
import { COMPREHENSION_QUESTIONS, INFERENCE_QUESTIONS, VOCABULARY_QUESTIONS } from "./content";

/**
 * Validates the payload submitted from the client at the end of the
 * assessment. Answer arrays must match the fixed question-set lengths —
 * this also guards against a stale client sending a payload shaped for an
 * older version of the content.
 */
export const submitBaselineAssessmentSchema = z.object({
  elapsedSeconds: z.number().int().positive().max(60 * 60),
  comprehensionAnswers: z.array(z.number().int().min(0).max(3)).length(COMPREHENSION_QUESTIONS.length),
  vocabularyAnswers: z.array(z.number().int().min(0).max(3)).length(VOCABULARY_QUESTIONS.length),
  inferenceAnswers: z.array(z.number().int().min(0).max(3)).length(INFERENCE_QUESTIONS.length),
});

export type SubmitBaselineAssessmentInput = z.infer<typeof submitBaselineAssessmentSchema>;
