// Words for opening practice: the panel beside the board and the menu card. The goals, reasons
// and cautions themselves are data in content/playbook/. Short, kind, beginner words.

const PIECE_WORD = {
  pawn: "pawn",
  knight: "knight",
  bishop: "bishop",
  rook: "rook",
  queen: "queen",
  king: "king",
} as const;

type PieceWord = keyof typeof PIECE_WORD;

/** "your knight on c3" or "your knight on c3 and your pawn on e4". */
function yourPieces(pieces: readonly { type: PieceWord; square: string }[]): string {
  const named = pieces.slice(0, 2).map((p) => `your ${PIECE_WORD[p.type]} on ${p.square}`);
  return named.join(" and ");
}

export const OPENING_TEXT = {
  menu: {
    title: "Practice the opening",
    blurb:
      "The first ten moves, with a checklist: claim the center, bring out your knights and bishops, castle. You are never forced to follow it.",
    button: "Practice the opening",
  },
  pageTitle: "Opening practice",
  checklistTitle: "Opening checklist",
  goalDone: "Done",
  goalTodo: "Not yet",
  nextStepTitle: "Next step",
  progress: (done: number, total: number) => `${done} of ${total} goals done`,
  movesLeft: (left: number) => (left === 1 ? "1 move left in this practice" : `${left} moves left in this practice`),
  reminder: "These are only suggestions. Play what you like; I will tell you what it does for the plan.",

  step: {
    wait: "The bot is thinking...",
    check: "Your king is in check. Get out of check first, then we go back to the plan.",
    safety: (pieces: readonly { type: PieceWord; square: string }[]) =>
      `Safety first: ${yourPieces(pieces)} can be won. Deal with that, then we go back to the plan.`,
    chance: (attacker: PieceWord, from: string, target: PieceWord, to: string, san: string) =>
      `Chance! Your ${PIECE_WORD[attacker]} on ${from} can win the bot's ${PIECE_WORD[target]} on ${to} (${san}). Free material first, then back to the plan.`,
    tryMove: (san: string, reason: string) => `Try ${san}. ${reason}`,
    freeDone: "Every goal is done. Your setup is complete!",
    freeNoMove:
      "No plan move is safe right now. Look at what the bot is doing and pick a safe move that helps your pieces.",
  },

  lastMove: {
    advanced: (labels: readonly string[], doneText: string) =>
      `Goal ticked: ${labels.join(" and ")}. ${doneText}`,
    onPlan: (san: string) => `${san} is a good step for the plan.`,
    offPlan: (san: string) =>
      `${san} does not move the plan along, but it is not a mistake. Here is what to aim for next.`,
  },

  ended: {
    completeTitle: "Your setup is complete!",
    complete: (moves: number) => `You did it in ${moves} ${moves === 1 ? "move" : "moves"}. The pieces are out and the king is safe.`,
    timeUpTitle: "That is the opening practice",
    timeUp: (done: number, total: number) =>
      `You finished ${done} of ${total} goals. That is a fine start: you can keep going in a normal game.`,
    keepPlaying: "Keep playing a normal guided game",
    keepPlayingNote: "Your game carries on from this exact position and is saved like any other game.",
    backToMenu: "Back to the menu",
  },
} as const;
