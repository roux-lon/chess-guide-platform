import type { AnswerCounts } from "@/storage";

export interface GymAnswer {
  drillId: string;
  type: string;
  correct: boolean;
}

/** Adds a session's answers to the counts kept per drill type. Pure: returns a new object. */
export function addAnswers(
  stats: Readonly<Record<string, AnswerCounts>>,
  answers: readonly GymAnswer[],
): Record<string, AnswerCounts> {
  const next: Record<string, AnswerCounts> = { ...stats };
  for (const answer of answers) {
    const known = next[answer.type] ?? { asked: 0, correct: 0 };
    next[answer.type] = { asked: known.asked + 1, correct: known.correct + (answer.correct ? 1 : 0) };
  }
  return next;
}

/** Whole-number percent, or null when nothing was asked. */
export function percent(counts: AnswerCounts | undefined): number | null {
  if (!counts || counts.asked === 0) return null;
  return Math.round((counts.correct / counts.asked) * 100);
}
