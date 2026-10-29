import { describe, expect, it } from "vitest";
import type { BoardExercise } from "@/content";
import { escapeMethod, findSolutions, judgeMove } from "./judge";

const base = { prompt: "p", hint: "h", success: "s" };

const pawnToE4: BoardExercise = {
  ...base,
  id: "t-1",
  type: "moveToSquare",
  fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
  from: "e2",
  to: "e4",
};

const promote = (promotion?: "queen" | "knight"): BoardExercise => ({
  ...base,
  id: "t-promo",
  type: "moveToSquare",
  fen: "8/P6k/8/8/8/8/8/K7 w - - 0 1",
  from: "a7",
  to: "a8",
  promotion,
});

describe("judgeMove: moveToSquare", () => {
  it("accepts the goal move", () => {
    const verdict = judgeMove(pawnToE4, { from: "e2", to: "e4" });
    expect(verdict.kind).toBe("correct");
    if (verdict.kind === "correct") expect(verdict.move.san).toBe("e4");
  });

  it("calls a different legal square wrong, naming the goal", () => {
    expect(judgeMove(pawnToE4, { from: "e2", to: "e3" })).toEqual({
      kind: "wrong",
      key: "moveToSquare.wrong-square",
      vars: { piece: "pawn", to: "e4" },
    });
  });

  it("calls a different piece wrong", () => {
    expect(judgeMove(pawnToE4, { from: "e1", to: "d1" })).toEqual({
      kind: "wrong",
      key: "moveToSquare.wrong-piece",
      vars: { piece: "pawn", from: "e2" },
    });
  });

  it("calls a move the piece cannot make illegal, with a reason", () => {
    expect(judgeMove(pawnToE4, { from: "e2", to: "e5" })).toEqual({
      kind: "illegal",
      reason: "wrong-shape",
      vars: { piece: "pawn" },
    });
    expect(judgeMove(pawnToE4, { from: "e2", to: "d3" })).toMatchObject({
      kind: "illegal",
      reason: "pawn-needs-capture",
    });
  });

  it("handles promotion: asks for a piece, then checks it", () => {
    expect(judgeMove(promote(), { from: "a7", to: "a8" })).toEqual({ kind: "needs-promotion" });
    expect(judgeMove(promote("queen"), { from: "a7", to: "a8", promotion: "queen" }).kind).toBe("correct");
    expect(judgeMove(promote("queen"), { from: "a7", to: "a8", promotion: "knight" })).toMatchObject({
      kind: "wrong",
      key: "moveToSquare.wrong-promotion",
      vars: { promotion: "queen" },
    });
    // With no required piece, any choice is fine.
    expect(judgeMove(promote(), { from: "a7", to: "a8", promotion: "knight" }).kind).toBe("correct");
  });
});

describe("judgeMove: captureTarget", () => {
  const ex: BoardExercise = {
    ...base,
    id: "t-cap",
    type: "captureTarget",
    fen: "4k3/8/8/3b4/4P3/8/8/4K3 w - - 0 1",
    target: "d5",
  };

  it("accepts capturing the target", () => {
    expect(judgeMove(ex, { from: "e4", to: "d5" }).kind).toBe("correct");
  });

  it("calls any other legal move wrong, naming the target piece", () => {
    expect(judgeMove(ex, { from: "e4", to: "e5" })).toEqual({
      kind: "wrong",
      key: "captureTarget.not-the-target",
      vars: { target: "d5", targetPiece: "bishop" },
    });
    expect(judgeMove(ex, { from: "e1", to: "e2" })).toMatchObject({ kind: "wrong" });
  });
});

describe("judgeMove: safeSquare", () => {
  // The bishop on a5 attacks the knight. The rook on h4 covers the fourth row, the c6 pawn covers b5 and d5.
  const ex: BoardExercise = {
    ...base,
    id: "t-safe",
    type: "safeSquare",
    fen: "4k3/8/2p5/b7/7r/2N5/8/6K1 w - - 0 1",
    from: "c3",
  };

  it("accepts a square nothing attacks", () => {
    for (const to of ["a2", "b1", "d1", "e2"]) {
      expect(judgeMove(ex, { from: "c3", to }).kind, to).toBe("correct");
    }
  });

  it("explains which piece attacks an unsafe square", () => {
    expect(judgeMove(ex, { from: "c3", to: "a4" })).toEqual({
      kind: "wrong",
      key: "safeSquare.unsafe",
      vars: { piece: "knight", to: "a4", attacker: "rook", attackerSquare: "h4" },
    });
    expect(judgeMove(ex, { from: "c3", to: "b5" })).toMatchObject({
      vars: { attacker: "pawn", attackerSquare: "c6" },
    });
  });

  it("asks for the right piece", () => {
    expect(judgeMove(ex, { from: "g1", to: "g2" })).toMatchObject({
      kind: "wrong",
      key: "safeSquare.wrong-piece",
    });
  });
});

