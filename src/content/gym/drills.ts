import type { Drill } from "./types";

// The Thinking Gym drills. Positions are FENs; the player is the side to move. Every answer is
// re-checked against the rules layer by features/gym/solve.test.ts, so a wrong answer here fails
// the tests. Routine steps: 1 what did they just do, 2 what is my plan, 3 pick a move, 4 safety check.

// Shared positions (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5, and a few more).
const ITALIAN = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const QUEEN_TAKES = "rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3";
const DRAGON = "rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6";

const SPOT_THREAT: Drill[] = [
  {
    id: "threat-1",
    type: "spotThreat",
    routineStep: 1,
    fen: "rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3",
    threatened: ["e4"],
    explanation:
      "Black's knight on f6 attacks your pawn on e4, and nothing guards it. Always ask what they just did before you decide what to do.",
  },
  {
    id: "threat-2",
    type: "spotThreat",
    routineStep: 1,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    threatened: ["f7"],
    explanation:
      "White's queen on h5 and bishop on c4 both aim at your f7 pawn, and only your king guards it. Two attackers beat one guard, so f7 would fall (with checkmate!). This trap is called Scholar's Mate.",
  },
  {
    id: "threat-3",
    type: "spotThreat",
    routineStep: 1,
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq - 0 4",
    threatened: ["c5"],
    explanation:
      "White's pawn on b4 attacks your bishop on c5. A pawn is worth much less than a bishop, so a pawn attack is always a real threat.",
  },
  {
    id: "threat-4",
    type: "spotThreat",
    routineStep: 1,
    fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    threatened: [],
    explanation:
      "Nothing can be won. The bishop on b5 looks at your knight on c6, but your d7 pawn guards it, so taking would only be an even trade. 'Attacked' is not the same as 'in danger'.",
  },
  {
    id: "threat-5",
    type: "spotThreat",
    routineStep: 1,
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 3 4",
    threatened: [],
    explanation:
      "Nothing can be won. The bishop on g5 attacks your knight on f6, but your queen guards it, so the bishop taking the knight would just be an even trade.",
  },
  {
    id: "threat-6",
    type: "spotThreat",
    routineStep: 1,
    fen: "rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3",
    threatened: ["d5"],
    explanation:
      "White's knight on c3 attacks your queen. A queen is worth far more than a knight, so even if the knight could be taken back later, the queen has to move now.",
  },
  {
    id: "threat-7",
    type: "spotThreat",
    routineStep: 1,
    fen: "r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6",
    threatened: ["g5"],
    explanation:
      "When Black's knight left f6, the black queen on d8 could see all the way to your knight on g5, and nothing of yours guards it. Moving a piece can open a line for the queen behind it.",
  },
  {
    id: "threat-8",
    type: "spotThreat",
    routineStep: 1,
    fen: "rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5",
    threatened: ["f7", "g4"],
    explanation:
      "Two of your pieces are in danger. White's knight on e5 attacks your bishop on g4, which nothing guards, and with the bishop on c4 it also attacks f7. Check every enemy piece, not just the first one you notice.",
  },
];

