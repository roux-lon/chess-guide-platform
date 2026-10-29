import { describe, expect, it } from "vitest";
import { createGameFromSan } from "./game";
import { movesToPgn, parsePgnMoves } from "./pgn";
import { START_FEN } from "./types";

const SCHOLARS_MATE = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];

describe("movesToPgn / parsePgnMoves", () => {
  it("writes a game as PGN and reads the same moves back", () => {
    const pgn = movesToPgn(SCHOLARS_MATE);
    expect(pgn).toContain("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    expect(parsePgnMoves(pgn ?? "")).toEqual(SCHOLARS_MATE);
  });

  it("includes the headers it is given", () => {
    const pgn = movesToPgn(SCHOLARS_MATE, {
      event: "Chess Coach game",
      date: "2026.03.01",
      white: "You",
      black: "Bot (level 2)",
      result: "1-0",
    });
    expect(pgn).toContain('[Event "Chess Coach game"]');
    expect(pgn).toContain('[Date "2026.03.01"]');
    expect(pgn).toContain('[White "You"]');
    expect(pgn).toContain('[Black "Bot (level 2)"]');
    expect(pgn).toContain('[Result "1-0"]');
    expect(parsePgnMoves(pgn ?? "")).toEqual(SCHOLARS_MATE);
  });

  it("handles an empty game and an unfinished one", () => {
    expect(parsePgnMoves(movesToPgn([]) ?? "")).toEqual([]);
    expect(parsePgnMoves(movesToPgn(["d4", "d5"]) ?? "")).toEqual(["d4", "d5"]);
  });

  it("returns null for an illegal move list or text that is not a game", () => {
    expect(movesToPgn(["e4", "e4"])).toBeNull();
    expect(movesToPgn(["Qh5"])).toBeNull();
    expect(parsePgnMoves("this is not a game")).toBeNull();
  });
});

describe("createGameFromSan", () => {
  it("replays moves and keeps the history, so undo works", () => {
    const game = createGameFromSan(["e4", "e5", "Nf3"]);
    expect(game).not.toBeNull();
    expect(game?.history().map((m) => m.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(game?.turn()).toBe("black");
    expect(game?.undo()?.san).toBe("Nf3");
    expect(game?.turn()).toBe("white");
  });

  it("knows the position before each move, for reviews", () => {
    const game = createGameFromSan(SCHOLARS_MATE);
    const history = game?.history() ?? [];
    expect(history[0].fenBefore).toBe(START_FEN);
    expect(history[6]).toMatchObject({ from: "h5", to: "f7", san: "Qxf7#" });
    expect(game?.status()).toMatchObject({ outcome: "checkmate", winner: "white" });
  });

  it("starts from the beginning with an empty list", () => {
    expect(createGameFromSan([])?.fen()).toBe(START_FEN);
  });

  it("returns null if any move is illegal", () => {
    expect(createGameFromSan(["e4", "e5", "Ke3"])).toBeNull();
    expect(createGameFromSan(["nonsense"])).toBeNull();
  });
});
