import { describe, expect, it } from "vitest";
import {
  allHangingPieces,
  allPieces,
  attackersOf,
  defendersOf,
  hangingInfo,
  kingSquare,
  moveToSan,
  pieceAt,
  pieceValue,
  piecesAttackedBy,
  staticExchange,
} from "./analysis";
import { START_FEN } from "./types";

const squares = (pieces: { square: string }[]) => pieces.map((p) => p.square).sort();

describe("piece values", () => {
  it("uses the classic scale", () => {
    expect(pieceValue("pawn")).toBe(1);
    expect(pieceValue("knight")).toBe(3);
    expect(pieceValue("bishop")).toBe(3);
    expect(pieceValue("rook")).toBe(5);
    expect(pieceValue("queen")).toBe(9);
    expect(pieceValue("king")).toBeGreaterThan(9);
  });
});

describe("looking at the board", () => {
  it("finds pieces and kings", () => {
    expect(pieceAt(START_FEN, "e1")).toEqual({ type: "king", color: "white", square: "e1" });
    expect(pieceAt(START_FEN, "e4")).toBeNull();
    expect(allPieces(START_FEN)).toHaveLength(32);
    expect(kingSquare(START_FEN, "black")).toBe("e8");
  });
});

describe("attackersOf / defendersOf", () => {
  const pawns = "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1";

  it("lists the pieces attacking a square", () => {
    expect(squares(attackersOf(pawns, "d5", "white"))).toEqual(["e4"]);
    expect(squares(attackersOf(pawns, "e4", "black"))).toEqual(["d5"]);
  });

  it("returns nothing when no piece attacks the square", () => {
    expect(attackersOf(pawns, "a5", "white")).toEqual([]);
    expect(attackersOf(START_FEN, "e4", "black")).toEqual([]);
  });

  it("lists cheapest attacker first", () => {
    const fen = "4k3/8/8/3p4/4P3/8/8/3RK3 w - - 0 1";
    expect(attackersOf(fen, "d5", "white").map((p) => p.type)).toEqual(["pawn", "rook"]);
  });

  it("finds defenders of a piece", () => {
    const fen = "4k3/8/8/8/8/2N5/3P4/4K3 w - - 0 1";
    expect(squares(defendersOf(fen, "c3"))).toEqual(["d2"]);
  });

  it("has no defenders for an empty square or an unprotected piece", () => {
    expect(defendersOf(START_FEN, "e4")).toEqual([]);
    expect(defendersOf("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d5")).toEqual([]);
  });
});

describe("piecesAttackedBy", () => {
  it("lists enemy pieces a knight attacks", () => {
    const fen = "4k3/8/8/4p1b1/8/5N2/8/4K3 w - - 0 1";
    expect(squares(piecesAttackedBy(fen, "f3"))).toEqual(["e5", "g5"]);
  });

  it("ignores friendly pieces and empty squares", () => {
    expect(piecesAttackedBy(START_FEN, "g1")).toEqual([]);
    expect(piecesAttackedBy(START_FEN, "e4")).toEqual([]);
  });
});

describe("hangingInfo", () => {
  it("flags an attacked, unprotected piece", () => {
    const fen = "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";
    const info = hangingInfo(fen, "d5");
    expect(info?.reason).toBe("undefended");
    expect(squares(info?.attackers ?? [])).toEqual(["d1"]);
  });

  it("flags a protected piece that a cheaper piece attacks", () => {
    const fen = "3qk3/8/8/3r4/4P3/8/8/4K3 w - - 0 1";
    const info = hangingInfo(fen, "d5");
    expect(info?.reason).toBe("cheaper-attacker");
    expect(squares(info?.defenders ?? [])).toEqual(["d8"]);
  });

  it("does NOT flag a protected piece attacked by an equal piece", () => {
    const fen = "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";
    // White's queen on d1 is attacked by the black queen but the king protects it.
    expect(hangingInfo(fen, "d1")).toBeNull();
  });

  it("does NOT flag a protected pawn attacked by a pawn", () => {
    expect(hangingInfo("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", "d5")).toBeNull();
  });

  it("does NOT flag a piece that nothing attacks", () => {
    expect(hangingInfo("4k3/8/8/3q4/8/8/8/4K3 w - - 0 1", "d5")).toBeNull();
  });

  it("never flags a king", () => {
    expect(hangingInfo("4k3/8/8/8/8/8/4q3/4K3 w - - 0 1", "e1")).toBeNull();
  });

  it("finds nothing hanging at the start", () => {
    expect(allHangingPieces(START_FEN)).toEqual([]);
  });

  it("can list one colour's hanging pieces", () => {
    const fen = "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";
    expect(allHangingPieces(fen, "black")).toHaveLength(1);
    expect(allHangingPieces(fen, "white")).toHaveLength(0);
  });
});

describe("staticExchange", () => {
  it("wins a whole queen when it is undefended", () => {
    expect(staticExchange("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d5", "white")).toBe(9);
  });

  it("is zero for an even pawn trade", () => {
    expect(staticExchange("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", "d5", "white")).toBe(0);
  });

  it("is very negative for a queen taking a protected pawn", () => {
    expect(staticExchange("4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1", "d5", "white")).toBe(-8);
  });

  it("counts extra attackers: a pawn backed up by a rook wins a pawn", () => {
    expect(staticExchange("4k3/8/2p5/3p4/4P3/8/8/3RK3 w - - 0 1", "d5", "white")).toBe(1);
  });

  it("is zero when there is nothing to capture or it is your own piece", () => {
    expect(staticExchange(START_FEN, "e4", "white")).toBe(0);
    expect(staticExchange(START_FEN, "e2", "white")).toBe(0);
  });
});

describe("moveToSan", () => {
  it("gives standard notation", () => {
    expect(moveToSan(START_FEN, "e2", "e4")).toBe("e4");
    expect(moveToSan(START_FEN, "g1", "f3")).toBe("Nf3");
  });

  it("returns null for an illegal move", () => {
    expect(moveToSan(START_FEN, "e2", "e5")).toBeNull();
  });
});