describe("judgeMove: mateInOne", () => {
  // Qg7 is mate. Qg6 is stalemate. Qh1 is check but not mate. Qa1 is blocked by the white king.
  const ex: BoardExercise = {
    ...base,
    id: "t-mate",
    type: "mateInOne",
    fen: "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1",
  };

  it("accepts checkmate", () => {
    expect(judgeMove(ex, { from: "g1", to: "g7" }).kind).toBe("correct");
  });

  it("warns about stalemate in particular", () => {
    expect(judgeMove(ex, { from: "g1", to: "g6" })).toMatchObject({
      kind: "wrong",
      key: "mateInOne.stalemate",
    });
  });

  it("tells check from no check", () => {
    expect(judgeMove(ex, { from: "g1", to: "h1" })).toMatchObject({ key: "mateInOne.check-not-mate" });
    expect(judgeMove(ex, { from: "g1", to: "a1" })).toMatchObject({ key: "mateInOne.not-check" });
  });
});

describe("judgeMove: escapeCheck", () => {
  const anyWay: BoardExercise = {
    ...base,
    id: "t-esc",
    type: "escapeCheck",
    fen: "4k3/8/8/8/8/8/R3r3/4K3 w - - 0 1",
  };

  it("accepts any legal way out when no method is asked for", () => {
    expect(judgeMove(anyWay, { from: "e1", to: "d1" }).kind).toBe("correct");
    expect(judgeMove(anyWay, { from: "a2", to: "e2" }).kind).toBe("correct");
  });

  it("refuses a move that leaves the king in check, and says why", () => {
    expect(judgeMove(anyWay, { from: "a2", to: "a3" })).toMatchObject({
      kind: "illegal",
      reason: "must-escape-check",
    });
  });

  it("insists on the requested way out", () => {
    const capture: BoardExercise = { ...anyWay, method: "capture" } as BoardExercise;
    expect(judgeMove(capture, { from: "a2", to: "e2" }).kind).toBe("correct");
    expect(judgeMove(capture, { from: "e1", to: "e2" }).kind).toBe("correct");
    expect(judgeMove(capture, { from: "e1", to: "d1" })).toMatchObject({
      key: "escapeCheck.need-capture",
    });

    const block: BoardExercise = {
      ...base,
      id: "t-block",
      type: "escapeCheck",
      method: "block",
      fen: "4k3/8/8/8/5B2/8/8/r3K3 w - - 0 1",
    };
    expect(judgeMove(block, { from: "f4", to: "c1" }).kind).toBe("correct");
    expect(judgeMove(block, { from: "e1", to: "e2" })).toMatchObject({ key: "escapeCheck.need-block" });

    const king: BoardExercise = { ...block, method: "move-king" } as BoardExercise;
    expect(judgeMove(king, { from: "e1", to: "e2" }).kind).toBe("correct");
    expect(judgeMove(king, { from: "f4", to: "c1" })).toMatchObject({ key: "escapeCheck.need-move-king" });
  });
});

describe("escapeMethod", () => {
  it("tells the three ways out of check apart", () => {
    const fen = "4k3/8/8/8/8/8/R3r3/4K3 w - - 0 1";
    const moves = (from: string, to: string) => {
      const verdict = judgeMove(
        { ...base, id: "x", type: "escapeCheck", fen } as BoardExercise,
        { from, to },
      );
      if (verdict.kind !== "correct") throw new Error("setup");
      return verdict.move;
    };
    expect(escapeMethod(fen, moves("a2", "e2"))).toBe("capture");
    expect(escapeMethod(fen, moves("e1", "e2"))).toBe("capture");
    expect(escapeMethod(fen, moves("e1", "d1"))).toBe("move-king");
    const blockFen = "4k3/8/8/8/5B2/8/8/r3K3 w - - 0 1";
    const block = judgeMove(
      { ...base, id: "y", type: "escapeCheck", fen: blockFen } as BoardExercise,
      { from: "f4", to: "c1" },
    );
    if (block.kind !== "correct") throw new Error("setup");
    expect(escapeMethod(blockFen, block.move)).toBe("block");
  });
});

describe("findSolutions", () => {
  it("lists every correct move", () => {
    expect(findSolutions(pawnToE4)).toEqual([{ from: "e2", to: "e4", promotion: undefined }]);
  });

  it("lists each promotion piece when any is accepted", () => {
    expect(findSolutions(promote())).toHaveLength(4);
    expect(findSolutions(promote("queen"))).toEqual([{ from: "a7", to: "a8", promotion: "queen" }]);
  });

  it("finds all the ways out of check", () => {
    const ex: BoardExercise = {
      ...base,
      id: "t-esc",
      type: "escapeCheck",
      fen: "4k3/8/8/8/8/8/8/4K2r w - - 0 1",
    };
    expect(findSolutions(ex).map((s) => `${s.from}${s.to}`).sort()).toEqual(["e1d2", "e1e2", "e1f2"]);
  });
});
