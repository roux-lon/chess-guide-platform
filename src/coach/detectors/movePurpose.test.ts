import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { classifyPurpose, movePurpose } from "./movePurpose";

const purposeOf = (fen: string, from: string, to: string, ply = 1) => {
  const ctx = contextFor(fen, from, to, { ply });
  return classifyPurpose(ctx.move, { ply: ctx.ply });
};

describe("classifyPurpose", () => {
  it("castle", () => {
    expect(purposeOf("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1", "g1")).toBe("castle");
  });

  it("develop: a knight leaves its starting square", () => {
    expect(purposeOf(START_FEN, "g1", "f3")).toBe("develop");
  });

  it("develop: a bishop leaves its starting square", () => {
    expect(purposeOf("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "f1", "c4")).toBe("develop");
  });

  it("controlCenter: a pawn steps into the middle", () => {
    expect(purposeOf(START_FEN, "e2", "e4")).toBe("controlCenter");
    expect(purposeOf(START_FEN, "d2", "d4")).toBe("controlCenter");
  });

  it("controlCenter: a rook starts watching the middle early on", () => {
    expect(purposeOf("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a4")).toBe("controlCenter");
  });

  it("capture", () => {
    expect(purposeOf("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d1", "d5")).toBe("capture");
  });

  it("trade: a recapture", () => {
    const first = contextFor("3qk3/8/8/3Q4/8/5B2/8/4K3 b - - 0 1", "d8", "d5");
    const second = contextFor(first.move.fenAfter, "f3", "d5", { previousMove: first.move, ply: 2 });
    expect(classifyPurpose(second.move, { ply: 2, previousMove: first.move })).toBe("trade");
  });

  it("retreat: an attacked piece steps to safety", () => {
    // The bishop on a5 attacks the knight on c3; the knight hops to e4.
    expect(purposeOf("4k3/8/8/b7/8/2N5/8/7K w - - 0 1", "c3", "e4", 30)).toBe("retreat");
  });

  it("retreat: a piece steps back toward its own side", () => {
    expect(purposeOf("4k3/8/8/R7/8/8/8/4K3 w - - 0 1", "a5", "a3", 30)).toBe("retreat");
  });

  it("defend: another piece comes to protect an attacked one", () => {
    // The king steps next to the knight that the bishop attacks.
    expect(purposeOf("4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1", "e1", "d2", 30)).toBe("defend");
  });

  it("attack: a queen move that newly threatens a loose rook", () => {
    expect(purposeOf("4k3/8/8/4r3/8/8/Q7/7K w - - 0 1", "a2", "a1", 30)).toBe("attack");
  });

  it("attack: giving check", () => {
    expect(purposeOf("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8", 30)).toBe("attack");
  });

  it("kingSafety: a plain king move", () => {
    expect(purposeOf("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "e1", "e2", 30)).toBe("kingSafety");
  });

  it("pawnAdvance: a pawn step away from the center", () => {
    expect(purposeOf("4k3/8/8/8/8/8/P7/4K3 w - - 0 1", "a2", "a3", 30)).toBe("pawnAdvance");
  });

  it("improvePiece: a rook that reaches more squares", () => {
    expect(purposeOf("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a3", 30)).toBe("improvePiece");
  });

  it("other: a quiet move that changes nothing", () => {
    expect(purposeOf("4k3/8/8/8/8/R7/8/4K3 w - - 0 1", "a3", "b3", 30)).toBe("other");
  });
});

describe("movePurpose detector", () => {
  it("always says what the move was for, for either side", () => {
    expect(movePurpose(contextFor(START_FEN, "g1", "f3"))).toMatchObject([
      { kind: "move_purpose", actor: "you", purpose: "develop", piece: "knight", perspective: "user", nature: "info" },
    ]);
    const bot = contextFor("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "g8", "f6");
    expect(movePurpose(bot)).toMatchObject([{ actor: "bot", purpose: "develop", perspective: "bot" }]);
  });
});
