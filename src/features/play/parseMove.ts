export type ParsedMove = { ok: true; from: string; to: string } | { ok: false; message: string };

const SQUARE = /^[a-h][1-8]$/;

/**
 * Reads a move typed with squares: "e2e4", "e2 e4", "e2-e4" or "e2 to e4" (any case).
 * It only reads the squares. Whether the move is legal is decided by the game, which also
 * explains why not, the same as when a piece is dragged.
 */
export function parseSquares(text: string): ParsedMove {
  const cleaned = text.trim().toLowerCase().replace(/\bto\b/g, " ").replace(/[-,>]/g, " ");
  const compact = cleaned.replace(/\s+/g, "");
  if (compact.length === 0) return { ok: false, message: "Type the square to move from, then the square to move to, like e2 e4." };
  if (compact.length !== 4) {
    return {
      ok: false,
      message: "I need two squares, like e2 e4: first where the piece is now, then where it should go.",
    };
  }
  const from = compact.slice(0, 2);
  const to = compact.slice(2);
  if (!SQUARE.test(from) || !SQUARE.test(to)) {
    return {
      ok: false,
      message: "Squares are a letter from a to h and a number from 1 to 8, like e2.",
    };
  }
  if (from === to) return { ok: false, message: "A piece has to move to a different square." };
  return { ok: true, from, to };
}
