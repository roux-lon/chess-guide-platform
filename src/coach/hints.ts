import { allHangingPieces, createGame, moveToSan, pieceAt, pieceValue } from "@/rules";
import type { Color, PromotionPiece, Square } from "@/rules";
import { COACH_CONFIG } from "./config";
import type { CoachEvent } from "./events";

export interface HintInput {
  /** The position the player is stuck in. */
  fen: string;
  playerColor: Color;
  /** The engine's best move here, or null if it could not be found. */
  bestMove: { from: Square; to: Square; promotion?: PromotionPiece } | null;
}

/**
 * The three "I'm stuck" tiers, as events, in the order they are revealed:
 * 1. which piece to look at, 2. what the bot is threatening, 3. the suggested move.
 */
export function buildHintEvents({ fen, playerColor, bestMove }: HintInput): CoachEvent[] {
  const inCheck = createGame(fen).status().inCheck;

  const focused = bestMove ? pieceAt(fen, bestMove.from) : null;
  const threatened = allHangingPieces(fen, playerColor)
    .sort((a, b) => pieceValue(b.piece.type) - pieceValue(a.piece.type))
    .slice(0, COACH_CONFIG.maxThreatTargets + 1)
    .map((h) => ({ type: h.piece.type, square: h.piece.square }));

  const piece = bestMove ? pieceAt(fen, bestMove.from) : null;
  const san = bestMove ? moveToSan(fen, bestMove.from, bestMove.to, bestMove.promotion) : null;
  const suggestion =
    bestMove && piece && san
      ? {
          piece: piece.type,
          from: bestMove.from,
          to: bestMove.to,
          san,
          promotion: bestMove.promotion,
        }
      : null;

  return [
    {
      kind: "hint_focus",
      piece: focused ? { type: focused.type, square: focused.square } : null,
      inCheck,
    },
    { kind: "hint_threats", threatened, inCheck },
    { kind: "hint_suggest", suggestion },
  ];
}
