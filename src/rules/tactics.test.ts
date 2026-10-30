import { describe, expect, it } from "vitest";
import { staticExchange } from "./analysis";
import {
  canStillCastle,
  doubleAttack,
  isPieceSafe,
  pawnsOn,
  pieceMobility,
  piecesNewlyAttacked,
  undevelopedMinors,
  unsafePieces,
  winnableThreats,
  winningCaptures,
} from "./tactics";
import { START_FEN } from "./types";

describe("staticExchange (x-rays and exact values)", () => {
  it("counts a piece hiding behind the first attacker", () => {
    // White rook d3 with the queen behind it takes the pawn on d5; the black rook defends once.
    // Rxd5 Rxd5 Qxd5: white nets 1 - 5 + 5 = 1. Without the queen joining in it would be -4.
    expect(staticExchange("3rk3/8/8/3p4/8/3R4/8/3QK3 w - - 0 1", "d5", "white")).toBe(1);
  });

  it("is exact when only the king can take back", () => {
    // Rxd8 Kxd8 wins the queen (9) for a rook (5): +4, not the full 9.
    expect(staticExchange("3qk3/8/8/4B3/8/8/8/3RK3 b - - 1 1", "d8", "white")).toBe(4);
  });

  it("does not let a king take a protected piece", () => {
    // The black king cannot take the rook on d8 because the second white rook guards it.
    expect(staticExchange("3rk3/8/8/8/8/8/3R4/3RK3 w - - 0 1", "d8", "white")).toBe(5);
  });
});

describe("isPieceSafe / unsafePieces", () => {
  it("is safe when nothing attacks the piece", () => {
    expect(isPieceSafe(START_FEN, "e2")).toBe(true);
    expect(unsafePieces(START_FEN, "white")).toEqual([]);
  });

  it("is safe when the attacker would lose more than it wins", () => {
    // The rook attacks the knight, but the pawn on c6 takes back.
    expect(isPieceSafe("4k3/8/2p5/3n4/8/8/8/3RK3 w - - 0 1", "d5")).toBe(true);
  });

  it("is NOT safe when a cheaper piece attacks, even if it is defended", () => {
    // Pawn e4 attacks the rook on d5; the queen defends it, but rook for pawn is still a loss.
    const fen = "3qk3/8/8/3r4/4P3/8/8/4K3 b - - 0 1";
    expect(isPieceSafe(fen, "d5")).toBe(false);
    expect(unsafePieces(fen, "black")).toMatchObject([{ piece: { type: "rook", square: "d5" }, gain: 4 }]);
  });

  it("lists the loose piece with its attackers", () => {
    // The black bishop on a5 attacks the unprotected knight on c3.
    expect(unsafePieces("4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1", "white")).toMatchObject([
      { piece: { type: "knight", square: "c3" }, gain: 3, attackers: [{ type: "bishop", square: "a5" }] },
    ]);
  });

  it("calls a king in check not safe", () => {
    expect(isPieceSafe("4k3/8/8/8/8/8/8/4K2r w - - 0 1", "e1")).toBe(false);
  });
});

describe("piecesNewlyAttacked / winnableThreats", () => {
  const before = "4k3/8/8/4r3/8/8/8/2B1K3 w - - 0 1";
  const after = "4k3/8/8/4r3/5B2/8/8/4K3 b - - 1 1";
  const afterBishop = "4k3/8/8/4r3/5B2/8/8/4K3 b - - 1 1";

  it("finds what the moved piece now attacks", () => {
    expect(piecesNewlyAttacked(before, afterBishop, "white", "f4")).toMatchObject([
      { piece: { type: "rook", square: "e5" }, gain: 5, discovered: false },
    ]);
    expect(winnableThreats(before, after, "white", "f4")).toHaveLength(1);
  });

  it("does not report what was already attacked before the move", () => {
    // The rook on e5 was already attacked by the bishop on c3; moving it to d4 changes nothing.
    const fenBefore = "4k3/8/8/4r3/8/2B5/8/4K3 w - - 0 1";
    const fenAfter = "4k3/8/8/4r3/3B4/8/8/4K3 b - - 1 1";
    expect(piecesNewlyAttacked(fenBefore, fenAfter, "white", "d4")).toEqual([]);
  });

  it("finds an attack uncovered when a piece steps out of the way", () => {
    const fenBefore = "3qk3/8/8/8/3B4/8/8/3RK3 w - - 0 1";
    const fenAfter = "3qk3/8/8/4B3/8/8/8/3RK3 b - - 1 1";
    expect(piecesNewlyAttacked(fenBefore, fenAfter, "white", "e5")).toMatchObject([
      { piece: { type: "queen", square: "d8" }, discovered: true, gain: 4 },
    ]);
  });

  it("ignores attacks that are not worth winning", () => {
    // The knight attacks two pawns, but each one is defended: knight for pawn is a loss.
    const fenBefore = "4k3/4p3/3p4/8/8/4N3/8/4K3 w - - 0 1";
    const fenAfter = "4k3/4p3/3p4/5N2/8/8/8/4K3 b - - 1 1";
    expect(piecesNewlyAttacked(fenBefore, fenAfter, "white", "f5").length).toBeGreaterThan(0);
    expect(winnableThreats(fenBefore, fenAfter, "white", "f5")).toEqual([]);
  });
});

