import { z } from "zod";

/** Validation rules per docs/FEATURES.md F-003. */
export const createReadingSessionSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer."),
  sourceText: z
    .string()
    .trim()
    .min(100, "Paste at least 100 characters of text.")
    .max(50_000, "Text must be 50,000 characters or fewer."),
});

export type CreateReadingSessionInput = z.infer<typeof createReadingSessionSchema>;

/** Shared identifiers for a chunk-progress mutation (F-002). */
const chunkLocationSchema = z.object({
  sessionId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().min(1),
});

/**
 * A micro-summary submission (F-003): either a one-sentence summary or
 * exactly 3 keywords, never both. This is the only input that's allowed to
 * advance a session's currentChunkIndex.
 */
export const submitChunkSummarySchema = chunkLocationSchema
  .extend({
    mode: z.enum(["summary", "keywords"]),
    summaryText: z.string().trim().max(280, "Keep it to one sentence (280 characters max).").optional(),
    keywords: z.array(z.string().trim().min(1)).optional(),
    /** Seconds spent on this chunk, for the progress dashboard's reading-speed stats (F-005). Clamped, not trusted blindly. */
    chunkSeconds: z.number().int().min(0).max(10_800).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "summary" && !(data.summaryText && data.summaryText.length > 0)) {
      ctx.addIssue({ code: "custom", message: "Write a one-sentence summary.", path: ["summaryText"] });
    }
    if (data.mode === "keywords" && data.keywords?.length !== 3) {
      ctx.addIssue({ code: "custom", message: "Select exactly 3 keywords.", path: ["keywords"] });
    }
  });

export type SubmitChunkSummaryInput = z.infer<typeof submitChunkSummarySchema>;
