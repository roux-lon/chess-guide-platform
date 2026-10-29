/** How Pip, the mascot, looks. */
export type Mood = "happy" | "thinking" | "oops" | "cheering";

export const MOODS: readonly Mood[] = ["happy", "thinking", "oops", "cheering"];

/** Pip's mood while someone works on a lesson exercise. */
export function lessonMood(status: "ready" | "wrong" | "illegal" | "correct", hintShown: boolean): Mood {
  if (status === "correct") return "cheering";
  if (status === "wrong" || status === "illegal") return "oops";
  return hintShown ? "thinking" : "happy";
}

/** Pip's mood for how a game ended. A loss is a chance to learn, so Pip thinks instead of frowning. */
export function resultMood(result: "win" | "loss" | "draw" | "abandoned"): Mood {
  switch (result) {
    case "win":
      return "cheering";
    case "draw":
      return "happy";
    case "loss":
    case "abandoned":
      return "thinking";
  }
}

/** Pip's mood in the coach drawer during a game. */
export function coachMood(state: { hintLoading: boolean; hasTakeBackOffer: boolean }): Mood {
  if (state.hasTakeBackOffer) return "oops";
  if (state.hintLoading) return "thinking";
  return "happy";
}

/** A short description for screen readers. */
export function moodLabel(mood: Mood): string {
  switch (mood) {
    case "happy":
      return "Pip is smiling";
    case "thinking":
      return "Pip is thinking";
    case "oops":
      return "Pip says oops";
    case "cheering":
      return "Pip is cheering";
  }
}
