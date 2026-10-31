import { describe, expect, it } from "vitest";
import { createGameFromSan } from "@/rules";
import type { Color } from "@/rules";
import type { Condition } from "@/content";
import { evaluateCondition, realSquare } from "./conditions";

const fenAfter = (...san: string[]) => {
  const game = createGameFromSan(san);
  if (!game) throw new Error(`Test setup: ${san.join(" ")} is not legal`);
  return game.fen();
};
const check = (condition: Condition, fen: string, color: Color = "white") => evaluateCondition(condition, fen, color);

describe("realSquare", () => {
  it("keeps squares for White and mirrors them for Black", () => {
    expect(realSquare("e4", "white")).toBe("e4");
    expect(realSquare("e4", "black")).toBe("e5");
    expect(realSquare("g1", "black")).toBe("g8");
    expect(realSquare("c1", "black")).toBe("c8");
  });
});

describe("evaluateCondition", () => {
  const start = fenAfter();

  it("pawnOn: counts my pawns on the squares, mirrored for Black", () => {
    const center: Condition = { type: "pawnOn", squares: ["e4", "d4"] };
    expect(check(center, start)).toBe(false);
    expect(check(center, fenAfter("e4"))).toBe(true);
    expect(check(center, fenAfter("e4"), "black")).toBe(false);
    expect(check(center, fenAfter("e4", "e5"), "black")).toBe(true);
    expect(check({ type: "pawnOn", squares: ["e4", "d4"], min: 2 }, fenAfter("e4", "e5", "d4"))).toBe(true);
    expect(check({ type: "pawnOn", squares: ["e4", "d4"], min: 2 }, fenAfter("e4"))).toBe(false);
  });

  it("pieceOn: looks for a kind of piece on the squares", () => {
    const bishopOnC1: Condition = { type: "pieceOn", piece: "bishop", squares: ["c1"] };
    expect(check(bishopOnC1, start)).toBe(true);
    expect(check(bishopOnC1, fenAfter("d4", "d5", "Bf4"))).toBe(false);
    expect(check(bishopOnC1, start, "black")).toBe(true); // c1 is c8 for Black
    expect(check(bishopOnC1, fenAfter("d4", "d5", "e3", "Bf5"), "black")).toBe(false);
  });

  it("developed: no knight (or bishop) left on a starting square", () => {
    const knights: Condition = { type: "developed", piece: "knight" };
    expect(check(knights, start)).toBe(false);
    expect(check(knights, fenAfter("Nf3"))).toBe(false);
    expect(check(knights, fenAfter("Nf3", "d5", "Nc3"))).toBe(true);
    expect(check(knights, fenAfter("Nf3", "Nf6"), "black")).toBe(false);
    expect(check(knights, fenAfter("Nf3", "Nf6", "Nc3", "Nc6"), "black")).toBe(true);
    const bishops: Condition = { type: "developed", piece: "bishop" };
    expect(check(bishops, fenAfter("e4", "e5", "Bc4"))).toBe(false);
    expect(check(bishops, fenAfter("e4", "e5", "Bc4", "Nf6", "d3", "d6", "Be3"))).toBe(true);
  });

  it("squareEmpty: every square must be free", () => {
    expect(check({ type: "squareEmpty", squares: ["e2"] }, start)).toBe(false);
    expect(check({ type: "squareEmpty", squares: ["e2", "e3"] }, fenAfter("e4"))).toBe(true);
    expect(check({ type: "squareEmpty", squares: ["e2", "d2"] }, fenAfter("e4"))).toBe(false);
    expect(check({ type: "squareEmpty", squares: ["e7"] }, fenAfter("e4", "e5"), "black")).toBe(true);
  });

  it("castled: the king sits on g1 or c1 and has used up the right to castle", () => {
    expect(check({ type: "castled" }, start)).toBe(false);
    const castled = fenAfter("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O");
    expect(check({ type: "castled" }, castled)).toBe(true);
    expect(check({ type: "castled" }, castled, "black")).toBe(false);
    expect(check({ type: "castled" }, fenAfter("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "Nf6", "d3", "O-O"), "black")).toBe(true);
  });

  it("rooksConnected: both rooks on the back row with nothing between", () => {
    expect(check({ type: "rooksConnected" }, start)).toBe(false);
    const setup = fenAfter("e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bc4", "Bc5", "d3", "d6", "Be3", "Be6", "O-O", "O-O");
    expect(check({ type: "rooksConnected" }, setup)).toBe(false); // the queen is still on d1
    const connected = fenAfter("e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bc4", "Bc5", "d3", "d6", "Be3", "Be6", "O-O", "O-O", "Qe2", "Qe7");
    expect(check({ type: "rooksConnected" }, connected)).toBe(true);
    expect(check({ type: "rooksConnected" }, connected, "black")).toBe(true);
  });

  it("all / any combine conditions", () => {
    const fen = fenAfter("e4");
    const yes: Condition = { type: "pawnOn", squares: ["e4"] };
    const no: Condition = { type: "pawnOn", squares: ["d4"] };
    expect(check({ type: "all", of: [yes, no] }, fen)).toBe(false);
    expect(check({ type: "any", of: [yes, no] }, fen)).toBe(true);
    expect(check({ type: "all", of: [yes, yes] }, fen)).toBe(true);
  });
});
