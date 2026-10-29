// Coach wording, as data. Each key holds several variants so comments are not repetitive.
// Placeholders look like {piece}; the allowed ones per group are listed in narrate.ts
// (TEMPLATE_VARS) and checked by a test. Tone: short, kind, beginner words, never snarky.

export type TemplateGroup =
  | "move_played"
  | "hanging_piece"
  | "capture_trade"
  | "check_given"
  | "in_check_warning"
  | "threat_from_opponent"
  | "good_development"
  | "center_control"
  | "move_quality"
  | "game_over"
  | "hint_focus"
  | "hint_threats"
  | "hint_suggest";

export const TEMPLATES: Record<TemplateGroup, Record<string, string[]>> = {
  move_played: {
    you_move: [
      "You moved your {piece} from {from} to {to}.",
      "Your {piece} goes to {to}.",
      "You played {piece} to {to}.",
    ],
    you_capture: [
      "You captured the {captured} on {to} with your {piece}.",
      "Your {piece} took the {captured} on {to}.",
      "You took the {captured} on {to}.",
    ],
    you_castle: [
      "You castled: your king hopped to safety and your rook jumped over it.",
      "Castled! Your king is tucked away and your rook is ready to play.",
    ],
    you_promote: [
      "Your pawn reached the end of the board and became a {promoted}!",
      "Promotion! Your pawn turned into a {promoted}.",
    ],
    bot_move: [
      "The bot moved its {piece} from {from} to {to}.",
      "The bot's {piece} goes to {to}.",
      "The bot played {piece} to {to}.",
    ],
    bot_capture: [
      "The bot captured your {captured} on {to} with its {piece}.",
      "The bot's {piece} took your {captured} on {to}.",
    ],
    bot_castle: [
      "The bot castled to tuck its king away.",
      "The bot castled: its king hopped to safety.",
    ],
    bot_promote: [
      "The bot's pawn reached the end and became a {promoted}.",
      "The bot promoted a pawn into a {promoted}.",
    ],
  },

  hanging_piece: {
    you_left_undefended: [
      "Careful: nothing protects your {piece} on {square}, so the bot can take it for free.",
      "Watch out! Your {piece} on {square} has no protection and can be captured.",
    ],
    you_left_cheaper: [
      "Your {piece} on {square} is protected, but the bot's {attacker} is worth less, so taking it would still win material for the bot.",
    ],
    threat_undefended: [
      "The bot is going after your {piece} on {square}, and nothing protects it!",
      "Heads up: your {piece} on {square} can be captured for free now.",
    ],
    threat_cheaper: [
      "The bot's {attacker} on {attackerSquare} can take your {piece} on {square}. Even though your {piece} is protected, you would lose more than you win.",
    ],
    chance_undefended: [
      "Nice! The bot's {piece} on {square} has no protection. You could capture it next.",
      "Look at that: the bot's {piece} on {square} is hanging. Can you take it?",
    ],
    chance_cheaper: [
      "Your {attacker} on {attackerSquare} can win the bot's {piece} on {square}. It is protected, but your {attacker} is worth less.",
    ],
    bot_left_undefended: [
      "The bot left its {piece} on {square} unprotected. Your {attacker} on {attackerSquare} can take it!",
    ],
    bot_left_cheaper: [
      "The bot's {piece} on {square} is protected, but your {attacker} is worth less, so taking it wins material.",
    ],
  },

  // The lead sentence already says what was captured, so these only judge the trade.
  capture_trade: {
    you_good: [
      "Nice! Nothing can take your {capturer} back, so you came out ahead.",
      "Great capture, and your {capturer} is safe on {square}.",
    ],
    you_equal: [
      "An even swap: the bot can take your {capturer} back.",
      "A fair trade: your {capturer} can be taken back, so you give up as much as you won.",
    ],
    you_bad: [
      "Careful: your {capturer} on {square} can be taken back, and it is worth more than what you won.",
      "That capture could cost you. Your {capturer} on {square} can be taken back, and that trade is not in your favor.",
    ],
    bot_good: [
      "Nothing of yours can take it back, so the bot came out ahead.",
      "That one is safe for the bot, so it won material.",
    ],
    bot_equal: [
      "But you can take its {capturer} back!",
      "You can recapture its {capturer} on {square}!",
    ],
    bot_bad: [
      "But its {capturer} on {square} can be captured. A good chance to come out ahead!",
    ],
  },

  check_given: {
    you: [
      "Check! Your {by} is attacking the bot's king.",
      "You put the bot in check with your {by}!",
    ],
  },

  in_check_warning: {
    one: [
      "Check! The bot's {checker} on {checkerSquare} attacks your king. You have exactly one way out.",
    ],
    few: [
      "Check! The bot's {checker} on {checkerSquare} attacks your king. You have {escapes} ways to escape.",
    ],
    many: [
      "Check! The bot's {checker} on {checkerSquare} attacks your king. You have several ways out.",
    ],
  },

  threat_from_opponent: {
    one: [
      "The bot's {attacker} on {attackerSquare} now attacks your {target} on {targetSquare}. It is protected, but keep an eye on it.",
    ],
    two: [
      "The bot's {attacker} on {attackerSquare} now attacks your {target} on {targetSquare} and your {target2} on {target2Square}. Both are protected, but keep an eye on them.",
    ],
  },

  good_development: {
    you: [
      "Nice! Your {piece} is out and ready to help.",
      "Good start: you brought your {piece} into the game.",
    ],
    bot: ["The bot is bringing its {piece} into the game."],
  },

  center_control: {
    you_occupy: [
      "Good: your pawn now stands in the middle of the board on {square}.",
      "Nice! Your pawn takes a spot in the center on {square}.",
    ],
    you_attack: [
      "Your {piece} now watches the middle of the board ({squares}).",
      "Nice! Your {piece} eyes the center ({squares}).",
    ],
    bot_occupy: ["The bot put a pawn in the center on {square}."],
    bot_attack: ["The bot's {piece} now watches the center ({squares})."],
  },

  move_quality: {
    you_good: ["Good move!", "Solid choice.", "That keeps you in good shape."],
    you_mistake: [
      "That was a mistake: it gave the bot a better position. It happens to everyone!",
      "Hmm, that move made things harder for you. No worries, you can learn from it.",
    ],
    you_blunder: [
      "Oops, that looks like a blunder that could cost you. You can take it back if you like.",
      "That move could cost you a lot. If you want, take it back and try something else.",
    ],
    bot_mistake: [
      "The bot slipped up there. Look for a chance!",
      "That was not the bot's best move. Keep your eyes open.",
    ],
    bot_blunder: [
      "The bot made a big slip! See if you can take advantage.",
      "That was a blunder by the bot. Look carefully, there may be a chance for you.",
    ],
  },

  game_over: {
    you_win: [
      "Checkmate! The bot's king has nowhere to go, so you win. Amazing job!",
    ],
    bot_wins: [
      "Checkmate. The bot trapped your king this time. Every game teaches you something. Want to play again?",
    ],
    "draw_stalemate": [
      "Stalemate! The bot has no legal move, but its king is not attacked, so the game is a draw.",
    ],
    "draw_insufficient-material": [
      "It is a draw: there are not enough pieces left for either side to checkmate.",
    ],
    "draw_threefold-repetition": [
      "It is a draw: the same position happened three times.",
    ],
    "draw_fifty-move-rule": [
      "It is a draw: fifty moves passed with no capture and no pawn move.",
    ],
  },

  hint_focus: {
    piece: [
      "Take a good look at your {piece} on {square}.",
      "Hint: think about what your {piece} on {square} can do.",
    ],
    piece_in_check: [
      "Your king is in check! Look for a way to get it to safety. Your {piece} on {square} might be the key.",
    ],
    in_check: ["Your king is in check, so first look for a way to get it out of danger."],
    none: ["Take a slow look at the whole board. Is anything of yours in danger?"],
  },

  hint_threats: {
    none: ["Right now the bot is not threatening to win anything of yours for free."],
    pieces: ["The bot could win {pieces} right now. Can you keep {them} safe?"],
    check: ["The bot is attacking your king. You must deal with that first."],
  },

  hint_suggest: {
    move: [
      "Try moving your {piece} from {from} to {to} ({san} in chess shorthand).",
      "A strong idea: your {piece} from {from} to {to} ({san} in chess shorthand).",
    ],
    none: ["I cannot find a good suggestion right now. Take your time and look for safe moves."],
  },
};

/** Shown with the "Undo my move?" button. */
export const TAKE_BACK_MESSAGES = {
  hanging: "One of your pieces can be captured for free now. Want to take that move back?",
  blunder: "That move might be a big mistake. Want to take it back and try something else?",
} as const;
