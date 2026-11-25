import { describe, expect, it } from "vitest";
import { gradingSchema, overallScore, submissionSchema } from "./schema";
const grade = (score: number | null) => ({ score, needsClarification: score === null, feedback: "Feedback grounded in the passage." });
describe("written check", () => {
  it("accepts informal writing without spelling or grammar restrictions", () => {
    expect(submissionSchema.safeParse({ sessionId: "s", answers: ["he didnt giv up", "- kept tryin", "i think he will try agen"] }).success).toBe(true);
  });
  it("requires all answers and bounds input", () => {
    expect(submissionSchema.safeParse({ sessionId: "s", answers: ["a", " ", "b"] }).success).toBe(false);
  });
  it("preserves zero grades", () => {
    expect(overallScore(gradingSchema.parse({ results: [grade(0), grade(0), grade(0)] }))).toBe(0);
  });
  it("does not turn unclear answers into an overall grade", () => {
    expect(overallScore(gradingSchema.parse({ results: [grade(90), grade(null), grade(80)] }))).toBeNull();
  });
  it("rejects malformed grades rather than inventing zero", () => {
    for (const score of [-1, 101, "85", 85.5]) expect(gradingSchema.safeParse({ results: [grade(80), grade(80), { ...grade(80), score }] }).success).toBe(false);
    expect(gradingSchema.safeParse({ results: [grade(80)] }).success).toBe(false);
    expect(gradingSchema.safeParse({ results: [{ ...grade(null), score: 0 }, grade(80), grade(80)] }).success).toBe(false);
  });
});