const IS_IT_SAFE: Drill[] = [
  {
    id: "safe-1",
    type: "isItSafe",
    routineStep: 4,
    fen: ITALIAN,
    move: { from: "f3", to: "e5" },
    safe: false,
    loses: "e5",
    explanation:
      "Nxe5 wins a pawn, but Black's knight on c6 takes your knight and nothing of yours guards e5. You would give a knight for a pawn.",
  },
  {
    id: "safe-2",
    type: "isItSafe",
    routineStep: 4,
    fen: ITALIAN,
    move: { from: "e1", to: "g1" },
    safe: true,
    explanation:
      "Castling is safe: the king goes behind its pawns and nothing of yours can be won afterwards. It is also one of the best habits in the opening.",
  },
  {
    id: "safe-3",
    type: "isItSafe",
    routineStep: 4,
    fen: ITALIAN,
    move: { from: "c4", to: "f7" },
    safe: false,
    loses: "f7",
    explanation:
      "Bxf7+ takes a pawn with check, but the king simply takes your bishop, because nothing of yours guards f7. A bishop is worth three pawns.",
  },
  {
    id: "safe-4",
    type: "isItSafe",
    routineStep: 4,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
    move: { from: "f3", to: "g5" },
    safe: true,
    explanation:
      "None of Black's pieces attack g5, so the knight cannot be taken. A safe square is one where the other side gains nothing by capturing.",
  },
  {
    id: "safe-5",
    type: "isItSafe",
    routineStep: 4,
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w KQkq - 0 4",
    move: { from: "f4", to: "c7" },
    safe: false,
    loses: "c7",
    explanation:
      "Bxc7 grabs a pawn, but the queen takes your bishop right back. A bishop for a pawn is a bad trade.",
  },
  {
    id: "safe-6",
    type: "isItSafe",
    routineStep: 4,
    fen: QUEEN_TAKES,
    move: { from: "b1", to: "c3" },
    safe: true,
    explanation:
      "Nothing of Black's attacks c3, so the knight is safe. It even attacks the queen, so Black has to answer your move.",
  },
  {
    id: "safe-7",
    type: "isItSafe",
    routineStep: 4,
    fen: QUEEN_TAKES,
    move: { from: "f1", to: "c4" },
    safe: false,
    loses: "c4",
    explanation:
      "The queen on d5 attacks c4, and nothing guards your bishop there. It looks active, but the queen just takes it.",
  },
  {
    id: "safe-8",
    type: "isItSafe",
    routineStep: 4,
    fen: DRAGON,
    move: { from: "d4", to: "f5" },
    safe: false,
    loses: "f5",
    explanation:
      "The pawn on g6 attacks f5, so the black pawn takes your knight. A pawn guarded by nothing can still win a knight.",
  },
  {
    id: "safe-9",
    type: "isItSafe",
    routineStep: 4,
    fen: "rnbqkb1r/pppp1ppp/8/4p3/2B1n3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 4",
    move: { from: "c3", to: "e4" },
    safe: true,
    explanation:
      "Nxe4 wins a pawn, and nothing of Black's attacks e4, so the knight stays safe. A free pawn is fine when nothing of yours is left in danger.",
  },
];

