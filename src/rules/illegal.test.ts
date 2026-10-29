import { describe, expect, it } from "vitest";
import { explainIllegalMove } from "./illegal";
import { START_FEN } from "./types";

describe("explainIllegalMove", () => {
  it("returns null for legal moves", () => {
    expect(explainIllegalMove(START_FEN, "e2", "e4")).toBeNull();
    expect(explainIllegalMove(START_FEN, "g1", "f3")).toBeNull();
  });

  it("notices an empty square, the wrong colour, and no move at all", () => {
    expect(explainIllegalMove(START_FEN, "e4", "e5")).toBe("no-piece");
    expect(explainIllegalMove(START_FEN, "e7", "e5")).toBe("not-your-piece");
    expect(explainIllegalMove(START_FEN, "e2", "e2")).toBe("same-square");
  });

  it("says when a piece does not move that way", () => {
    expect(explainIllegalMove(START_FEN, "a1", "b2")).toBe("wrong-shape");
    expect(explainIllegalMove(START_FEN, "b1", "b3")).toBe("wrong-shape");
    expect(explainIllegalMove(START_FEN, "e2", "e5")).toBe("wrong-shape");
    expect(explainIllegalMove(START_FEN, "e2", "f2")).toBe("wrong-shape");
    expect(explainIllegalMove("4k3/8/8/8/8/8/8/2B1K3 w - - 0 1", "c1", "c4")).toBe("wrong-shape");
  });

  it("says when another piece is in the way", () => {
    expect(explainIllegalMove(START_FEN, "a1", "a4")).toBe("blocked");
    expect(explainIllegalMove(START_FEN, "c1", "e3")).toBe("blocked");
    expect(explainIllegalMove(START_FEN, "d1", "d3")).toBe("blocked");
    expect(explainIllegalMove("4k3/8/8/8/4p3/4P3/8/4K3 w - - 0 1", "e3", "e4")).toBe("blocked");
  });

  it("says when the target holds one of your own pieces", () => {
    expect(explainIllegalMove(START_FEN, "a1", "a2")).toBe("own-piece");
    expect(explainIllegalMove(START_FEN, "g1", "e2")).toBe("own-piece");
  });

  it("explains pawn rules", () => {
    expect(explainIllegalMove(START_FEN, "e2", "d3")).toBe("pawn-needs-capture");
    expect(explainIllegalMove("4k3/8/8/8/8/4P3/8/4K3 w - - 0 1", "e3", "e5")).toBe("wrong-shape");
    expect(explainIllegalMove("4k3/8/8/8/8/4P3/8/4K3 w - - 0 1", "e3", "d3")).toBe("wrong-shape");
  });

  it("still allows a pawn to capture diagonally and en passant", () => {
    expect(explainIllegalMove("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", "e4", "d5")).toBeNull();
    expect(explainIllegalMove("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", "e5", "d6")).toBeNull();
  });

  it("explains castling that is not allowed", () => {
    expect(explainIllegalMove("4k3/8/8/8/8/8/8/4K2R w - - 0 1", "e1", "g1")).toBe("castle-not-allowed");
  });

  it("tells a player in check that the move must fix it", () => {
    const inCheck = "4k3/8/8/8/8/8/R7/4K2r w - - 0 1";
    expect(explainIllegalMove(inCheck, "a2", "a3")).toBe("must-escape-check");
    expect(explainIllegalMove(inCheck, "e1", "f1")).toBe("must-escape-check");
    expect(explainIllegalMove(inCheck, "e1", "e2")).toBeNull();
  });

  it("tells a player that moving a pinned piece exposes the king", () => {
    expect(explainIllegalMove("4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1", "e2", "c3")).toBe("exposes-king");
  });

  it("does not let the king step next to the other king", () => {
    expect(explainIllegalMove("8/8/8/8/8/3k4/8/3K4 w - - 0 1", "d1", "d2")).toBe("exposes-king");
  });
});
