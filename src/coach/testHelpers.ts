// Helpers for coach tests. Builds a MoveContext by really playing the move on a FEN.
import { createGame } from "@/rules";
import type { Color, PromotionPiece } from "@/rules";
import type { MoveContext, MoveEvaluation, Who } from "./types";

export interface ContextOptions {
  ply?: number;
  playerColor?: Color;
  evalBefore?: MoveEvaluation | null;
  evalAfter?: MoveEvaluation | null;
  promotion?: PromotionPiece;
}

/** The mover is whoever has the turn in `fenBefore`; `actor` follows from `playerColor`. */
export function contextFor(
  fenBefore: string,
  from: string,
  to: string,
  options: ContextOptions = {},
): MoveContext {
  const { ply = 1, playerColor = "white", evalBefore, evalAfter, promotion } = options;
  const game = createGame(fenBefore);
  const mover = game.turn();
  const move = game.tryMove(from, to, promotion);
  if (!move) throw new Error(`Test setup: ${from}${to} is not legal in ${fenBefore}`);
  const actor: Who = mover === playerColor ? "you" : "bot";
  return { ply, playerColor, actor, move, evalBefore, evalAfter };
}

export const cp = (cpWhite: number): MoveEvaluation => ({ cpWhite, mateIn: null });
