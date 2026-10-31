// Words for the Thinking Gym. The drills themselves are in content/gym/. Short, kind, beginner words.

import type { DrillType, PlanId, RoutineStep } from "./gym";

export const GYM_TYPE_ORDER: readonly DrillType[] = [
  "spotThreat",
  "isItSafe",
  "pickOfThree",
  "whatsThePlan",
  "spotDoubleAttack",
];

export const GYM_TEXT = {
  navLabel: "Thinking Gym",
  homeBlurb: "Quick drills that train how to think before you move.",
  pageTitle: "Thinking Gym",
  blurb:
    "Short drills that train the four-step thinking routine: what did they just do, what is my plan, pick a move, safety check. Five drills a session, about three minutes.",
  routineTitle: "The thinking routine",
  start: "Start a 5-drill session",
  startMine: "Include drills from my own games",
  mineAvailable: (count: number) =>
    count === 1
      ? "1 position from your own games is ready to practise."
      : `${count} positions from your own games are ready to practise.`,
  mineNone: "After your next game, positions where you slipped will show up here as drills.",
  historyTitle: "Your accuracy so far",
  historyEmpty: "Finish a session and your accuracy for each kind of drill will show here.",
  progress: (index: number, total: number) => `Drill ${index} of ${total}`,

  typeLabel: {
    spotThreat: "Spot the threat",
    isItSafe: "Is it safe?",
    pickOfThree: "Pick the best move",
    whatsThePlan: "What's the plan?",
    spotDoubleAttack: "Find the double attack",
  } satisfies Record<DrillType, string>,

  stepLabel: {
    1: "Step 1: What did they just do?",
    2: "Step 2: What's my plan?",
    3: "Step 3: Pick a move",
    4: "Step 4: Safety check",
  } satisfies Record<RoutineStep, string>,

  planLabel: {
    develop: "Bring out a piece",
    center: "Claim the center",
    castle: "Castle",
    attack: "Win material",
    defend: "Save a piece",
  } satisfies Record<PlanId, string>,

  prompt: {
    spotThreat:
      "What is the other side attacking? Click each of your pieces that could be won, then press Check. If nothing is in danger, press Check with nothing picked.",
    isItSafe: (san: string) => `Is ${san} a safe move? The arrow shows it.`,
    pickOfThree: "Which move is best? Pick the one that leaves nothing of yours in danger.",
    whatsThePlan: "What is the best plan in this position?",
    spotDoubleAttack: "Find the move that attacks two things at once. Move the piece on the board.",
  },

  mine: {
    intro: "Here is a position from one of your own games.",
  },

  buttons: {
    check: "Check",
    yesSafe: "Yes, it is safe",
    noUnsafe: "No, something can be won",
    next: "Next drill",
    finish: "See my results",
    similar: "Try a similar one",
    again: "Another session",
    back: "Back to the gym",
  },

  verdict: {
    right: "Right!",
    wrong: "Not quite.",
    wrongMove: "That move does not attack two things at once.",
    illegalMove: "That move is not allowed. Try another piece or square.",
  },

  detail: {
    spotThreat: (missed: readonly string[], extra: readonly string[]) => {
      const parts: string[] = [];
      if (missed.length > 0) parts.push(`You missed ${list(missed)}.`);
      if (extra.length > 0) parts.push(`${list(extra)} ${extra.length === 1 ? "is" : "are"} not really in danger.`);
      return parts.join(" ");
    },
    isItSafe: (safe: boolean) => (safe ? "Yes, it is safe." : "No, it is not safe."),
    pickOfThree: (san: string) => `The best move is ${san}.`,
    whatsThePlan: (plan: string) => `The best plan here: ${plan}.`,
  },

  summary: {
    title: "Session finished",
    score: (correct: number, total: number) => `${correct} of ${total} right`,
    perType: "By kind of drill",
    kindLine: (correct: number, asked: number) => `${correct} / ${asked}`,
    noneYet: "not asked",
    great: "Great thinking! The routine gets quicker every time.",
    keepGoing: "Good work. Every drill makes the routine feel more natural.",
  },

  // Drills built from the person's own games.
  fromGames: {
    explainUnsafe: (san: string, piece: string, square: string, safeSan?: string) =>
      `After ${san}, your ${piece} on ${square} could be won.${safeSan ? ` A safe move here was ${safeSan}.` : ""}`,
    feedbackUnsafe: (piece: string, square: string) => `Your ${piece} on ${square} could be won after this move.`,
    feedbackSafe: "Nothing of yours can be won after this move.",
    pickExplanation: "Run the safety check on each move: after it, can the bot win any of my pieces?",
  },
} as const;

function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
