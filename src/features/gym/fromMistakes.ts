import { GYM_TEXT } from "@/content";
import type { Drill, PickChoice } from "@/content";
import { createGame, pieceAt, pieceValue } from "@/rules";
import type { MoveInfo } from "@/rules";
import type { MistakePosition } from "@/storage";
import { moveSafety } from "./solve";

// Drills built from the person's own past mistakes. The answers are worked out here by the
// rules layer (never copied from the game), so a position the rules cannot teach is skipped.

const hash = (text: string) => [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

interface Judged {
  move: MoveInfo;
  safe: boolean;
  lost?: string;
}

function judgeAll(fen: string): Judged[] {
  return createGame(fen)
    .legalMoves()
    .map((move) => {
      const verdict = moveSafety(fen, move.from, move.to);
      return { move, safe: verdict.safe, lost: verdict.lost };
    });
}

/** What stands on `square` after the move, as a word ("knight"). */
function pieceWordAfter(move: MoveInfo, square: string): string {
  return pieceAt(move.fenAfter, square)?.type ?? "piece";
}

/** The safe move to show as the good option: prefer a piece move over a pawn push or a king step. */
function pickSafe(judged: readonly Judged[]): Judged | undefined {
  const rank = (j: Judged) => (j.move.piece === "king" ? 2 : j.move.piece === "pawn" ? 1 : 0);
  return judged
    .filter((j) => j.safe)
    .sort((a, b) => rank(a) - rank(b) || a.move.san.localeCompare(b.move.san))[0];
}

/**
 * Up to two drills from one saved position: "Is X safe?" and "Which of these three moves is
 * safest?". Both are only made when the move that was played really leaves something to be won
 * (by static exchange); a mistake the rules cannot explain produces nothing.
 */
export function drillsFromPosition(position: MistakePosition): Drill[] {
  const judged = judgeAll(position.fen);
  const played = judged.find((j) => j.move.from === position.move.from && j.move.to === position.move.to);
  if (!played || played.safe || !played.lost) return [];

  const lostWord = pieceWordAfter(played.move, played.lost);
  const safe = pickSafe(judged);
  const T = GYM_TEXT.fromGames;
  const base = { fen: position.fen, intro: GYM_TEXT.mine.intro };

  const drills: Drill[] = [
    {
      ...base,
      id: `mine-${position.id}-safe`,
      type: "isItSafe",
      routineStep: 4,
      move: { from: played.move.from, to: played.move.to },
      safe: false,
      loses: played.lost,
      explanation: T.explainUnsafe(played.move.san, lostWord, played.lost, safe?.move.san),
    },
  ];

  // The other wrong option: the unsafe move that costs the most, other than the one played.
  const other = judged
    .filter((j) => !j.safe && j !== played)
    .sort((a, b) => pieceValue(lostType(b)) - pieceValue(lostType(a)) || a.move.san.localeCompare(b.move.san))[0];

  if (safe && other?.lost) {
    const wrong = (j: Judged): PickChoice => ({
      from: j.move.from,
      to: j.move.to,
      feedback: T.feedbackUnsafe(pieceWordAfter(j.move, j.lost ?? j.move.to), j.lost ?? j.move.to),
    });
    const good: PickChoice = { from: safe.move.from, to: safe.move.to, feedback: T.feedbackSafe };
    const choices: PickChoice[] = [wrong(played), wrong(other)];
    const best = hash(position.id) % 3;
    choices.splice(best, 0, good);
    drills.push({
      ...base,
      id: `mine-${position.id}-pick`,
      type: "pickOfThree",
      routineStep: 3,
      choices: choices as [PickChoice, PickChoice, PickChoice],
      best,
      explanation: T.pickExplanation,
    });
  }
  return drills;
}

function lostType(j: Judged) {
  return j.lost ? (pieceAt(j.move.fenAfter, j.lost)?.type ?? "pawn") : "pawn";
}

/** All the drills the saved positions can make. */
export function drillsFromPositions(positions: readonly MistakePosition[]): Drill[] {
  return positions.flatMap(drillsFromPosition);
}
