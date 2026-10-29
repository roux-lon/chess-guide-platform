import { describe, expect, it } from "vitest";
import { moveToUci, parseBestMove, parseInfo, uciToMove } from "./uci";

describe("uciToMove / moveToUci", () => {
  it("parses a plain move", () => {
    expect(uciToMove("e2e4")).toEqual({ from: "e2", to: "e4" });
  });

  it("parses each promotion piece", () => {
    expect(uciToMove("a7a8q")).toEqual({ from: "a7", to: "a8", promotion: "queen" });
    expect(uciToMove("a7a8r")?.promotion).toBe("rook");
    expect(uciToMove("a7a8b")?.promotion).toBe("bishop");
    expect(uciToMove("h2h1n")?.promotion).toBe("knight");
  });

  it("rejects things that are not moves", () => {
    expect(uciToMove("(none)")).toBeNull();
    expect(uciToMove("e2")).toBeNull();
    expect(uciToMove("z9z9")).toBeNull();
    expect(uciToMove("e7e8x")).toBeNull();
  });

  it("round-trips", () => {
    for (const uci of ["e2e4", "g1f3", "a7a8q", "b2b1n"]) {
      const move = uciToMove(uci);
      expect(move && moveToUci(move)).toBe(uci);
    }
  });
});

describe("parseInfo", () => {
  it("reads depth, centipawn score and the principal variation", () => {
    const info = parseInfo(
      "info depth 12 seldepth 18 multipv 1 score cp 34 nodes 12345 nps 500000 time 25 pv e2e4 e7e5 g1f3",
    );
    expect(info).toEqual({
      depth: 12,
      multipv: 1,
      scoreCp: 34,
      pv: ["e2e4", "e7e5", "g1f3"],
    });
  });

  it("reads a mate score, including a negative one", () => {
    expect(parseInfo("info depth 5 score mate 3 pv d1h5")?.scoreMate).toBe(3);
    expect(parseInfo("info depth 5 score mate -2 pv a1a2")?.scoreMate).toBe(-2);
  });

  it("reads a negative centipawn score", () => {
    expect(parseInfo("info depth 8 score cp -150 pv d7d5")?.scoreCp).toBe(-150);
  });

  it("reads the candidate line number with MultiPV", () => {
    expect(parseInfo("info depth 4 multipv 3 score cp 10 pv g1f3")?.multipv).toBe(3);
  });

  it("ignores a bound marker after the score", () => {
    const info = parseInfo("info depth 9 score cp 20 lowerbound nodes 5 pv e2e4");
    expect(info).toMatchObject({ scoreCp: 20, pv: ["e2e4"] });
  });

  it("returns null for lines with nothing useful", () => {
    expect(parseInfo("info string NNUE evaluation using nn.bin")).toBeNull();
    expect(parseInfo("info depth 3 currmove e2e4 currmovenumber 1")).toBeNull();
    expect(parseInfo("uciok")).toBeNull();
  });
});

describe("parseBestMove", () => {
  it("reads the move and ignores ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toEqual({
      move: { from: "e2", to: "e4" },
    });
  });

  it("reads a promotion", () => {
    expect(parseBestMove("bestmove a7a8q")?.move?.promotion).toBe("queen");
  });

  it("reports no move for (none)", () => {
    expect(parseBestMove("bestmove (none)")).toEqual({ move: null });
  });

  it("returns null for other lines", () => {
    expect(parseBestMove("readyok")).toBeNull();
    expect(parseBestMove("bestmove")).toBeNull();
  });
});