const PICK_OF_THREE: Drill[] = [
  {
    id: "pick-1",
    type: "pickOfThree",
    routineStep: 3,
    fen: ITALIAN,
    choices: [
      {
        from: "f3",
        to: "e5",
        feedback: "Black's knight on c6 takes it, and nothing guards your knight. A knight is worth much more than a pawn.",
      },
      {
        from: "e1",
        to: "g1",
        feedback: "Castling puts your king in the corner and brings a rook toward the middle. Nothing of yours can be won.",
      },
      {
        from: "c4",
        to: "f7",
        feedback: "The king takes your bishop on f7 for free, because the bishop has no helper there.",
      },
    ],
    best: 1,
    explanation:
      "Check each move with the safety question: after it, can the bot win any of my pieces? Only castling passes.",
  },
  {
    id: "pick-2",
    type: "pickOfThree",
    routineStep: 3,
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w KQkq - 0 4",
    choices: [
      {
        from: "f4",
        to: "c7",
        feedback: "The queen takes your bishop, and all you got was a pawn.",
      },
      {
        from: "b1",
        to: "c3",
        feedback: "A new piece comes out toward the middle, and nothing of yours can be won.",
      },
      {
        from: "e2",
        to: "e4",
        feedback: "The pawn on d5 takes it, and nothing of yours guards e4, so you just lose a pawn.",
      },
    ],
    best: 1,
    explanation: "Developing a piece safely beats grabbing a pawn that costs a bishop.",
  },
  {
    id: "pick-3",
    type: "pickOfThree",
    routineStep: 3,
    fen: QUEEN_TAKES,
    choices: [
      {
        from: "d1",
        to: "h5",
        feedback: "Black's queen on d5 sees h5 along the rank and takes your queen. Trading queens is fine, but here nothing of yours guards h5.",
      },
      {
        from: "f1",
        to: "c4",
        feedback: "The black queen on d5 takes the bishop, because nothing guards c4.",
      },
      {
        from: "b1",
        to: "c3",
        feedback: "The knight is safe, develops a piece, and attacks the queen so Black has to move it.",
      },
    ],
    best: 2,
    explanation: "Make the move that develops a piece and leaves nothing hanging. Here it also chases the queen.",
  },
  {
    id: "pick-4",
    type: "pickOfThree",
    routineStep: 3,
    fen: "rnbqkb1r/ppp1pppp/8/3p2B1/3Pn3/5N2/PPP1PPPP/RN1QKB1R w KQkq - 2 4",
    choices: [
      {
        from: "g5",
        to: "f4",
        feedback: "The bishop steps out of the knight's attack, stays on a good diagonal, and nothing of yours is left in danger.",
      },
      {
        from: "g5",
        to: "e7",
        feedback: "It wins a pawn, but Black's pieces take your bishop back. A bishop is worth more than a pawn.",
      },
      {
        from: "f3",
        to: "e5",
        feedback: "That knight was guarding your bishop on g5. Move it and the black knight takes the bishop for free.",
      },
    ],
    best: 0,
    explanation: "When your piece is attacked, ask what else the move changes. Moving a guard away can leave another piece hanging.",
  },
  {
    id: "pick-5",
    type: "pickOfThree",
    routineStep: 3,
    fen: "rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4",
    choices: [
      {
        from: "c1",
        to: "g5",
        feedback: "The black queen on d8 attacks g5, and nothing guards your bishop, so it falls for free.",
      },
      {
        from: "g1",
        to: "f3",
        feedback: "A knight comes out toward the middle, and nothing of yours can be won.",
      },
      {
        from: "f1",
        to: "c4",
        feedback: "The pawn on d5 takes your bishop, and nothing of yours guards c4.",
      },
    ],
    best: 1,
    explanation: "Knights first, and always look at what is attacking the square you are moving to.",
  },
  {
    id: "pick-6",
    type: "pickOfThree",
    routineStep: 3,
    fen: "rnbqkb1r/ppp2ppp/4pn2/8/2pP4/4PN2/PP3PPP/RNBQKB1R w KQkq - 0 5",
    choices: [
      {
        from: "f1",
        to: "c4",
        feedback: "You win the pawn back, and your bishop on c4 cannot be taken.",
      },
      {
        from: "e3",
        to: "e4",
        feedback: "The knight on f6 takes the pawn on e4, and nothing of yours guards it.",
      },
      {
        from: "d1",
        to: "b3",
        feedback: "The pawn on c4 takes your queen. Never put a queen where a pawn can take it.",
      },
    ],
    best: 0,
    explanation: "Winning a pawn back is fine when the bishop that does it stays safe.",
  },
  {
    id: "pick-7",
    type: "pickOfThree",
    routineStep: 3,
    fen: "rnbqkb1r/pppp1ppp/8/4p3/2B1n3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 4",
    choices: [
      {
        from: "c4",
        to: "f7",
        feedback: "The king takes the bishop, because nothing of yours guards f7.",
      },
      {
        from: "f2",
        to: "f4",
        feedback: "The pawn on e5 takes it, and nothing of yours guards f4.",
      },
      {
        from: "c3",
        to: "e4",
        feedback: "You win a pawn, and nothing of Black's attacks your knight on e4.",
      },
    ],
    best: 2,
    explanation: "A free pawn is great when the piece that takes it is safe. Check that first.",
  },
  {
    id: "pick-8",
    type: "pickOfThree",
    routineStep: 3,
    fen: DRAGON,
    choices: [
      {
        from: "e4",
        to: "e5",
        feedback: "The d6 pawn takes it, and nothing of yours guards e5.",
      },
      {
        from: "d4",
        to: "c6",
        feedback: "The b7 pawn takes your knight, and nothing of yours guards c6.",
      },
      {
        from: "c1",
        to: "e3",
        feedback: "The bishop comes out to a good square, guards your knight and nothing of yours can be won.",
      },
    ],
    best: 2,
    explanation: "When your pieces are safe and you have no threats to meet, develop the next piece.",
  },
];

