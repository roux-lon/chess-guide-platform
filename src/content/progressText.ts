// Wording for recommendations, the "ready" checklist and the review. Placeholders look like {lesson}.
// Suggestions are suggestions: the tone is "you might like to", never "you must".

export const COACHING_MODE_TEXT = {
  full: {
    label: "Full",
    blurb: "A comment on every move, and dangers lit up on the board.",
  },
  quiet: {
    label: "Quiet",
    blurb: "Comments wait in the drawer, and you ask for hints when you want them.",
  },
  off: {
    label: "Off",
    blurb: "No coaching at all. The real test: can you play comfortably on your own?",
  },
} as const;

export const SUGGESTION_TEXT = {
  lesson: "\"{mistake}\" has come up {count} {times} lately. The lesson \"{lesson}\" is about exactly that. Want to have another look?",
  raiseLevel: "You won your last {streak} games at level {from}. You might like to try level {to}.",
  lowerLevel: "Your last {streak} games at level {from} were tough. You might like to try level {to} for a while, and come back stronger.",
} as const;

export const MILESTONE_TEXT = {
  heading: "Are you ready?",
  /** The definition of done for version 1 (PLAN section 1), in plain words. */
  intro: "You are ready when you know the rules and can play a whole game on your own.",
  lessonsItem: "Finish every lesson in {stage}",
  gameItem: "Finish a game at level 2 or higher with coaching Off",
  gameHint: "Start a game, pick level 2 or higher, and set coaching to Off.",
  notReady: "Not there yet. {remaining} to go.",
  ready: "You have done both. You know the rules and you have played a whole game on your own.",
} as const;

export const REVIEW_TEXT = {
  noMistakes: "No clear mistakes in this game. Nicely played!",
  noMistakesLeftEarly: "There was too little of this game to look for mistakes. Next time, play a little longer.",
  noMistakesOff: "Coaching was off, so I could not look for mistakes this time.",
  intro: "Here are the moments that cost you the most. You can try each one again.",
} as const;

export const RESULT_TEXT = {
  win: { headline: "You won!", detail: "Checkmate. Well played." },
  loss: { headline: "The bot won this one", detail: "That is how you learn. Look at the moments below, then try again." },
  draw: { headline: "It's a draw", detail: "Neither side could win. That is a fine result." },
  abandoned: { headline: "You left this game early", detail: "It is saved in your history as an unfinished game." },
} as const;

export const GAME_TEXT = {
  practiceNote: "This is a practice position. It is not saved anywhere, so try anything you like.",
  unsavedNote: "Your diary is not connected, so this game is not saved yet. Connect your diary and it will be saved automatically.",
  offNote: "Coaching is off for this game. Good luck!",
} as const;
