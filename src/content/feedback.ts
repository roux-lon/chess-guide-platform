// Gentle explanations for answers that are not right. Placeholders look like {piece}.
// A wrong answer never just says "wrong": it says why, and what to look at next.

import type { PieceName } from "./types";

/** Why a move is not allowed. Matches IllegalReason in rules/illegal.ts. */
export type IllegalKey =
  | "no-piece"
  | "not-your-piece"
  | "same-square"
  | "wrong-shape"
  | "blocked"
  | "own-piece"
  | "pawn-needs-capture"
  | "castle-not-allowed"
  | "must-escape-check"
  | "exposes-king";

export const PIECE_RULES: Record<PieceName, string> = {
  pawn: "A pawn walks straight forward one square (two on its first move) and captures one square diagonally forward.",
  knight: "A knight jumps in an L-shape: two squares one way, then one square to the side.",
  bishop: "A bishop slides diagonally, as far as it likes.",
  rook: "A rook slides in straight lines: up, down, left or right.",
  queen: "A queen slides in any straight line or diagonal, as far as she likes.",
  king: "A king steps one square in any direction.",
};

export const ILLEGAL_FEEDBACK: Record<IllegalKey, string> = {
  "no-piece": "There is no piece on that square. Pick one of your pieces first, then choose where it goes.",
  "not-your-piece": "That piece belongs to the other side. Move one of your own pieces.",
  "same-square": "A move has to end on a different square. Try dropping the piece somewhere else.",
  "wrong-shape": "A {piece} cannot move like that. {rule}",
  blocked: "Something is standing in the way. Only a knight can jump over other pieces.",
  "own-piece": "You cannot land on your own piece. Pick an empty square, or an enemy piece to capture.",
  "pawn-needs-capture": "A pawn only moves diagonally when it captures something, and there is nothing to capture there.",
  "castle-not-allowed": "A king only hops two squares when it castles, and castling is not possible in this position.",
  "must-escape-check": "Your king is in check! The only moves allowed are ones that get the king out of check.",
  "exposes-king": "That move would leave your king under attack, and that is never allowed.",
};

/** Keys for moves that are allowed but are not the answer to this exercise. */
export type WrongKey =
  | "moveToSquare.wrong-piece"
  | "moveToSquare.wrong-square"
  | "moveToSquare.wrong-promotion"
  | "captureTarget.not-the-target"
  | "safeSquare.wrong-piece"
  | "safeSquare.unsafe"
  | "mateInOne.not-check"
  | "mateInOne.check-not-mate"
  | "mateInOne.stalemate"
  | "escapeCheck.need-move-king"
  | "escapeCheck.need-capture"
  | "escapeCheck.need-block";

export const WRONG_FEEDBACK: Record<WrongKey, string> = {
  "moveToSquare.wrong-piece": "Not that piece this time. Move the {piece} on {from}.",
  "moveToSquare.wrong-square":
    "That is an allowed move, but the goal is {to}. Your {piece} can get there. Try again!",
  "moveToSquare.wrong-promotion": "Almost! This time turn the pawn into a {promotion}.",
  "captureTarget.not-the-target":
    "That move is allowed, but it does not capture the {targetPiece} on {target}. Which of your pieces can take it?",
  "safeSquare.wrong-piece": "Not that piece this time. Move the {piece} on {from}.",
  "safeSquare.unsafe":
    "On {to} your {piece} could be captured by the {attacker} on {attackerSquare}. Look for a square that nothing attacks.",
  "mateInOne.not-check":
    "That does not even attack the king, so it cannot be checkmate. Look for a move that attacks the king.",
  "mateInOne.check-not-mate":
    "That is check, but the king still has a way out. Look for a check where the king has nowhere to go.",
  "mateInOne.stalemate":
    "Careful! The other king is not attacked and has no move. That is a stalemate, and it is a draw, not a win. Find the checkmate instead.",
  "escapeCheck.need-move-king": "That gets out of check, but this time move the king itself.",
  "escapeCheck.need-capture":
    "That gets out of check, but this time capture the piece that is giving check.",
  "escapeCheck.need-block":
    "That gets out of check, but this time block: put one of your pieces between the attacker and your king.",
};

/** Used when a wrong quiz answer has no feedback of its own. */
export const QUIZ_WRONG_FALLBACK = "Not quite. Have another look and try a different answer.";

/** Used when an exercise has no hint of its own. */
export const GENERIC_HINT = "Take your time and look at every piece. What does the goal ask for?";

/** Said when the second hint shows the answer arrow. */
export const SHOW_ANSWER_TEXT = "Here is the move, shown with the arrow. Try it yourself!";
