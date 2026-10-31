import type { Playbook } from "./types";

// The goals, in priority order. Squares are from White's side (mirrored for Black), see types.ts.

const QUEEN_STEPS_OFF = "The queen steps off the back row, so the rooks can see each other.";
const LAST_PIECE_OUT = "The last piece on the back row steps out of the way.";

export const PLAYBOOK: Playbook = {
  maxMoves: 12,

  goals: [
    {
      id: "center",
      label: "Center",
      title: "Claim the center",
      why: "The four middle squares let your pieces reach both sides of the board. A pawn there also takes space away from the bot.",
      done: { type: "pawnOn", squares: ["e4", "d4"] },
      doneText: "You have a pawn in the center.",
      candidates: [
        { from: "e2", to: "e4", reason: "It takes the middle and opens a path for your bishop and queen." },
        { from: "d2", to: "d4", reason: "It takes the middle and opens a path for your other bishop and queen." },
        { from: "c2", to: "c4", reason: "It pushes at the middle from the side." },
      ],
    },
    {
      id: "knights",
      label: "Knights",
      title: "Bring out the knights",
      why: "Knights are weak on the edge and strong near the middle. Bring them out before the bishops.",
      done: { type: "developed", piece: "knight" },
      doneText: "Both knights are out.",
      candidates: [
        { from: "g1", to: "f3", reason: "It heads to the center, guards the middle, and clears the way to castle." },
        { from: "b1", to: "c3", reason: "It heads to the center and adds a guard to the middle squares." },
      ],
    },
    {
      id: "bishops",
      label: "Bishops",
      title: "Open the bishops",
      why: "Bishops need open diagonals (diagonal lines of free squares). Free them with a pawn move, then put them on active squares.",
      done: { type: "developed", piece: "bishop" },
      doneText: "Both bishops are out.",
      candidates: [
        {
          from: "f1",
          to: "c4",
          when: { type: "squareEmpty", squares: ["e2"] },
          reason: "It looks at the center and the far side of the board.",
        },
        {
          from: "f1",
          to: "e2",
          when: { type: "squareEmpty", squares: ["e2"] },
          reason: "It is safe, and it clears the squares between your king and rook so you can castle.",
        },
        {
          from: "d2",
          to: "d3",
          when: { type: "pieceOn", piece: "bishop", squares: ["c1"] },
          reason: "It opens the road for your other bishop and guards the center pawn.",
        },
        {
          from: "d2",
          to: "d4",
          when: { type: "pieceOn", piece: "bishop", squares: ["c1"] },
          reason: "It opens the road for your other bishop and fights for the center.",
        },
        {
          from: "e2",
          to: "e3",
          when: { type: "pieceOn", piece: "bishop", squares: ["f1"] },
          reason: "It opens the road for your other bishop.",
        },
        {
          from: "c1",
          to: "e3",
          when: { type: "squareEmpty", squares: ["d2"] },
          reason: "It guards the center and keeps the bishop safe.",
        },
        {
          from: "c1",
          to: "g5",
          when: { type: "squareEmpty", squares: ["d2"] },
          reason: "It reaches out to the far side of the board.",
        },
      ],
    },
    {
      id: "castle",
      label: "Castle",
      title: "Castle to keep your king safe",
      why: "Castling tucks your king into the corner behind pawns, and brings a rook toward the middle. It is the one move that does two jobs.",
      done: { type: "castled" },
      doneText: "Your king is castled and safe.",
      candidates: [
        { from: "e1", to: "g1", reason: "The king hides behind its pawns and the rook comes out." },
        { from: "e1", to: "c1", reason: "The king hides on the other side and the rook comes out." },
      ],
    },
    {
      id: "rooks",
      label: "Connect rooks",
      title: "Connect your rooks",
      why: "When nothing stands between your rooks they guard each other. It also tells you that your development is finished.",
      done: { type: "rooksConnected" },
      doneText: "Your rooks are connected. Your setup is complete!",
      candidates: [
        { from: "d1", to: "e2", when: { type: "squareEmpty", squares: ["e2"] }, reason: QUEEN_STEPS_OFF },
        { from: "d1", to: "d2", when: { type: "squareEmpty", squares: ["d2"] }, reason: QUEEN_STEPS_OFF },
        { from: "d1", to: "d3", when: { type: "squareEmpty", squares: ["d2", "d3"] }, reason: QUEEN_STEPS_OFF },
        { from: "c1", to: "d2", when: { type: "squareEmpty", squares: ["d2"] }, reason: LAST_PIECE_OUT },
        { from: "c1", to: "e3", when: { type: "squareEmpty", squares: ["d2"] }, reason: LAST_PIECE_OUT },
        { from: "b1", to: "d2", when: { type: "squareEmpty", squares: ["d2"] }, reason: LAST_PIECE_OUT },
      ],
    },
  ],

  cautions: [
    {
      id: "same-piece-twice",
      rule: "same-piece-twice",
      title: "One move per piece",
      text: "You moved the same piece again while other pieces are still at home. In the opening, give each piece one good move first.",
    },
    {
      id: "early-queen",
      rule: "early-queen",
      title: "Keep the queen home for now",
      text: "Bringing the queen out early gives the bot a target: it can chase her with a developing move. Bring out knights and bishops first.",
    },
    {
      id: "edge-pawn",
      rule: "edge-pawn",
      title: "Edge pawns can wait",
      text: "A pawn on the edge of the board does not help the center or your pieces. It is better to spend the move on something that does.",
    },
    {
      id: "early-f-pawn",
      rule: "early-f-pawn",
      title: "Careful with the f-pawn",
      text: "The f-pawn guards your king. Moving it early leaves holes next to your king.",
    },
  ],

  blackReplies: [
    {
      whiteMove: { from: "e2", to: "e4" },
      reply: { from: "e7", to: "e5" },
      reason: "Answer in kind: your own pawn takes an equal share of the middle.",
    },
    {
      whiteMove: { from: "d2", to: "d4" },
      reply: { from: "d7", to: "d5" },
      reason: "Answer in kind: your own pawn takes an equal share of the middle.",
    },
  ],

  blackOwnWay: {
    text: "White started differently, so claim the center your own way with a pawn.",
    candidates: [
      { from: "e7", to: "e5" },
      { from: "d7", to: "d5" },
      { from: "c7", to: "c5" },
      { from: "e7", to: "e6" },
      { from: "d7", to: "d6" },
    ],
  },
};
