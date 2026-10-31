import { allPieces, kingSquare } from "@/rules";
import type { Color, Square } from "@/rules";
import type { Condition, PlaybookSquare } from "@/content";

// Answers the playbook's declarative conditions. The playbook is written from White's side;
// for Black every square is mirrored (rank 1 <-> 8) so the same data serves both colours.

const HOME: Record<"knight" | "bishop", readonly PlaybookSquare[]> = {
  knight: ["b1", "g1"],
  bishop: ["c1", "f1"],
};

/** A square as written in the playbook, turned into the real square for `color`. */
export function realSquare(square: PlaybookSquare, color: Color): Square {
  return color === "white" ? square : `${square[0]}${9 - Number(square[1])}`;
}

const castlingRights = (fen: string, color: Color): boolean =>
  (color === "white" ? /[KQ]/ : /[kq]/).test(fen.split(" ")[2] ?? "-");

/** Is the condition true in this position, for `color`? */
export function evaluateCondition(condition: Condition, fen: string, color: Color): boolean {
  const real = (squares: readonly PlaybookSquare[]) => squares.map((s) => realSquare(s, color));
  const mine = () => allPieces(fen).filter((p) => p.color === color);

  switch (condition.type) {
    case "pawnOn": {
      const squares = real(condition.squares);
      return mine().filter((p) => p.type === "pawn" && squares.includes(p.square)).length >= (condition.min ?? 1);
    }
    case "pieceOn": {
      const squares = real(condition.squares);
      return (
        mine().filter((p) => p.type === condition.piece && squares.includes(p.square)).length >=
        (condition.min ?? 1)
      );
    }
    case "developed": {
      const home = real(HOME[condition.piece]);
      return !mine().some((p) => p.type === condition.piece && home.includes(p.square));
    }
    case "squareEmpty": {
      const taken = new Set(allPieces(fen).map((p) => p.square));
      return real(condition.squares).every((s) => !taken.has(s));
    }
    case "castled": {
      const king = kingSquare(fen, color);
      return king !== null && real(["g1", "c1"]).includes(king) && !castlingRights(fen, color);
    }
    case "rooksConnected": {
      const backRow = color === "white" ? "1" : "8";
      const rooks = mine().filter((p) => p.type === "rook" && p.square[1] === backRow);
      if (rooks.length < 2) return false;
      const files = rooks.map((r) => "abcdefgh".indexOf(r.square[0])).sort((a, b) => a - b);
      const taken = new Set(allPieces(fen).map((p) => p.square));
      for (let f = files[0] + 1; f < files[files.length - 1]; f++) {
        if (taken.has(`${"abcdefgh"[f]}${backRow}`)) return false;
      }
      return true;
    }
    case "all":
      return condition.of.every((c) => evaluateCondition(c, fen, color));
    case "any":
      return condition.of.some((c) => evaluateCondition(c, fen, color));
  }
}