const WHATS_THE_PLAN: Drill[] = [
  {
    id: "plan-1",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2",
    plan: "center",
    choices: ["center", "castle", "attack"],
    explanation:
      "No pawn of yours stands in the middle yet. Claim the center first with e4 or d4, because it gives all your pieces room.",
  },
  {
    id: "plan-2",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    plan: "center",
    choices: ["develop", "center", "castle"],
    explanation:
      "White took the middle with a pawn. Answer with a pawn of your own, like ...d5, before you bring out the pieces.",
  },
  {
    id: "plan-3",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    plan: "develop",
    choices: ["develop", "castle", "attack", "center"],
    explanation:
      "You own a center pawn and one knight is out. Keep bringing pieces out: the bishop and the other knight. Castling comes after that.",
  },
  {
    id: "plan-4",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w KQkq - 0 4",
    plan: "develop",
    choices: ["castle", "develop", "attack"],
    explanation:
      "Your center pawn and your bishop are out, but a bishop and a knight are still at home. Finish developing before you castle.",
  },
  {
    id: "plan-5",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "r1bqk2r/ppp2ppp/1bnp1n2/4p3/2B1P3/2NPBN2/PPP2PPP/R2QK2R w KQkq - 2 7",
    plan: "castle",
    choices: ["castle", "develop", "attack"],
    explanation:
      "Every knight and bishop is out and nothing is in danger. The next job is to tuck the king away by castling.",
  },
  {
    id: "plan-6",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 5",
    plan: "defend",
    choices: ["defend", "develop", "attack"],
    explanation:
      "Black's knight attacks your e4 pawn and nothing guards it. Deal with that first, then go back to your plan.",
  },
  {
    id: "plan-7",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    plan: "defend",
    choices: ["develop", "defend", "castle"],
    explanation:
      "White's queen and bishop are aiming at f7. Stop that before anything else, for example with ...Nf6 or ...g6.",
  },
  {
    id: "plan-8",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1",
    plan: "attack",
    choices: ["attack", "castle", "center"],
    explanation: "The black knight on d5 is unguarded and your queen attacks it. Free material comes first: Qxd5.",
  },
  {
    id: "plan-9",
    type: "whatsThePlan",
    routineStep: 2,
    fen: "4k3/8/8/8/R3b3/8/8/4K3 w - - 0 1",
    plan: "attack",
    choices: ["defend", "attack", "develop"],
    explanation: "The bishop on e4 has no guard, and your rook attacks it along the rank. Take it: Rxe4+.",
  },
];

const SPOT_DOUBLE_ATTACK: Drill[] = [
  {
    id: "fork-1",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    solution: { from: "b5", to: "c7" },
    explanation: "The knight jumps to c7 and attacks the king and the rook together. The king must move, and then the knight takes the rook.",
  },
  {
    id: "fork-2",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "4k3/8/8/8/3n4/8/8/R3K3 b - - 0 1",
    solution: { from: "d4", to: "c2" },
    explanation: "The knight lands on c2 and attacks the king and the rook at once. You win the rook for a knight's trip.",
  },
  {
    id: "fork-3",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "1r1q2k1/8/8/8/3N4/4P3/8/4K3 w - - 0 1",
    solution: { from: "d4", to: "c6" },
    explanation: "From c6 the knight attacks the queen and the rook together, and neither can capture it. The queen has to move, so you take the rook.",
  },
  {
    id: "fork-4",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "3q3r/8/8/4N3/8/8/8/k3K3 w - - 0 1",
    solution: { from: "e5", to: "f7" },
    explanation: "A knight on f7 attacks the queen on d8 and the rook on h8. Black can only save one of them.",
  },
  {
    id: "fork-5",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "4k3/8/3n1n2/8/4P3/3P4/8/4K3 w - - 0 1",
    solution: { from: "e4", to: "e5" },
    explanation: "Even a pawn can fork. The pawn on e5 attacks both knights, and a pawn is worth far less than a knight.",
  },
  {
    id: "fork-6",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "4k3/8/2n1n3/8/3P4/4P3/8/4K3 w - - 0 1",
    solution: { from: "d4", to: "d5" },
    explanation: "The pawn on d5 attacks both knights at once. Neither knight can take it, so you win one of them.",
  },
  {
    id: "fork-7",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "3k4/8/8/1n4b1/8/8/8/4R1K1 w - - 0 1",
    solution: { from: "e1", to: "e5" },
    explanation: "The rook on e5 looks left at the knight and right at the bishop. Black cannot guard both, and nothing can capture the rook.",
  },
  {
    id: "fork-8",
    type: "spotDoubleAttack",
    routineStep: 3,
    fen: "r5k1/8/8/8/8/8/8/3QK3 w - - 0 1",
    solution: { from: "d1", to: "d5" },
    explanation: "The queen on d5 gives check and attacks the rook on a8 at the same time. The king has to move, and the queen takes the rook.",
  },
];

export const GYM_DRILLS: Drill[] = [
  ...SPOT_THREAT,
  ...IS_IT_SAFE,
  ...PICK_OF_THREE,
  ...WHATS_THE_PLAN,
  ...SPOT_DOUBLE_ATTACK,
];
