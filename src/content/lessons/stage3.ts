import type { Lesson } from "../types";

// Stage 3: thinking ahead. Shorter than the first two stages on purpose.

export const STAGE_3_LESSONS: Lesson[] = [
  {
    id: "whats-the-threat",
    stage: 3,
    title: "What is my opponent threatening?",
    summary: "The one question to ask before every move.",
    icon: "?",
    body: [
      { type: "heading", text: "Look before you move" },
      {
        type: "paragraph",
        text: "Before every move, ask yourself: **what is my opponent threatening?** A **threat** is when the other side could capture one of your pieces on their next turn.",
      },
      {
        type: "diagram",
        fen: "4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1",
        caption: "The black bishop on a5 attacks the white knight on c3.",
        arrows: [{ from: "a5", to: "c3", color: "red" }],
      },
      {
        type: "paragraph",
        text: "When one of your pieces is attacked, you can usually **move it away**, **capture the attacker**, or **protect it**. You will learn about protecting in the next lesson.",
      },
    ],
    exercises: [
      {
        id: "whats-the-threat-1",
        type: "quiz",
        prompt: "Which white piece is the black bishop on a5 attacking?",
        fen: "4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1",
        highlights: [{ square: "a5", kind: "info" }],
        choices: [
          { text: "The knight on c3" },
          { text: "The king on e1", feedback: "The knight stands in the way, so the bishop cannot reach the king." },
          { text: "Nothing", feedback: "Follow the diagonal from a5 down and to the right. What does it hit first?" },
        ],
        correct: 0,
        hint: "Follow the bishop's diagonal and see what it hits first.",
        success: "Yes, the bishop attacks the knight.",
      },
      {
        id: "whats-the-threat-2",
        type: "safeSquare",
        prompt: "Your knight is attacked! Move it to a square where it cannot be captured.",
        fen: "4k3/8/2p5/b7/7r/2N5/8/6K1 w - - 0 1",
        from: "c3",
        hint: "The black rook attacks the whole fourth row, and the black pawn attacks b5 and d5. Choose a square none of them reach.",
        success: "Safe! The knight escaped the threat.",
      },
      {
        id: "whats-the-threat-3",
        type: "captureTarget",
        prompt: "The black rook attacks your rook! Don't run away: capture it instead.",
        fen: "4k3/8/8/8/r6R/8/8/7K w - - 0 1",
        target: "a4",
        hint: "Both rooks attack each other along the fourth row. It is your move first!",
        success: "Captured the attacker. Sometimes the best defense is a capture.",
      },
      {
        id: "whats-the-threat-4",
        type: "quiz",
        prompt: "Why should you check your opponent's threats before every move?",
        choices: [
          { text: "So you do not lose a piece by accident" },
          { text: "It is a rule of the game", feedback: "It is not a rule, just very good advice." },
        ],
        correct: 0,
        hint: "Think about what a threat can lead to.",
        success: "Yes. A quick look at threats saves many pieces.",
      },
    ],
  },

  {
    id: "dont-hang-pieces",
    stage: 3,
    title: "Don't hang your pieces",
    summary: "Keep your pieces safe and protected.",
    icon: "🪢",
    body: [
      { type: "heading", text: "Hanging pieces" },
      {
        type: "paragraph",
        text: "A piece is **hanging** when the other side can capture it for free. This is the most common way beginners lose games, so build a good habit: after you decide on a move, check that your piece is not left hanging.",
      },
      {
        type: "paragraph",
        text: "A piece is **protected** when one of your other pieces could capture back if it gets taken. A protected piece is usually safe from trades that are not worth it for the other side.",
      },
      {
        type: "diagram",
        fen: "4k2r/8/8/3p4/4B3/8/8/6K1 w - - 0 1",
        caption: "The black pawn attacks the bishop, and nothing protects it. It is hanging!",
        arrows: [{ from: "d5", to: "e4", color: "red" }],
      },
      {
        type: "paragraph",
        text: "The other side of the coin: look for **their** hanging pieces and capture them for free!",
      },
    ],
    exercises: [
      {
        id: "dont-hang-pieces-1",
        type: "quiz",
        prompt: "Is the white bishop on e4 safe?",
        fen: "4k2r/8/8/3p4/4B3/8/8/6K1 w - - 0 1",
        highlights: [{ square: "e4", kind: "info" }],
        choices: [
          { text: "No: the pawn can capture it, and nothing protects it" },
          { text: "Yes, it is a strong piece", feedback: "The black pawn on d5 attacks e4, and a pawn is worth much less than a bishop. Nothing protects it." },
        ],
        correct: 0,
        hint: "Pawns capture diagonally forward. Which squares does the black pawn attack?",
        success: "Right. The bishop is hanging.",
      },
      {
        id: "dont-hang-pieces-2",
        type: "safeSquare",
        prompt: "Save your bishop! Move it to a square where it cannot be captured.",
        fen: "4k2r/8/8/3p4/4B3/8/8/6K1 w - - 0 1",
        from: "e4",
        hint: "The black rook attacks the whole h column. Avoid squares the pawn or rook can reach.",
        success: "Safe and sound.",
      },
      {
        id: "dont-hang-pieces-3",
        type: "captureTarget",
        prompt: "Black left the queen hanging! Capture it with your rook.",
        fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1",
        target: "d5",
        hint: "Your rook and the queen face each other on the d column.",
        success: "You won the queen for free!",
      },
      {
        id: "dont-hang-pieces-4",
        type: "quiz",
        prompt: "What does it mean for a piece to be protected?",
        choices: [
          { text: "If the enemy captures it, one of your pieces can capture back" },
          { text: "It cannot move", feedback: "Protected pieces can still move. Protection just means you can capture back." },
          { text: "It is next to the king", feedback: "Protection is about being able to recapture, not about where the piece stands." },
        ],
        correct: 0,
        hint: "Think about what happens after a capture.",
        success: "Yes, you could take back.",
      },
    ],
  },

  {
    id: "trading-fairly",
    stage: 3,
    title: "Trading fairly",
    summary: "Use piece values to win more than you lose.",
    icon: "⇄",
    body: [
      { type: "heading", text: "Is this trade good?" },
      {
        type: "paragraph",
        text: "Remember the point values: pawn 1, knight 3, bishop 3, rook 5, queen 9. Before you capture, count what you win and what you might lose in return.",
      },
      {
        type: "list",
        items: [
          "Win **more** than you lose: a good trade.",
          "Win the **same** as you lose: an even trade. Fine, especially if you are ahead.",
          "Win **less** than you lose: a bad trade. Avoid it!",
        ],
      },
      {
        type: "paragraph",
        text: "Capturing a piece that is protected can still be a great idea if the piece you capture with is worth less. A pawn capturing a queen is wonderful, even if the pawn gets taken afterwards.",
      },
    ],
    exercises: [
      {
        id: "trading-fairly-1",
        type: "quiz",
        prompt: "You capture a rook (5 points) with your bishop (3 points), and then your bishop is captured. How did the trade go?",
        choices: [
          { text: "Good: you won 5 points and lost 3" },
          { text: "Bad: you lost your bishop", feedback: "You lost 3 points but won 5, so you came out 2 points ahead." },
        ],
        correct: 0,
        hint: "Compare what you won with what you lost.",
        success: "Yes, 5 minus 3 means you are 2 points ahead.",
      },
      {
        id: "trading-fairly-2",
        type: "quiz",
        prompt: "Your queen can capture a pawn that is protected by another pawn. Is that a good idea?",
        choices: [
          { text: "No: you win 1 point but could lose the 9-point queen" },
          { text: "Yes, capturing is always good", feedback: "Not when the piece you lose is worth much more than the piece you take." },
        ],
        correct: 0,
        hint: "Count the points: what do you win, and what could you lose?",
        success: "Right. Never trade a queen for a pawn.",
      },
      {
        id: "trading-fairly-3",
        type: "captureTarget",
        prompt: "Capture the black queen with your pawn. The rook can take your pawn back, but is it still a good trade?",
        fen: "3rk3/8/8/3q4/4P3/8/8/6K1 w - - 0 1",
        target: "d5",
        hint: "A pawn is worth 1 point and a queen 9 points.",
        success: "Excellent! You win 9 points and lose 1.",
      },
      {
        id: "trading-fairly-4",
        type: "quiz",
        prompt: "What is an even trade?",
        choices: [
          { text: "Both sides lose pieces of the same value" },
          { text: "You lose a piece and the other side loses nothing", feedback: "That is a bad trade for you, or maybe just a blunder." },
        ],
        correct: 0,
        hint: "Even means equal.",
        success: "Yes, like a knight for a bishop.",
      },
    ],
  },

  {
    id: "opening-principles",
    stage: 3,
    title: "Opening principles",
    summary: "Three simple ideas for the first moves of a game.",
    icon: "🚀",
    body: [
      { type: "heading", text: "How to start a game" },
      {
        type: "paragraph",
        text: "You do not need to memorize anything fancy. Just follow three ideas in the **opening**, the first dozen moves or so:",
      },
      {
        type: "list",
        items: [
          "**Take the center.** Move a pawn to e4 or d4. Pieces in the middle of the board control more squares.",
          "**Develop your pieces.** \"Developing\" means moving your knights and bishops off their starting squares so they can join the game. Knights usually go first.",
          "**Castle early.** It tucks your king away safely and brings a rook toward the action.",
        ],
      },
      {
        type: "paragraph",
        text: "Also: do not move the same piece over and over, and do not bring your queen out too early, because she could be chased around.",
      },
    ],
    exercises: [
      {
        id: "opening-principles-1",
        type: "moveToSquare",
        prompt: "Take the center! Move the pawn in front of your king two squares, to e4.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        from: "e2",
        to: "e4",
        hint: "The e pawn is in front of the king. Two steps forward.",
        success: "A classic first move.",
      },
      {
        id: "opening-principles-2",
        type: "moveToSquare",
        prompt: "Develop a knight toward the center: move your king's knight to f3.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        from: "g1",
        to: "f3",
        hint: "The knight on g1 can jump over the pawns.",
        success: "Developed! The knight now eyes the center.",
      },
      {
        id: "opening-principles-3",
        type: "moveToSquare",
        prompt: "Develop your bishop: move it from f1 to c4.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        from: "f1",
        to: "c4",
        hint: "The pawn on e2 has moved away, so the bishop has a free diagonal.",
        success: "Good. Knights and bishops are out.",
      },
      {
        id: "opening-principles-4",
        type: "moveToSquare",
        prompt: "Both knights and a bishop are out, so tuck your king away: castle!",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5",
        from: "e1",
        to: "g1",
        hint: "Drag the king two squares toward the h1 rook.",
        success: "Castled. Your king is safe, and your rook joined the game.",
      },
      {
        id: "opening-principles-5",
        type: "quiz",
        prompt: "Which of these is a good way to start a game?",
        choices: [
          { text: "Move a pawn into the center, like e4 or d4" },
          { text: "Move the edge pawn, like a3", feedback: "Edge pawns do very little. Central pawns control the middle of the board." },
          { text: "Bring the queen out right away", feedback: "A queen that comes out early gets chased by smaller pieces. Develop knights and bishops first." },
        ],
        correct: 0,
        hint: "Remember the first principle: take the center.",
        success: "Yes, a central pawn is a great start.",
      },
    ],
  },
];
