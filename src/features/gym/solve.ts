import type { Drill, PlanId } from "@/content";
import { sideToMove } from "@/lib/perspective";
import {
  canStillCastle,
  createGame,
  doubleAttack,
  isPieceSafe,
  pawnsOn,
  pieceValue,
  undevelopedMinors,
  unsafePieces,
  winningCaptures,
} from "@/rules";
import type { Color, MoveInfo, Square } from "@/rules";

// The truth behind every drill. Nothing here reads a drill's stored answer: it asks the rules
// layer, so a test can compare the two and fail when the data is wrong.

const CENTER: Record<Color, readonly Square[]> = { white: ["d4", "e4"], black: ["d5", "e5"] };

const bySquare = (a: string, b: string) => a.localeCompare(b);

/** Squares of the mover's pieces that the other side can win by exchange. */
export function threatenedSquares(fen: string): string[] {
  return unsafePieces(fen, sideToMove(fen))
    .map((g) => g.piece.square)
    .sort(bySquare);
}

export interface SafetyVerdict {
  legal: boolean;
  safe: boolean;
  /** The square of a piece of the mover's that can be won after the move, if any. */
  lost?: string;
}

/** Is the move safe? It is when afterwards none of the mover's pieces can be won by exchange. */
export function moveSafety(fen: string, from: string, to: string): SafetyVerdict {
  const mover = sideToMove(fen);
  const move = createGame(fen)
    .legalMoves()
    .find((m) => m.from === from && m.to === to);
  if (!move) return { legal: false, safe: false };
  const unsafe = unsafePieces(move.fenAfter, mover);
  const moved = isPieceSafe(move.fenAfter, move.to) ? undefined : move.to;
  const lost = moved ?? unsafe[0]?.piece.square;
  return { legal: true, safe: lost === undefined, ...(lost ? { lost } : {}) };
}

/** The legal moves that make two threats at once (a fork, or check plus a threat). */
export function doubleAttackMoves(fen: string): MoveInfo[] {
  const mover = sideToMove(fen);
  return createGame(fen)
    .legalMoves()
    .filter((m) => doubleAttack(fen, m.fenAfter, mover, m.to) !== null);
}

/**
 * The plan that fits the position, for the side to move. Most urgent first: save a piece that
 * can be won, win a piece (a knight or more) you can take, claim the center, bring out the pieces, castle.
 * Undefined when no single plan stands out (the drills never use such positions).
 */
export function planFor(fen: string): PlanId | undefined {
  const mover = sideToMove(fen);
  if (unsafePieces(fen, mover).length > 0) return "defend";
  if (winningCaptures(fen).some((w) => pieceValue(w.target.type) >= pieceValue("knight"))) return "attack";
  if (pawnsOn(fen, mover, CENTER[mover]) === 0) return "center";
  if (undevelopedMinors(fen, mover).length > 0) return "develop";
  if (canStillCastle(fen, mover)) return "castle";
  return undefined;
}

/** What is wrong with a drill's stored answer, compared with what the rules layer says. */
export function drillProblems(drill: Drill): string[] {
  const problems: string[] = [];
  const say = (text: string) => problems.push(`${drill.id}: ${text}`);

  try {
    createGame(drill.fen);
  } catch {
    return [`${drill.id}: the position is not a legal FEN`];
  }
  const game = createGame(drill.fen);
  if (game.status().isGameOver) say("the game is already over");
  if (game.status().inCheck) say("the player is in check (the drills are not about check)");

  switch (drill.type) {
    case "spotThreat": {
      const actual = threatenedSquares(drill.fen);
      const stored = [...drill.threatened].sort(bySquare);
      if (actual.join() !== stored.join()) {
        say(`data says ${stored.join(",") || "nothing"} is threatened, the rules say ${actual.join(",") || "nothing"}`);
      }
      break;
    }
    case "isItSafe": {
      const verdict = moveSafety(drill.fen, drill.move.from, drill.move.to);
      if (!verdict.legal) return [...problems, `${drill.id}: the move is not legal`];
      if (verdict.safe !== drill.safe) {
        say(`data says the move is ${drill.safe ? "safe" : "not safe"}, the rules say ${verdict.safe ? "safe" : "not safe"}`);
      } else if (!drill.safe && drill.loses !== verdict.lost) {
        say(`data says ${drill.loses ?? "nothing"} is lost, the rules say ${verdict.lost}`);
      }
      break;
    }
    case "pickOfThree": {
      const verdicts = drill.choices.map((c) => moveSafety(drill.fen, c.from, c.to));
      verdicts.forEach((v, i) => {
        if (!v.legal) say(`choice ${i + 1} is not a legal move`);
      });
      const safeOnes = verdicts.flatMap((v, i) => (v.safe ? [i] : []));
      if (safeOnes.length !== 1) say(`exactly one choice must be safe, the rules found ${safeOnes.length}`);
      else if (safeOnes[0] !== drill.best) say(`data says choice ${drill.best + 1} is best, the rules say choice ${safeOnes[0] + 1}`);
      break;
    }
    case "whatsThePlan": {
      const actual = planFor(drill.fen);
      if (actual !== drill.plan) say(`data says the plan is ${drill.plan}, the rules say ${actual ?? "none"}`);
      if (!drill.choices.includes(drill.plan)) say("the right plan is not among the choices");
      if (new Set(drill.choices).size !== drill.choices.length) say("the choices repeat a plan");
      if (drill.choices.length < 2 || drill.choices.length > 4) say("a drill needs two to four plans to choose from");
      break;
    }
    case "spotDoubleAttack": {
      const forks = doubleAttackMoves(drill.fen).map((m) => `${m.from}${m.to}`);
      const stored = `${drill.solution.from}${drill.solution.to}`;
      if (!forks.includes(stored)) say(`${stored} is not a double attack by the rules (found: ${forks.join(",") || "none"})`);
      else if (forks.length !== 1) say(`more than one move makes a double attack (${forks.join(",")}); keep one so the answer is clear`);
      break;
    }
  }
  return problems;
}
