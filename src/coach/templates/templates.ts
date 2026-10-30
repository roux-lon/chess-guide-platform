// Coach wording, as data. Each key holds several variants so comments are not repetitive.
// Placeholders look like {piece}; the allowed ones per group are listed in narrate.ts
// (TEMPLATE_VARS) and checked by a test. Tone: short, kind, beginner words, never snarky.
//
// A comment is built from three kinds of text:
// - TEMPLATES: the headline for a finding (the top-ranked event of the move);
// - WATCH_TEMPLATES: what to look at next, written for the same finding;
// - PURPOSE_WHY: why the move was played, written once per purpose.
// None of them may just restate the move: the log already shows it.

import type { Purpose } from "../events";
import type { Who } from "../types";

export type TemplateGroup =
  | "hanging_piece"
  | "capture_trade"
  | "trade_sequence"
  | "missed_threat"
  | "check_given"
  | "in_check_warning"
  | "threat_created"
  | "opportunity"
  | "double_attack"
  | "response_to_threat"
  | "move_purpose"
  | "move_quality"
  | "game_over"
  | "hint_safety"
  | "hint_plan"
  | "hint_suggest";

export const TEMPLATES: Record<TemplateGroup, Record<string, string[]>> = {
  hanging_piece: {
    you_left_undefended: [
      "Careful: nothing protects your {piece} on {square}, so the bot can take it for free.",
      "Watch out! Your {piece} on {square} has no protection and can be captured.",
    ],
    you_left_cheaper: [
      "Your {piece} on {square} is protected, but the bot's {attacker} is worth less, so taking it would still win material for the bot.",
      "The bot's {attacker} can take your {piece} on {square}. You could take back, but you would lose more than you win.",
    ],
    you_left_outnumbered: [
      "Your {piece} on {square} is attacked more times than it is protected, so the bot comes out ahead if it takes.",
      "The bot has more pieces aimed at your {piece} on {square} than you have guarding it. That exchange favors the bot.",
    ],
  },

  // The headline says what was captured and how the trade looks.
  capture_trade: {
    you_good: [
      "Nice! Your {capturer} won the {captured} on {square}, and nothing can take it back.",
      "Great capture: the {captured} is yours, and your {capturer} is safe on {square}.",
    ],
    you_equal: [
      "You took the {captured}, but the bot can take your {capturer} back. If it does, the swap is even.",
      "A fair trade in the making: your {capturer} won the {captured}, and it can be taken back.",
    ],
    you_bad: [
      "Careful: your {capturer} took the {captured}, but it can be taken back, and your {capturer} is worth more.",
      "That capture could cost you. Your {capturer} on {square} can be taken back, and that trade is not in your favor.",
    ],
    bot_good: [
      "The bot took your {captured}, and nothing of yours can take its {capturer} back.",
      "The bot won your {captured} with its {capturer}, and that piece is safe on {square}.",
    ],
    bot_equal: [
      "The bot took your {captured}, but you can take its {capturer} back!",
      "Your {captured} was captured. You can answer by recapturing its {capturer} on {square}.",
    ],
    bot_bad: [
      "The bot took your {captured}, but its {capturer} on {square} can be captured, and it is worth more. A good chance to come out ahead!",
    ],
  },

  // A capture and its recapture, told as one trade. {won} and {lost} are from the player's side.
  trade_sequence: {
    good: [
      "Good trade! You won a {won} and gave up only a {lost}.",
      "You came out ahead: your {lost} was worth less than the {won} you won.",
    ],
    equal_same: [
      "{Won} trade! Each side lost a {won}, so the score stays even.",
      "An even swap: a {won} for a {won}.",
    ],
    equal_diff: [
      "An even swap: your {lost} for the bot's {won}. They are worth the same.",
      "{Won} for {lost}: both are worth the same, so nobody gained anything.",
    ],
    bad: [
      "That trade cost you points: you gave up a {lost} and got a {won}. A {lost} is worth {points} more.",
      "Your {lost} went for a {won}. That is {points} points behind, but you can win it back, so keep going.",
    ],
  },

  missed_threat: {
    one: [
      "The bot was attacking your {piece} on {square}, and it is still in danger. Before you move, check what the bot is threatening.",
      "Your {piece} on {square} was under attack and nothing changed, so the bot can still win it.",
    ],
  },

  check_given: {
    you: [
      "Check! Your {by} is attacking the bot's king, so the bot has to deal with it right now.",
      "You put the bot in check with your {by}! It must respond before anything else.",
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

  // The move attacks something worth winning. The side that was attacked has to answer.
  threat_created: {
    you_one: [
      "Your {attacker} on {attackerSquare} now attacks the bot's {target} on {targetSquare}, and taking it would win material. The bot has to respond.",
      "Good pressure! Your {attacker} is going after the bot's {target} on {targetSquare}. That is a threat the bot must answer.",
    ],
    you_two: [
      "Your {attacker} on {attackerSquare} now attacks the bot's {target} on {targetSquare} and its {target2} on {target2Square}. The bot has to respond.",
    ],
    bot_one: [
      "The bot's {attacker} on {attackerSquare} now attacks your {target} on {targetSquare}, and it could win material. Can you save it?",
      "Heads up: the bot is threatening your {target} on {targetSquare} with its {attacker}.",
    ],
    bot_two: [
      "The bot's {attacker} on {attackerSquare} now attacks your {target} on {targetSquare} and your {target2} on {target2Square}. Both could be in danger.",
    ],
  },

  // Only ever told after the bot's move, when it is the player's turn.
  opportunity: {
    one: [
      "A chance! Your {attacker} on {attackerSquare} can capture the bot's {target} on {targetSquare}, and it would win about {gain} points.",
      "Look at that: the bot left its {target} on {targetSquare} where your {attacker} can take it. You would come out ahead.",
    ],
  },

  double_attack: {
    you: [
      "Double attack! Your {attacker} on {attackerSquare} attacks the bot's {target} and its {target2} at the same time. The bot can only save one.",
    ],
    you_check: [
      "Double attack! Your {attacker} gives check and also attacks the bot's {target} on {targetSquare}. The bot must escape the check, so you can take the {target} next.",
    ],
    bot: [
      "Watch out: the bot's {attacker} on {attackerSquare} attacks your {target} and your {target2} at once. You can probably save only one.",
    ],
    bot_check: [
      "The bot's {attacker} gives check and also attacks your {target} on {targetSquare}. Get out of check first, then see what you can save.",
    ],
  },

  response_to_threat: {
    moved: [
      "The bot saw the danger and took its {piece} out of harm's way.",
      "Your threat worked: the bot had to take its {piece} away.",
    ],
    defended: [
      "The bot protected its {piece} on {square}, so taking it would no longer win anything.",
      "The bot defended its {piece}, which means your threat is answered.",
    ],
    captured_attacker: [
      "The bot took the piece that was attacking its {piece}. Problem solved for the bot.",
    ],
    counterattack: [
      "The bot did not save its {piece} on {square}. It made a threat of its own instead.",
    ],
  },

  // The job of a quiet move. Only the top headline when nothing else happened.
  move_purpose: {
    you_develop: [
      "Nice! Your {piece} joins the game.",
      "Good habit: you are bringing your {piece} into play.",
    ],
    bot_develop: ["The bot is bringing its {piece} into the game."],
    you_controlCenter: [
      "Your {piece} fights for the center of the board.",
      "Good: you are taking space in the middle.",
    ],
    bot_controlCenter: ["The bot is fighting for the center with its {piece}."],
    you_castle: [
      "Castled! Your king is tucked away and your rook is ready to play.",
      "Nice castle: your king is safer now.",
    ],
    bot_castle: ["The bot castled to tuck its king away."],
    you_attack: ["Your {piece} puts pressure on the bot."],
    bot_attack: ["The bot's {piece} is putting pressure on you."],
    you_defend: ["Good: your move keeps your pieces safe."],
    bot_defend: ["The bot is protecting its pieces."],
    you_retreat: ["Your {piece} moves to a safer spot."],
    bot_retreat: ["The bot moves its {piece} to a safer spot."],
    you_capture: ["A capture! Your {piece} takes material off the board."],
    bot_capture: ["The bot's {piece} takes material off the board."],
    you_trade: ["A trade: both sides give up a piece."],
    bot_trade: ["A trade: both sides give up a piece."],
    you_pawnAdvance: ["You are pushing a pawn up the board."],
    bot_pawnAdvance: ["The bot pushes a pawn forward."],
    you_kingSafety: ["You are adjusting where your king stands."],
    bot_kingSafety: ["The bot is adjusting where its king stands."],
    you_improvePiece: ["Your {piece} finds a more active square."],
    bot_improvePiece: ["The bot is activating its {piece}."],
    you_other: ["A quiet move."],
    bot_other: ["The bot made a quiet move."],
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

  // Hint 1: safety check.
  hint_safety: {
    check: [
      "Your king is in check, so that comes first. You can move the king, block the check, or capture the piece giving check.",
    ],
    pieces: [
      "The bot could win {pieces} right now. Can you keep {them} safe?",
    ],
    none: [
      "Nothing of yours can be won right now. That is a good start. Now think about what you want to do.",
    ],
  },

  // Hint 2: plan check.
  hint_plan: {
    check: ["First get out of check. After that you can think about a plan."],
    threat: [
      "The bot's main threat is against your {piece} on {square}. You have three ways out: move it, protect it, or capture the piece attacking it.",
    ],
    develop: [
      "Your biggest job is to bring out {pieces}. Pieces on their starting squares cannot help yet.",
    ],
    castle: [
      "Your knights and bishops are out. A good next job is castling, which tucks your king away safely.",
    ],
    center: [
      "You have no pawn in the middle yet. Try to take space in the center (d4, e4, d5 or e5).",
    ],
    free: [
      "Nothing urgent is left: your pieces are out and safe. Look for a safe way to attack something of the bot's.",
    ],
  },

  // Hint 3: the engine's move. {reason} is the purpose of the move, or an honest "engine's pick".
  hint_suggest: {
    move: [
      "Try moving your {piece} from {from} to {to} ({san} in chess shorthand). {reason}",
      "A strong idea: your {piece} from {from} to {to} ({san} in chess shorthand). {reason}",
    ],
    none: ["I cannot find a good suggestion right now. Take your time and look for safe moves."],
  },
};

/**
 * What to look at next, for the same key as the headline. Several variants each. A key with
 * no entry here gets one of the GENERIC_WATCH lines instead.
 */
export const WATCH_TEMPLATES: Partial<Record<TemplateGroup, Record<string, string[]>>> = {
  hanging_piece: {
    you_left_undefended: [
      "The bot can capture it next move. Take your move back, protect the {piece}, or move it away.",
      "Watch the bot's {attacker} on {attackerSquare}: it can capture your {piece} next turn.",
    ],
    you_left_cheaper: [
      "Watch the bot's {attacker} on {attackerSquare}. You can take your move back, or move the {piece} somewhere safe.",
    ],
    you_left_outnumbered: [
      "Count the attackers and the guards: the bot has more. Undo the move, add a guard or move the {piece}.",
    ],
  },
  capture_trade: {
    you_good: [
      "Check whether the bot has a threat of its own now.",
      "Keep an eye on what the bot attacks next.",
    ],
    you_equal: [
      "If the bot takes back, see whether you can take back again.",
    ],
    you_bad: [
      "Watch the bot's reply: it can take your {capturer} on {square}. You can take your move back if you want.",
    ],
    bot_good: ["Look at the board again: what does that capture attack now?"],
    bot_equal: ["Taking back is usually good, but first check that the square is safe."],
    bot_bad: ["Before you take, check that the bot does not have a trick waiting."],
  },
  trade_sequence: {
    good: ["After a trade, take a fresh look: what is the bot threatening now?"],
    equal_same: ["After a trade, take a fresh look: what is the bot threatening now?"],
    equal_diff: ["After a trade, take a fresh look: what is the bot threatening now?"],
    bad: ["Slow down and look at what is still safe. Trading when you are behind is risky."],
  },
  missed_threat: {
    one: [
      "Before every move, ask: what is the bot attacking? Check that first.",
      "The bot's {attacker} on {attackerSquare} can still capture it. Undo the move or save the {piece}.",
    ],
  },
  check_given: {
    you: ["See how the bot gets out of check. It can move the king, block, or capture."],
  },
  in_check_warning: {
    one: ["Look for the one move that gets your king out of check."],
    few: ["You can move the king, block the check, or capture the piece giving check."],
    many: ["You can move the king, block the check, or capture the piece giving check."],
  },
  threat_created: {
    you_one: [
      "See how the bot answers. It can move the {target}, protect it, or hit back with a threat of its own.",
    ],
    you_two: ["The bot cannot save both with one move. See what it picks."],
    bot_one: [
      "Your move: save the {target} by moving it, protecting it, or capturing the {attacker}.",
    ],
    bot_two: ["Look for one move that deals with both threats, or save the more valuable piece."],
  },
  opportunity: {
    one: [
      "Before you grab it, check the square: could the bot take your {attacker} back?",
      "Take a second look first. If the capture is safe, go for it.",
    ],
  },
  double_attack: {
    you: ["The bot can only save one of them. Watch which one it picks."],
    you_check: ["The bot must get out of check first, and then you can take the {target}."],
    bot: ["Look for a move that saves one piece and guards or counterattacks the other."],
    bot_check: ["Get out of check first, then count what is still attacked."],
  },
  response_to_threat: {
    moved: ["Your attack made the bot react. Look at where its piece stands now."],
    defended: ["Attacks often get answered. Look for a different way to add pressure."],
    captured_attacker: ["Before you attack, check whether your attacker can be captured."],
    counterattack: ["Compare the two threats: can you win the {piece} and still stay safe?"],
  },
};

/** Why a move was played, once per purpose. Not specific to who moved, so it reads well for both sides. */
export const PURPOSE_WHY: Record<Purpose, string[]> = {
  develop: [
    "Pieces at home cannot help, so bringing knights and bishops out early is a good habit.",
    "Getting pieces out early means more of your army is ready to fight.",
  ],
  controlCenter: [
    "The middle of the board is where pieces reach both sides, so controlling it makes everything easier.",
    "Pieces in the center have more room to move.",
  ],
  castle: [
    "Castling moves the king away from the middle and brings a rook into the game, all in one move.",
  ],
  attack: [
    "Making threats forces the other side to react instead of following their own plan.",
  ],
  defend: ["Keeping pieces safe comes before attacking."],
  retreat: [
    "Stepping back from danger keeps a piece alive, and a piece you keep can still help later.",
  ],
  capture: ["Winning material is good, as long as the capturing piece cannot be taken back for free."],
  trade: ["Trades are fine when they are even, and good when you come out ahead."],
  pawnAdvance: [
    "Pawns cannot go backward, so each push changes the shape of the game. Push with a plan, like gaining space or opening a path for a piece.",
  ],
  kingSafety: [
    "The king is safest tucked behind its pawns, so walking it around early is risky.",
  ],
  improvePiece: [
    "A piece that attacks more squares can do more, so moving to a more active spot is a good small step.",
  ],
  other: [
    "Not every move has a big idea. Here nothing was attacked and no piece was brought out, so it is a quiet move.",
  ],
};

/**
 * Used when the headline has no watch line of its own. They are the thinking routine,
 * not advice about this one position, so they teach the habit.
 */
export const GENERIC_WATCH: Record<Who, string[]> = {
  // Said after the player's move: the bot replies next.
  you: [
    "Next, ask yourself: what could the bot attack with its reply?",
    "Before your next move, check whether the bot's answer could threaten something of yours.",
  ],
  // Said after the bot's move: the player is to move.
  bot: [
    "Your turn: ask what the bot's last move attacks, then check that your pieces are safe.",
    "Before you move, look at where the bot's piece can go next. Is anything of yours in its way?",
  ],
};

/** Part of the third hint when the move has no clear purpose: say honestly that it is the engine's pick. */
export const ENGINE_PICK = {
  safe: [
    "I cannot name one simple reason, so treat it as the engine's pick. It does keep all your pieces safe.",
  ],
  plain: ["I cannot name one simple reason, so treat it as the engine's pick."],
} as const;

/** Shown with the "Undo my move?" button. */
export const TAKE_BACK_MESSAGES = {
  hanging: "One of your pieces can be captured for free now. Want to take that move back?",
  blunder: "That move might be a big mistake. Want to take it back and try something else?",
} as const;
