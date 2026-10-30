import {
  canStillCastle,
  createGame,
  pawnsOn,
  undevelopedMinors,
  unsafePieces,
} from "@/rules";
import type { Color, MoveInfo, PromotionPiece, Square } from "@/rules";
import { CENTER_SQUARES, COACH_CONFIG } from "./config";
import { classifyPurpose } from "./detectors/movePurpose";
import type { CoachEvent, HintPlanEvent } from "./events";
import { meta } from "./types";
import type { PieceRef } from "./types";

export interface HintInput {
  /** The position the player is stuck in. */
  fen: string;
  playerColor: Color;
  /** The engine's best move here, or null if it could not be found. */
  bestMove: { from: Square; to: Square; promotion?: PromotionPiece } | null;
  /** 1-based number of the half-move the player is about to make. */
  ply?: number;
  /** The bot's last move, so a recapture can be told apart. */
  previousMove?: MoveInfo;
}

const ref = (piece: { type: PieceRef["type"]; square: Square }): PieceRef => ({
  type: piece.type,
  square: piece.square,
});

/** The biggest job still undone, checked in a fixed order: check, danger, development, castling, center. */
function planFor(fen: string, color: Color, inCheck: boolean, danger: PieceRef[]): Pick<HintPlanEvent, "plan" | "pieces"> {
  if (inCheck) return { plan: "check", pieces: [] };
  if (danger.length > 0) return { plan: "threat", pieces: [danger[0]] };
  const home = undevelopedMinors(fen, color);
  if (home.length > 0) return { plan: "develop", pieces: home.map(ref) };
  if (canStillCastle(fen, color)) return { plan: "castle", pieces: [] };
  if (pawnsOn(fen, color, CENTER_SQUARES) === 0) return { plan: "center", pieces: [] };
  return { plan: "free", pieces: [] };
}

/**
 * The three "I'm stuck" tiers, as events, in the order they are revealed. They are the
 * thinking routine a player can copy on every move:
 * 1. Safety check: is anything of mine in danger?
 * 2. Plan check: what is the biggest job still undone (or the bot's main threat)?
 * 3. The engine's move, with what it is for.
 */
export function buildHintEvents({ fen, playerColor, bestMove, ply = 1, previousMove }: HintInput): CoachEvent[] {
  const inCheck = createGame(fen).status().inCheck;
  const unsafe = unsafePieces(fen, playerColor)
    .slice(0, COACH_CONFIG.maxThreatTargets + 1)
    .map((u) => ref(u.piece));

  const move = bestMove ? createGame(fen).tryMove(bestMove.from, bestMove.to, bestMove.promotion) : null;
  const suggestion = move
    ? { piece: move.piece, from: move.from, to: move.to, san: move.san, promotion: bestMove?.promotion }
    : null;

  return [
    { kind: "hint_safety", ...meta("user", "info"), unsafe, inCheck },
    { kind: "hint_plan", ...meta("user", "info"), ...planFor(fen, playerColor, inCheck, unsafe) },
    {
      kind: "hint_suggest",
      ...meta("user", "info"),
      suggestion,
      purpose: move ? classifyPurpose(move, { ply, previousMove }) : "other",
      safeAfter: move ? unsafePieces(move.fenAfter, playerColor).length === 0 : false,
    },
  ];
}
