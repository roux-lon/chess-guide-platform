// Words for the home screen. Placeholders look like {title}.

export const HOME_TEXT = {
  greeting: "Hi, I'm Pip! I'll be your chess coach.",
  tagline: "We'll learn chess together, one small step at a time.",
  waiting: "Connect your diary using the box above, and I'll show you where to go next.",
  loading: "Getting things ready...",
  next: {
    resume: {
      title: "Continue your game",
      detail: "You left a game after {moves} {movesWord}. Pick up where you stopped.",
      cta: "Continue",
    },
    firstLesson: {
      title: "Start with lesson 1: {title}",
      detail: "A short, friendly lesson about the board. No chess knowledge needed.",
      cta: "Start learning",
    },
    lesson: {
      title: "Continue lesson {number}: {title}",
      detail: "You have finished {done} of {total} lessons. Keep going!",
      cta: "Continue",
    },
    firstGame: {
      title: "Play a guided game",
      detail: "You know all the rules now. Play the bot, and I'll help along the way.",
      cta: "Play the bot",
    },
    gameOnYourOwn: {
      title: "Try a game with coaching off",
      detail: "You are almost ready. Play a whole game on your own, at level 2 or higher.",
      cta: "Play the bot",
    },
    anotherGame: {
      title: "Play another game",
      detail: "You have done everything on the list. Keep playing to get even better.",
      cta: "Play the bot",
    },
  },
} as const;
