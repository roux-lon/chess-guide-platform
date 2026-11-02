import { THINK_FIRST_TEXT, THINK_QUESTION_ORDER } from "@/content";
import type { PlanId, ThinkQuestionType } from "@/content";
import { sideToMove } from "@/lib/perspective";
import { allPieces, createGame } from "@/rules";
import type { ThinkFirstMode } from "@/storage";
import { moveSafety, planFor, threatenedSquares } from "@/features/gym/solve";
import { principleOfQuestion } from "@/features/principles/principles";

// A question asked before the player's move. It is only asked when its answer can be worked
// out by the rules layer; the answer is recomputed when the player replies, never stored.

export interface ThinkOption {
  label: string;
  /** dangerPiece: the piece's square, or undefined for "none of them". */
  square?: string;
  /** safestMove: the move this option stands for. */
  move?: { from: string; to: string };
  /** bestPlan: the plan this option stands for. */
  plan?: PlanId;
}

export interface ThinkQuestion {
  type: ThinkQuestionType;
  fen: string;
  prompt: string;
  options: ThinkOption[];
  /** The principle this question trains. */
  principleId?: string;
}

export interface ThinkVerdict {
  correct: boolean;
  /** One line: why it is right or wrong. */
  reason: string;
  /** Squares to light up on the board after the answer. */
  dangerSquares: string[];
  /** Arrows to draw after the answer. */
  arrows: { from: string; to: string; color: "green" | "red" }[];
}

export interface ChooseInput {
  fen: string;
  mode: ThinkFirstMode;
  /** The kind asked last time, so it is not asked twice in a row. */
  lastType?: ThinkQuestionType;
  /** Returns a number in [0, 1). Injected so tests are repeatable. */
  random?: () => number;
}

/** Chance of a question on a quiet turn / on a turn where one of my pieces is in danger. */
export const SOMETIMES_CHANCE = { quiet: 0.3, threat: 0.65 } as const;

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pieceOptions(fen: string, threatened: readonly string[], random: () => number): ThinkOption[] | null {
  const mover = sideToMove(fen);
  const mine = allPieces(fen).filter((p) => p.color === mover && p.type !== "king");
  const target = mine.filter((p) => threatened.includes(p.square));
  const others = shuffled(
    mine.filter((p) => !threatened.includes(p.square) && p.type !== "pawn"),
    random,
  );
  if (threatened.length > 1 || others.length < 2) return null;
  const show = shuffled([...target, ...others.slice(0, 3 - target.length)], random);
  return [
    ...show.map((p) => ({ label: THINK_FIRST_TEXT.pieceLabel(p.type, p.square), square: p.square })),
    { label: THINK_FIRST_TEXT.none },
  ];
}

function safestMoveOptions(fen: string, random: () => number): ThinkOption[] | null {
  const moves = createGame(fen).legalMoves();
  const safe: typeof moves = [];
  const unsafe: typeof moves = [];
  for (const m of moves) (moveSafety(fen, m.from, m.to).safe ? safe : unsafe).push(m);
  if (safe.length === 0 || unsafe.length === 0) return null;
  const picked = shuffled(
    [shuffled(safe, random)[0], ...shuffled(unsafe, random).slice(0, 2)],
    random,
  );
  return picked.map((m) => ({ label: m.san, move: { from: m.from, to: m.to } }));
}

function planOptions(fen: string, random: () => number): ThinkOption[] | null {
  const right = planFor(fen);
  if (!right) return null;
  const all = Object.keys(THINK_FIRST_TEXT.planLabel) as PlanId[];
  const plans = shuffled([right, ...shuffled(all.filter((p) => p !== right), random).slice(0, 2)], random);
  return plans.map((plan) => ({ label: THINK_FIRST_TEXT.planLabel[plan], plan }));
}

function build(type: ThinkQuestionType, fen: string, threatened: readonly string[], random: () => number): ThinkQuestion | null {
  const options =
    type === "dangerPiece"
      ? pieceOptions(fen, threatened, random)
      : type === "safestMove"
        ? safestMoveOptions(fen, random)
        : planOptions(fen, random);
  if (!options) return null;
  const principleId = principleOfQuestion(type, fen);
  return { type, fen, prompt: THINK_FIRST_TEXT.prompt[type], options, ...(principleId ? { principleId } : {}) };
}

/**
 * Decides whether to ask a question before my move and which one. Returns null when it is not
 * a good time: I am in check, there is only one legal move, the dice say no, or no question
 * has an answer the rules layer can check. Never repeats `lastType`.
 */
export function chooseQuestion({ fen, mode, lastType, random = Math.random }: ChooseInput): ThinkQuestion | null {
  if (mode === "off") return null;
  const game = createGame(fen);
  if (game.status().isGameOver || game.status().inCheck) return null;
  if (game.legalMoves().length <= 1) return null;

  const threatened = threatenedSquares(fen);
  const chance = threatened.length > 0 ? SOMETIMES_CHANCE.threat : SOMETIMES_CHANCE.quiet;
  if (mode === "sometimes" && random() >= chance) return null;

  // With something in danger, the "which piece is in danger?" question comes first.
  const order = shuffled(THINK_QUESTION_ORDER.filter((t) => t !== lastType), random);
  if (threatened.length > 0) order.sort((a, b) => Number(b === "dangerPiece") - Number(a === "dangerPiece"));
  for (const type of order) {
    const question = build(type, fen, threatened, random);
    if (question) return question;
  }
  return null;
}

/** Works out the right answer now and says whether the pick (an index into the options) was it. */
export function judgeAnswer(question: ThinkQuestion, index: number): ThinkVerdict {
  const { fen } = question;
  const option = question.options[index];
  const text = THINK_FIRST_TEXT.reason;
  const none: ThinkVerdict = { correct: false, reason: "", dangerSquares: [], arrows: [] };
  if (!option) return none;

  if (question.type === "dangerPiece") {
    const actual = threatenedSquares(fen);
    const picked = option.square ? [option.square] : [];
    const correct = picked.join() === actual.join();
    const reason = correct
      ? actual.length === 0
        ? text.dangerPieceRightNone
        : text.dangerPieceRight(actual[0])
      : text.dangerPieceWrong(actual);
    return { correct, reason, dangerSquares: actual, arrows: [] };
  }

  if (question.type === "safestMove") {
    const verdicts = question.options.map((o) => (o.move ? moveSafety(fen, o.move.from, o.move.to) : undefined));
    const best = verdicts.findIndex((v) => v?.safe);
    const correct = verdicts[index]?.safe === true;
    const arrows = question.options.flatMap((o, i) =>
      o.move ? [{ from: o.move.from, to: o.move.to, color: i === best ? ("green" as const) : ("red" as const) }] : [],
    );
    const lost = verdicts[index]?.lost;
    return {
      correct,
      reason: correct ? text.safestMoveRight : text.safestMoveWrong(question.options[best]?.label ?? ""),
      dangerSquares: !correct && lost ? [lost] : [],
      arrows,
    };
  }

  const right = planFor(fen);
  const correct = right !== undefined && option.plan === right;
  const rightLabel = right ? THINK_FIRST_TEXT.planLabel[right] : "";
  return {
    correct,
    reason: correct ? text.bestPlanRight(rightLabel) : text.bestPlanWrong(rightLabel),
    dangerSquares: [],
    arrows: [],
  };
}
