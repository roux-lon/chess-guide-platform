import { Chess } from "chess.js";

/** The usual PGN header tags we fill in. All optional. */
export interface PgnHeaders {
  event?: string;
  /** Date as YYYY.MM.DD. */
  date?: string;
  white?: string;
  black?: string;
  /** "1-0", "0-1", "1/2-1/2" or "*" for unfinished. */
  result?: string;
}

/**
 * The game as PGN text (the standard way to write a chess game down) from its moves in
 * standard notation. Returns null if a move is not legal from the starting position.
 */
export function movesToPgn(sanMoves: readonly string[], headers: PgnHeaders = {}): string | null {
  const chess = new Chess();
  try {
    for (const san of sanMoves) chess.move(san);
  } catch {
    return null;
  }
  const tags: [string, string | undefined][] = [
    ["Event", headers.event],
    ["Date", headers.date],
    ["White", headers.white],
    ["Black", headers.black],
    ["Result", headers.result],
  ];
  for (const [name, value] of tags) {
    if (value !== undefined) chess.setHeader(name, value);
  }
  return chess.pgn();
}

/** The moves in a PGN, in standard notation, or null if the text is not a legal game. */
export function parsePgnMoves(pgn: string): string[] | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }
  return chess.history();
}
