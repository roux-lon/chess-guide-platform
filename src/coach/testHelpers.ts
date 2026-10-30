// Helpers for coach tests. Builds a MoveContext by really playing the move on a FEN.
import { createGame, createGameFromSan } from "@/rules";
import type { Color, MoveInfo, PromotionPiece } from "@/rules";
import { analyzeMoveEvents } from "./analyze";
import type { CoachEvent } from "./events";
import { otherWho } from "./types";
import type { MoveContext, MoveEvaluation, Who } from "./types";

export interface ContextOptions {
  ply?: number;
  playerColor?: Color;
  evalBefore?: MoveEvaluation | null;
  evalAfter?: MoveEvaluation | null;
  promotion?: PromotionPiece;
  /** The move before this one, for recaptures. */
  previousMove?: MoveInfo;
}

/** The mover is whoever has the turn in `fenBefore`; `actor` follows from `playerColor`. */
export function contextFor(
  fenBefore: string,
  from: string,
  to: string,
  options: ContextOptions = {},
): MoveContext {
  const { ply = 1, playerColor = "white", evalBefore, evalAfter, promotion, previousMove } = options;
  const game = createGame(fenBefore);
  const mover = game.turn();
  const move = game.tryMove(from, to, promotion);
  if (!move) throw new Error(`Test setup: ${from}${to} is not legal in ${fenBefore}`);
  const actor: Who = mover === playerColor ? "you" : "bot";
  return { ply, playerColor, actor, toMove: otherWho(actor), move, previousMove, evalBefore, evalAfter };
}

/**
 * Plays a list of [from, to] moves from a FEN and returns one context per move, each knowing
 * the move before it. For short scenarios written as squares instead of standard notation.
 */
export function contextsFromMoves(
  fen: string,
  moves: ReadonlyArray<readonly [string, string]>,
  playerColor: Color = "white",
): MoveContext[] {
  const contexts: MoveContext[] = [];
  let current = fen;
  moves.forEach(([from, to], i) => {
    const ctx = contextFor(current, from, to, {
      ply: i + 1,
      playerColor,
      previousMove: contexts[i - 1]?.move,
    });
    contexts.push(ctx);
    current = ctx.move.fenAfter;
  });
  return contexts;
}

/** One context per move of a game given in standard notation, each knowing the move before it. */
export function contextsFromSan(sans: string[], playerColor: Color = "white"): MoveContext[] {
  const game = createGameFromSan(sans);
  if (!game) throw new Error(`Test setup: these moves are not a legal game: ${sans.join(" ")}`);
  const moves = game.history();
  return moves.map((move, i): MoveContext => {
    const actor: Who = move.color === playerColor ? "you" : "bot";
    return { ply: i + 1, playerColor, actor, toMove: otherWho(actor), move, previousMove: moves[i - 1] };
  });
}

/** The events for every move of a game in standard notation. */
export function eventsFromSan(sans: string[], playerColor: Color = "white"): CoachEvent[][] {
  return contextsFromSan(sans, playerColor).map(analyzeMoveEvents);
}

export const cp = (cpWhite: number): MoveEvaluation => ({ cpWhite, mateIn: null });
