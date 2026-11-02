import type { AnswerCounts, ThinkingRecord } from "@/storage";

export interface ThinkingTally {
  /** Kind of question asked, for example "safestMove". */
  type: string;
  correct: boolean;
  /** The principle the question trains, once principles are tagged. */
  principleId?: string;
}

function bump(counts: Record<string, AnswerCounts>, key: string, correct: boolean): Record<string, AnswerCounts> {
  const known = counts[key] ?? { asked: 0, correct: 0 };
  return { ...counts, [key]: { asked: known.asked + 1, correct: known.correct + (correct ? 1 : 0) } };
}

/** Adds answered questions to the thinking record. Pure: returns a new record. */
export function addThinkingAnswers(record: ThinkingRecord, answers: readonly ThinkingTally[]): ThinkingRecord {
  let byQuestion = record.byQuestion;
  let byPrinciple = record.byPrinciple;
  for (const a of answers) {
    byQuestion = bump(byQuestion, a.type, a.correct);
    if (a.principleId) byPrinciple = bump(byPrinciple, a.principleId, a.correct);
  }
  return { byQuestion, byPrinciple };
}
