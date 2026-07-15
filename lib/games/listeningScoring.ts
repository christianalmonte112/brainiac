/**
 * Pure grading for the F-015 listening game. Fill-in-the-blank answers are
 * typed by ear, so grading is deliberately forgiving about case, spacing,
 * and surrounding punctuation — "Don't," matches "don't" — while still
 * requiring the actual word.
 */

export function normalizeBlankAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'") // curly → straight apostrophe (same lesson as the word tokenizer)
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""); // strip surrounding punctuation
}

export function isBlankCorrect(given: string, expected: string): boolean {
  const normalized = normalizeBlankAnswer(given);
  return normalized.length > 0 && normalized === normalizeBlankAnswer(expected);
}

export interface SegmentGrade {
  blanks: boolean[];
  choiceCorrect: boolean;
  correctCount: number;
  totalCount: number;
}

/**
 * Grades one segment: every blank plus the comprehension question each count
 * as one unit. Missing blank answers grade as wrong; a null/omitted choice
 * grades as wrong.
 */
export function gradeSegment(
  givenBlanks: string[],
  blankAnswers: string[],
  givenChoice: number | null | undefined,
  correctIndex: number,
): SegmentGrade {
  const blanks = blankAnswers.map((expected, i) => isBlankCorrect(givenBlanks[i] ?? "", expected));
  const choiceCorrect = givenChoice === correctIndex;
  const correctCount = blanks.filter(Boolean).length + (choiceCorrect ? 1 : 0);
  return {
    blanks,
    choiceCorrect,
    correctCount,
    totalCount: blankAnswers.length + 1,
  };
}