describe("doubleAttack", () => {
  it("finds a knight attacking the king and a loose rook", () => {
    const result = doubleAttack(
      "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1",
      "r3k3/2N5/8/8/8/8/8/4K3 b - - 1 1",
      "white",
      "c7",
    );
    expect(result).toMatchObject({ attacker: { type: "knight", square: "c7" }, givesCheck: true });
    expect(result?.targets).toMatchObject([{ type: "rook", square: "a8" }]);
  });

  it("finds a knight attacking two rooks", () => {
    const result = doubleAttack(
      "4k3/8/r1r5/8/8/3N4/8/4K3 w - - 0 1",
      "4k3/8/r1r5/8/1N6/8/8/4K3 b - - 1 1",
      "white",
      "b4",
    );
    expect(result?.targets.map((t) => t.square).sort()).toEqual(["a6", "c6"]);
    expect(result?.givesCheck).toBe(false);
  });

  it("is NOT a double attack when the attacker can simply be captured", () => {
    // The queen on d8 takes the knight on c7, which answers both threats at once.
    expect(
      doubleAttack(
        "r2qk3/8/8/3N4/8/8/8/4K3 w - - 0 1",
        "r2qk3/2N5/8/8/8/8/8/4K3 b - - 1 1",
        "white",
        "c7",
      ),
    ).toBeNull();
  });

  it("is NOT a double attack with only one winnable target", () => {
    expect(
      doubleAttack(
        "4k3/8/8/4r3/8/8/8/2B1K3 w - - 0 1",
        "4k3/8/8/4r3/5B2/8/8/4K3 b - - 1 1",
        "white",
        "f4",
      ),
    ).toBeNull();
  });
});

describe("winningCaptures", () => {
  it("finds an undefended piece the side to move can take", () => {
    expect(winningCaptures("4k3/8/8/4r3/5B2/8/8/K7 w - - 0 1")).toMatchObject([
      { target: { type: "rook", square: "e5" }, attacker: { type: "bishop", square: "f4" }, gain: 5 },
    ]);
  });

  it("is empty when the capture would lose material", () => {
    expect(winningCaptures("4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1")).toEqual([]);
  });

  it("is empty in the starting position", () => {
    expect(winningCaptures(START_FEN)).toEqual([]);
  });

  it("only offers captures that are legal", () => {
    // The white knight is pinned to the king by the rook, so it cannot take the bishop on f4.
    expect(winningCaptures("4k3/8/8/8/5b2/8/4N3/r3K3 w - - 0 1")).toEqual([]);
  });
});

describe("small board questions", () => {
  it("counts the squares a piece attacks", () => {
    expect(pieceMobility("4k3/8/8/8/3R4/8/8/4K3 w - - 0 1", "d4")).toBe(14);
    expect(pieceMobility(START_FEN, "a1")).toBe(2);
  });

  it("finds pieces still at home", () => {
    expect(undevelopedMinors(START_FEN, "white")).toHaveLength(4);
    expect(undevelopedMinors("rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1", "white")).toHaveLength(3);
  });

  it("knows whether castling is still possible", () => {
    expect(canStillCastle(START_FEN, "white")).toBe(true);
    expect(canStillCastle("r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1", "white")).toBe(false);
    expect(canStillCastle("r3k2r/8/8/8/8/8/8/R2K3R w KQkq - 0 1", "white")).toBe(false);
    expect(canStillCastle("r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1", "white")).toBe(false);
    expect(canStillCastle("r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1", "black")).toBe(true);
  });

  it("counts pawns on squares", () => {
    expect(pawnsOn(START_FEN, "white", ["e2", "d2", "e4"])).toBe(2);
  });
});
