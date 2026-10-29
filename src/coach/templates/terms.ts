// One short, friendly explanation per chess word. The narrator adds one the first time
// a comment uses the word, then remembers it so it is not repeated.

export type TermId =
  | "check"
  | "checkmate"
  | "stalemate"
  | "hanging"
  | "trade"
  | "piece_value"
  | "center"
  | "development"
  | "castling"
  | "promotion"
  | "mistake"
  | "blunder";

export const TERMS: Record<TermId, string> = {
  check: "(\"Check\" means a king is under attack. The player must fix it right away.)",
  checkmate: "(\"Checkmate\" means a king is attacked and cannot escape. It ends the game.)",
  stalemate:
    "(\"Stalemate\" means a player has no legal move but their king is not attacked. It is a draw.)",
  hanging: "(A piece is \"hanging\" when it can be captured for free.)",
  trade:
    "(A \"trade\" is when both sides capture a piece, one after the other. Even trades are fine.)",
  piece_value:
    "(Pieces have rough point values: pawn 1, knight 3, bishop 3, rook 5, queen 9. Giving up more points than you win is a bad trade.)",
  center: "(The \"center\" is the four middle squares: d4, e4, d5 and e5. Pieces there are strong.)",
  development:
    "(\"Developing\" means moving your knights and bishops off their starting squares so they can join the game.)",
  castling:
    "(\"Castling\" is a special move: the king hops two squares and the rook jumps over it. It keeps your king safe.)",
  promotion:
    "(\"Promotion\" happens when a pawn reaches the far side of the board: it turns into a stronger piece.)",
  mistake: "(A \"mistake\" is a move that gives the other side an advantage.)",
  blunder: "(A \"blunder\" is a really big mistake, like leaving a piece to be captured for free.)",
};
