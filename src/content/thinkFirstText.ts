// Words for think-first mode: a short question before my move. Short, kind, beginner words.

import type { PlanId } from "./gym";

export type ThinkQuestionType = "dangerPiece" | "safestMove" | "bestPlan";

export const THINK_QUESTION_ORDER: readonly ThinkQuestionType[] = ["dangerPiece", "safestMove", "bestPlan"];

export const THINK_FIRST_TEXT = {
  settingsTitle: "Think first",
  settingsBlurb: "Before some of your moves, the game asks one quick question. You can always skip it, and you can always just move.",
  modeLabel: { off: "Off", sometimes: "Sometimes", every: "Every move" },
  modeBlurb: {
    off: "No questions. Just play.",
    sometimes: "About one move in three, and more often when something is in danger.",
    every: "A question before every move (when there is a good one to ask).",
  },

  cardTitle: "Think first",
  skip: "Skip",
  gotIt: "Got it",
  skipHint: "You can skip this and just move.",
  right: "Yes!",
  wrong: "Not quite.",

  /** Names the step of the thinking routine each kind of question trains. */
  trains: {
    dangerPiece: "Safety check: is any of my pieces in danger?",
    safestMove: "Safety check: will this move leave something loose?",
    bestPlan: "Plan check: what is the biggest thing still to do?",
  } satisfies Record<ThinkQuestionType, string>,

  prompt: {
    dangerPiece: "Before you move: which of your pieces could the bot win right now?",
    safestMove: "Before you move: which of these moves is the safest?",
    bestPlan: "Before you move: what is the best plan here?",
  } satisfies Record<ThinkQuestionType, string>,

  none: "None of them is in danger",
  pieceLabel: (name: string, square: string) => `My ${name} on ${square}`,

  planLabel: {
    develop: "Bring out a piece",
    center: "Claim the center",
    castle: "Castle",
    attack: "Win material",
    defend: "Save a piece",
  } satisfies Record<PlanId, string>,

  reason: {
    dangerPieceRight: (square: string) => `Right: the piece on ${square} can be won. Save it first, or make sure it is protected.`,
    dangerPieceRightNone: "Right: nothing of yours can be won right now. You can make your plan.",
    dangerPieceWrong: (squares: readonly string[]) =>
      squares.length === 0
        ? "Nothing of yours can be won right now. The highlighted squares are fine."
        : `The piece on ${squares.join(" and ")} is the one that can be won. It is lit up on the board.`,
    safestMoveRight: "Right: after this move nothing of yours can be won.",
    safestMoveWrong: (safe: string) => `${safe} is the safe one: after it nothing of yours can be won. The green arrow shows it.`,
    bestPlanRight: (plan: string) => `Right: "${plan}" is the biggest thing to do.`,
    bestPlanWrong: (plan: string) => `The biggest thing to do here is: ${plan.toLowerCase()}.`,
  },
} as const;
