import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor, cp } from "../testHelpers";
import { moveQuality, moverScore } from "./moveQuality";

const WHITE_E4 = (before: ReturnType<typeof cp>, after: ReturnType<typeof cp>, extra = {}) =>
  contextFor(START_FEN, "e2", "e4", { evalBefore: before, evalAfter: after, ...extra });

describe("moverScore", () => {
  it("flips the sign for Black", () => {
    expect(moverScore(cp(120), "white")).toBe(120);
    expect(moverScore(cp(120), "black")).toBe(-120);
  });

  it("treats mates as the clamp value, from the mover's side", () => {
    expect(moverScore({ cpWhite: null, mateIn: 3 }, "white")).toBe(800);
    expect(moverScore({ cpWhite: null, mateIn: 3 }, "black")).toBe(-800);
    expect(moverScore({ cpWhite: null, mateIn: -2 }, "black")).toBe(800);
  });

  it("clamps huge scores and rejects unusable ones", () => {
    expect(moverScore(cp(5000), "white")).toBe(800);
    expect(moverScore({ cpWhite: null, mateIn: null }, "white")).toBeNull();
    expect(moverScore({ cpWhite: null, mateIn: 0 }, "white")).toBeNull();
  });
});

describe("moveQuality", () => {
  it("calls a big drop a blunder", () => {
    expect(moveQuality(WHITE_E4(cp(20), cp(-400)))).toEqual([
      { kind: "move_quality", actor: "you", quality: "blunder", lossCp: 420 },
    ]);
  });

  it("calls a medium drop a mistake", () => {
    expect(moveQuality(WHITE_E4(cp(20), cp(-150)))).toMatchObject([
      { quality: "mistake", lossCp: 170 },
    ]);
  });

  it("praises a move that keeps the evaluation", () => {
    expect(moveQuality(WHITE_E4(cp(20), cp(10)))).toMatchObject([{ quality: "good" }]);
    expect(moveQuality(WHITE_E4(cp(20), cp(80)))).toMatchObject([{ quality: "good" }]);
  });

  it("says nothing about a small inaccuracy", () => {
    expect(moveQuality(WHITE_E4(cp(20), cp(-60)))).toEqual([]);
  });

  it("judges Black's moves from Black's perspective", () => {
    const black = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    // The score going UP for White is bad for Black.
    const blunder = contextFor(black, "e7", "e5", {
      playerColor: "black",
      evalBefore: cp(-20),
      evalAfter: cp(400),
    });
    expect(moveQuality(blunder)).toMatchObject([{ actor: "you", quality: "blunder" }]);
    const fine = contextFor(black, "e7", "e5", {
      playerColor: "black",
      evalBefore: cp(40),
      evalAfter: cp(-20),
    });
    expect(moveQuality(fine)).toMatchObject([{ quality: "good" }]);
  });

  it("treats walking into a forced mate as a blunder", () => {
    const ctx = WHITE_E4(cp(100), { cpWhite: null, mateIn: -2 });
    expect(moveQuality(ctx)).toMatchObject([{ quality: "blunder", lossCp: 900 }]);
  });

  it("does not call it a mistake when a winning position stays winning", () => {
    const events = moveQuality(WHITE_E4(cp(2000), cp(900)));
    expect(events).toMatchObject([{ quality: "good", lossCp: 0 }]);
  });

  it("does not praise the bot, but does note its slips", () => {
    const black = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const good = contextFor(black, "e7", "e5", { evalBefore: cp(-20), evalAfter: cp(-20) });
    expect(moveQuality(good)).toEqual([]);
    const slip = contextFor(black, "e7", "e5", { evalBefore: cp(-20), evalAfter: cp(500) });
    expect(moveQuality(slip)).toMatchObject([{ actor: "bot", quality: "blunder" }]);
  });

  it("does NOT fire without evaluations", () => {
    expect(moveQuality(contextFor(START_FEN, "e2", "e4"))).toEqual([]);
    expect(moveQuality(WHITE_E4(cp(20), { cpWhite: null, mateIn: null }))).toEqual([]);
  });

  it("does NOT fire when the move ended the game", () => {
    const ctx = contextFor("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8", {
      evalBefore: cp(500),
      evalAfter: { cpWhite: null, mateIn: 0 },
    });
    expect(moveQuality(ctx)).toEqual([]);
  });
});
