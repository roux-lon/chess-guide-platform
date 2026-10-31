import type { Lesson } from "../types";

// Stage 3, continued: four short lessons that go with opening practice (the playbook in
// content/playbook/). They come right after "Opening principles".

export const OPENING_LESSONS: Lesson[] = [
  {
    id: "opening-center",
    stage: 3,
    title: "Claim the center",
    summary: "The first goal of the opening, for White and for Black.",
    icon: "🎯",
    body: [
      { type: "heading", text: "Why the middle matters" },
      {
        type: "paragraph",
        text: "The four squares in the middle of the board (d4, e4, d5, e5) are the **center**. A pawn there takes space away from the other side, and it opens paths for your bishops and queen.",
      },
      {
        type: "diagram",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        caption: "Both sides have a pawn in the center.",
        highlights: [
          { square: "e4", kind: "good" },
          { square: "e5", kind: "good" },
        ],
      },
      {
        type: "paragraph",
        text: "If you play **Black**, a good rule is to answer in kind: after White plays e4 you play e5, and after White plays d4 you play d5.",
      },
    ],
    exercises: [
      {
        id: "opening-center-1",
        type: "moveToSquare",
        prompt: "You are Black. White played e4. Answer in kind: move your e pawn two squares, to e5.",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        from: "e7",
        to: "e5",
        hint: "Your e pawn is in front of your king. Two steps forward.",
        success: "Now you have a pawn in the center too.",
      },
      {
        id: "opening-center-2",
        type: "moveToSquare",
        prompt: "You are Black. White played d4. Answer in kind: move your d pawn two squares, to d5.",
        fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
        from: "d7",
        to: "d5",
        hint: "Your d pawn is in front of your queen.",
        success: "An equal share of the middle.",
      },
      {
        id: "opening-center-3",
        type: "moveToSquare",
        prompt: "You are White and it is the first move. Claim the center with your d pawn: move it to d4.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        from: "d2",
        to: "d4",
        hint: "The d pawn stands in front of your queen. Two steps forward.",
        success: "A pawn in the center, and a road for your bishop and queen.",
      },
      {
        id: "opening-center-4",
        type: "quiz",
        prompt: "Why do we want a pawn in the center?",
        choices: [
          { text: "It takes space and opens paths for our pieces" },
          {
            text: "Pawns in the center can never be captured",
            feedback: "They can be captured like any other pawn. The point is the space they take.",
          },
        ],
        correct: 0,
        hint: "Think about what the pawn does for the pieces behind it.",
        success: "Yes: space for you, less room for the bot.",
      },
    ],
  },

  {
    id: "opening-knights",
    stage: 3,
    title: "Develop the right knight",
    summary: "Which knight to bring out, and where.",
    icon: "🐴",
    body: [
      { type: "heading", text: "Knights first" },
      {
        type: "paragraph",
        text: "A knight on the edge controls very few squares. A knight near the middle controls many. So bring your knights out toward the center, usually before your bishops.",
      },
      {
        type: "paragraph",
        text: "Also ask: **does this move protect something?** If your pawn is attacked, the best knight move is often one that guards it.",
      },
    ],
    exercises: [
      {
        id: "opening-knights-1",
        type: "moveToSquare",
        prompt: "Develop your queen's knight toward the center: move it from b1 to c3.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        from: "b1",
        to: "c3",
        hint: "The knight on b1 jumps over the pawn in front of it.",
        success: "Out and aiming at the center.",
      },
      {
        id: "opening-knights-2",
        type: "quiz",
        prompt: "Which knight move is better here?",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        choices: [
          { text: "Nc3, toward the center" },
          { text: "Na3, to the edge", feedback: "On the edge the knight controls very few squares. Aim for the middle instead." },
        ],
        correct: 0,
        hint: "Which square is closer to the middle?",
        success: "Yes. A knight in the middle does much more.",
      },
      {
        id: "opening-knights-3",
        type: "moveToSquare",
        prompt: "You are Black. White's knight attacks your e5 pawn. Develop the knight that guards it: b8 to c6.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        from: "b8",
        to: "c6",
        hint: "Which square lets a knight protect the pawn on e5?",
        success: "A developing move that also protects. Two jobs in one.",
      },
      {
        id: "opening-knights-4",
        type: "quiz",
        prompt: "Which pieces usually come out first?",
        choices: [
          { text: "Knights, then bishops" },
          { text: "The queen, so she can attack early", feedback: "An early queen gets chased by smaller pieces. Bring her out later." },
        ],
        correct: 0,
        hint: "Remember: knights are weak on the edge and strong near the middle.",
        success: "Knights, then bishops, then castle.",
      },
    ],
  },

  {
    id: "opening-castling",
    stage: 3,
    title: "Which move castles?",
    summary: "Spot when you can castle, and do it.",
    icon: "🏰",
    body: [
      { type: "heading", text: "Castling in the opening" },
      {
        type: "paragraph",
        text: "Castling puts your king in the corner and a rook next to it. You can only castle when **the squares between the king and the rook are empty**. That is why we bring out the knight and bishop first.",
      },
      {
        type: "paragraph",
        text: "To castle, drag the king two squares toward the rook you want to use. The rook jumps to the other side of the king by itself.",
      },
    ],
    exercises: [
      {
        id: "opening-castling-1",
        type: "moveToSquare",
        prompt: "You are Black. The knight and the bishop are out of the way, so castle: move your king two squares toward the h8 rook.",
        fen: "r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 6",
        from: "e8",
        to: "g8",
        hint: "The king goes from e8 to g8.",
        success: "Castled! The king is safe and the rook is awake.",
      },
      {
        id: "opening-castling-2",
        type: "quiz",
        prompt: "Can White castle right now?",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        choices: [
          { text: "No, other pieces are in the way" },
          { text: "Yes, the king and rook are home", feedback: "They are home, but the bishop and knight stand between them. Move those first." },
        ],
        correct: 0,
        hint: "Look at the squares between the king and the rook.",
        success: "Right. Develop the pieces, then castle.",
      },
      {
        id: "opening-castling-3",
        type: "quiz",
        prompt: "What does castling do for you?",
        choices: [
          { text: "It tucks the king into the corner and brings a rook toward the middle" },
          { text: "It lets the king capture pieces from far away", feedback: "Castling only moves the king and a rook. It is about safety." },
        ],
        correct: 0,
        hint: "Two jobs with one move.",
        success: "Safety and a better rook in one move.",
      },
      {
        id: "opening-castling-4",
        type: "moveToSquare",
        prompt: "You are White. Everything between your king and the h1 rook is empty. Castle!",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 6",
        from: "e1",
        to: "g1",
        hint: "The king goes from e1 to g1.",
        success: "Castled. One goal ticked off the checklist.",
      },
    ],
  },

  {
    id: "opening-slips",
    stage: 3,
    title: "Spot the move that breaks the plan",
    summary: "Notice the opening moves that waste time or take a risk.",
    icon: "🔍",
    body: [
      { type: "heading", text: "A few opening habits" },
      {
        type: "list",
        items: [
          "**One move per piece** at first. Give every piece a good square before you move one twice.",
          "**Keep the queen home** early. A queen that comes out can be chased by developing moves.",
          "**Edge pawns can wait.** A pawn on the a or h file does little for the center or your pieces.",
          "**Safety first.** If one of your pieces is in danger, deal with that before following any plan.",
        ],
      },
    ],
    exercises: [
      {
        id: "opening-slips-1",
        type: "quiz",
        prompt: "Which of these helps the opening plan the most?",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        choices: [
          { text: "Nc3, developing the other knight" },
          { text: "a3, an edge pawn move", feedback: "Edge pawn moves do very little right now. Bring a piece out instead." },
          { text: "Qe2, an early queen move", feedback: "The knights and bishops still need to come out first." },
        ],
        correct: 0,
        hint: "Which move brings a new piece into the game?",
        success: "Yes. A new piece joins the game.",
      },
      {
        id: "opening-slips-2",
        type: "quiz",
        prompt: "White played Nf3 and then Ng5 with the same knight, while the other pieces are still home. What is the problem?",
        choices: [
          { text: "The same piece moved twice while others are not out yet" },
          { text: "Knights are not allowed to move twice", feedback: "It is allowed. It just wastes time while your other pieces wait at home." },
        ],
        correct: 0,
        hint: "Count how many pieces still sit on their starting squares.",
        success: "Spread the moves around: every piece gets one good move first.",
      },
      {
        id: "opening-slips-3",
        type: "quiz",
        prompt: "Why is bringing the queen out on move 2 risky?",
        choices: [
          { text: "The bot can chase her with a developing move, and you lose time" },
          { text: "The queen cannot move that early", feedback: "She can move, it just is not wise yet." },
        ],
        correct: 0,
        hint: "Smaller pieces can attack a queen and she has to run.",
        success: "Right: other pieces first, queen later.",
      },
      {
        id: "opening-slips-4",
        type: "safeSquare",
        prompt: "Safety first! A black pawn attacks your knight. Move it to a square where it cannot be captured.",
        fen: "rnbqkbnr/p1pppppp/8/8/1p2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3",
        from: "c3",
        hint: "The pawn on b4 attacks a3 and c3. Choose a square nobody attacks.",
        success: "Safe. Deal with danger first, then go back to the plan.",
      },
    ],
  },
];
