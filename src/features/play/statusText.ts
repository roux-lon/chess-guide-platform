import type { Color, DrawReason, GameStatus } from "@/rules";

// Plain wording for a complete beginner: every chess word is explained where it appears.

const DRAW_TEXT: Record<DrawReason, string> = {
  "insufficient-material":
    "Draw. Neither side has enough pieces left to ever checkmate.",
  "threefold-repetition":
    "Draw. The same position happened three times, so the game is a tie.",
  "fifty-move-rule":
    "Draw. Fifty moves went by with no capture and no pawn move, so the game is a tie.",
};

const name = (c: Color) => (c === "white" ? "White" : "Black");

export interface StatusLine {
  text: string;
  tone: "neutral" | "warning" | "win" | "lose" | "draw";
}

export function describeStatus(
  status: GameStatus,
  playerColor: Color,
  botThinking: boolean,
  resigned = false,
): StatusLine {
  if (resigned) {
    return { text: "You resigned this game. It is saved, so you can look back at it.", tone: "lose" };
  }
  if (status.isGameOver) {
    if (status.outcome === "checkmate" && status.winner) {
      const youWon = status.winner === playerColor;
      return {
        text: youWon
          ? "Checkmate! The king has no escape, so you win!"
          : "Checkmate. The bot trapped your king this time. Want to try again?",
        tone: youWon ? "win" : "lose",
      };
    }
    if (status.outcome === "stalemate") {
      return {
        text: "Draw by stalemate. The side to move has no legal move but the king is not attacked, so nobody wins.",
        tone: "draw",
      };
    }
    return {
      text: status.drawReason ? DRAW_TEXT[status.drawReason] : "The game is a draw.",
      tone: "draw",
    };
  }

  const yourTurn = status.turn === playerColor;
  if (status.inCheck) {
    return yourTurn
      ? {
          text: "Check! Your king is under attack. You must get it to safety.",
          tone: "warning",
        }
      : { text: "Check! You are attacking the bot's king.", tone: "warning" };
  }
  if (yourTurn) return { text: `Your turn (${name(playerColor)}).`, tone: "neutral" };
  return {
    text: botThinking ? "The bot is thinking..." : `Bot's turn (${name(status.turn)}).`,
    tone: "neutral",
  };
}
