import type { BoardExercise, PromotionName } from "@/content";
import type { WrongKey } from "@/content";
import { sideToMove } from "@/lib/perspective";
import {
  attackersOf,
  createGame,
  explainIllegalMove,
  kingSquare,
  pieceAt,
} from "@/rules";
import type { IllegalReason, MoveInfo } from "@/rules";

export interface Attempt {
  from: string;
  to: string;
  promotion?: PromotionName;
}

/** The verdict on one attempted move. All of it comes from the rules layer, never from the UI. */
export type Verdict =
  /** The goal was reached. `move` is the move that was played. */
  | { kind: "correct"; move: MoveInfo }
  /** An allowed move, but not the answer. `key` picks the explanation. */
  | { kind: "wrong"; key: WrongKey; vars: Record<string, string> }
  /** Not an allowed move at all. */
  | { kind: "illegal"; reason: IllegalReason; vars: Record<string, string> }
  /** A pawn move that needs a promotion piece before it can be judged. */
  | { kind: "needs-promotion" };

const opposite = (color: "white" | "black") => (color === "white" ? "black" : "white");

/** Which of the three ways out of check a move uses. */
export function escapeMethod(fen: string, move: MoveInfo): "move-king" | "capture" | "block" {
  const kingAt = kingSquare(fen, move.color);
  const checkers = kingAt ? attackersOf(fen, kingAt, opposite(move.color)) : [];
  if (move.captured && checkers.some((c) => c.square === move.to)) return "capture";
  return move.piece === "king" ? "move-king" : "block";
}

/** Decides whether `attempt` solves a board exercise. */
export function judgeMove(exercise: BoardExercise, attempt: Attempt): Verdict {
  const { fen } = exercise;
  const { from, to } = attempt;
  const mover = pieceAt(fen, from);

  const illegal = explainIllegalMove(fen, from, to);
  if (illegal) {
    return { kind: "illegal", reason: illegal, vars: { piece: mover?.type ?? "piece" } };
  }

  const game = createGame(fen);
  if (game.needsPromotion(from, to) && !attempt.promotion) return { kind: "needs-promotion" };
  const move = game.tryMove(from, to, attempt.promotion);
  if (!move) {
    // explainIllegalMove said it was fine, so this only happens for a bad promotion choice.
    return { kind: "illegal", reason: "wrong-shape", vars: { piece: mover?.type ?? "piece" } };
  }

  switch (exercise.type) {
    case "moveToSquare": {
      const goalPiece = pieceAt(fen, exercise.from)?.type ?? "piece";
      if (move.from !== exercise.from) {
        return {
          kind: "wrong",
          key: "moveToSquare.wrong-piece",
          vars: { piece: goalPiece, from: exercise.from },
        };
      }
      if (move.to !== exercise.to) {
        return {
          kind: "wrong",
          key: "moveToSquare.wrong-square",
          vars: { piece: goalPiece, to: exercise.to },
        };
      }
      if (exercise.promotion && move.promotion !== exercise.promotion) {
        return {
          kind: "wrong",
          key: "moveToSquare.wrong-promotion",
          vars: { promotion: exercise.promotion },
        };
      }
      return { kind: "correct", move };
    }

    case "captureTarget": {
      if (move.to === exercise.target && move.captured) return { kind: "correct", move };
      return {
        kind: "wrong",
        key: "captureTarget.not-the-target",
        vars: {
          target: exercise.target,
          targetPiece: pieceAt(fen, exercise.target)?.type ?? "piece",
        },
      };
    }

    case "safeSquare": {
      const goalPiece = pieceAt(fen, exercise.from)?.type ?? "piece";
      if (move.from !== exercise.from) {
        return {
          kind: "wrong",
          key: "safeSquare.wrong-piece",
          vars: { piece: goalPiece, from: exercise.from },
        };
      }
      const attackers = attackersOf(move.fenAfter, move.to, opposite(move.color));
      if (attackers.length === 0) return { kind: "correct", move };
      return {
        kind: "wrong",
        key: "safeSquare.unsafe",
        vars: {
          piece: move.piece,
          to: move.to,
          attacker: attackers[0].type,
          attackerSquare: attackers[0].square,
        },
      };
    }

    case "mateInOne": {
      const status = createGame(move.fenAfter).status();
      if (status.outcome === "checkmate") return { kind: "correct", move };
      if (status.outcome === "stalemate") {
        return { kind: "wrong", key: "mateInOne.stalemate", vars: {} };
      }
      return {
        kind: "wrong",
        key: status.inCheck ? "mateInOne.check-not-mate" : "mateInOne.not-check",
        vars: {},
      };
    }

    case "escapeCheck": {
      // Every allowed move gets out of check. A specific method may still be asked for.
      if (!exercise.method) return { kind: "correct", move };
      const used = escapeMethod(fen, move);
      if (used === exercise.method) return { kind: "correct", move };
      const key =
        exercise.method === "move-king"
          ? "escapeCheck.need-move-king"
          : exercise.method === "capture"
            ? "escapeCheck.need-capture"
            : "escapeCheck.need-block";
      return { kind: "wrong", key, vars: {} };
    }
  }
}

/** Every move that solves the exercise. Used to show the answer and to validate the content. */
export function findSolutions(exercise: BoardExercise): Attempt[] {
  const solutions: Attempt[] = [];
  for (const move of createGame(exercise.fen).legalMoves()) {
    const attempt: Attempt = { from: move.from, to: move.to, promotion: move.promotion };
    if (judgeMove(exercise, attempt).kind === "correct") solutions.push(attempt);
  }
  return solutions;
}

/** The side the player controls in a board exercise: whoever is to move. */
export const playerSide = (exercise: BoardExercise) => sideToMove(exercise.fen);
