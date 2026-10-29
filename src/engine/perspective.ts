import type { Side } from "./types";

/** Which side moves next, read from the second field of a FEN. */
export function sideToMove(fen: string): Side {
  const field = fen.trim().split(/\s+/)[1];
  if (field === "w") return "white";
  if (field === "b") return "black";
  throw new Error(`Cannot read side to move from FEN: ${fen}`);
}

/**
 * Engine evaluations are in centipawns from White's perspective. Judging a move
 * needs the mover's perspective: positive means good for `mover`.
 */
export function toMoverPerspective(cpWhite: number, mover: Side): number {
  return mover === "white" ? cpWhite : 0 - cpWhite; // 0 - x avoids producing -0
}

/** Same idea for mateIn: positive means `mover` is the one delivering mate. Null stays null. */
export function mateToMoverPerspective(mateIn: number | null, mover: Side): number | null {
  if (mateIn === null || mateIn === 0) return mateIn;
  return mover === "white" ? mateIn : 0 - mateIn;
}

/** Engines report scores for the side to move; convert to White's perspective. */
export function scoreToWhite(scoreForMover: number, mover: Side): number {
  return mover === "white" ? scoreForMover : 0 - scoreForMover;
}
