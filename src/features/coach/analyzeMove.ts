import { analyzeMoveEvents, otherWho, takeBackReason } from "@/coach";
import type { MoveEvaluation, Narrator, TermId } from "@/coach";
import type { Evaluation } from "@/engine";
import { createGame } from "@/rules";
import type { Color, MoveInfo, PromotionPiece } from "@/rules";
import type { CoachLogEntry } from "./types";

export interface AnalyzeMoveDeps {
  /** Evaluation of a position, or null if the engine could not give one. May cache. */
  evaluate(fen: string): Promise<Evaluation | null>;
  narrator: Narrator;
}

export interface AnalyzeMoveInput {
  fenBefore: string;
  from: string;
  to: string;
  promotion?: PromotionPiece;
  /** 1-based half-move number of this move. */
  ply: number;
  playerColor: Color;
  /** The move played just before this one, if any, so a recapture is told as part of a trade. */
  previousMove?: MoveInfo;
  explained: ReadonlySet<TermId>;
}

export interface AnalyzeMoveResult {
  entry: CoachLogEntry;
  explainedTerms: TermId[];
  evalBefore: MoveEvaluation | null;
  evalAfter: MoveEvaluation | null;
}

/**
 * The coach pipeline for one move, used for the player's and the bot's moves alike:
 * validate with the rules, evaluate before and after, run the detectors, narrate.
 * If the engine cannot evaluate, the comment still works, just without the quality verdict.
 */
export async function analyzeMove(
  { evaluate, narrator }: AnalyzeMoveDeps,
  input: AnalyzeMoveInput,
): Promise<AnalyzeMoveResult> {
  const game = createGame(input.fenBefore);
  const mover = game.turn();
  const move = game.tryMove(input.from, input.to, input.promotion);
  if (!move) throw new Error(`Illegal move ${input.from}${input.to} at ply ${input.ply}`);

  const evalBefore = await evaluate(move.fenBefore);
  // A finished game has nothing left to evaluate.
  const evalAfter = game.status().isGameOver ? null : await evaluate(move.fenAfter);

  const actor = mover === input.playerColor ? "you" : "bot";
  const events = analyzeMoveEvents({
    ply: input.ply,
    playerColor: input.playerColor,
    actor,
    toMove: otherWho(actor),
    move,
    previousMove: input.previousMove,
    evalBefore,
    evalAfter,
  });
  const { text, comment, explainedTerms } = narrator.narrate({ events, explained: input.explained });

  const warning = actor === "you" ? takeBackReason(events) : null;
  return {
    entry: {
      ply: input.ply,
      moveSan: move.san,
      side: actor,
      events,
      text,
      ...(comment ? { comment } : {}),
      ...(warning ? { warning } : {}),
    },
    explainedTerms,
    evalBefore,
    evalAfter,
  };
}
