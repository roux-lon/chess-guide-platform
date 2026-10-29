import { allHangingPieces } from "@/rules";
import type { Color, Square } from "@/rules";

export interface DangerHighlight {
  square: Square;
  /** "danger": one of your pieces could be taken. "good": one of the bot's pieces is loose. */
  kind: "danger" | "good";
}

/**
 * The squares to light up in Full coaching: your pieces that could be captured for free, and
 * the bot's pieces that you could. Straight from the rules layer, nothing guessed.
 */
export function dangerHighlights(fen: string, playerColor: Color): DangerHighlight[] {
  return allHangingPieces(fen).map(({ piece }) => ({
    square: piece.square,
    kind: piece.color === playerColor ? "danger" : "good",
  }));
}
