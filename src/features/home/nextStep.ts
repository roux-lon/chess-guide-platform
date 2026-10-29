import { HOME_TEXT } from "@/content";
import type { Stage } from "@/content";
import { fillTemplate } from "@/lib/template";
import type { Diary } from "@/storage";
import { milestone } from "../games/milestone";
import { resumeOffer } from "../games/record";

export interface NextStep {
  kind: "continue-game" | "first-lesson" | "lesson" | "first-game" | "game-on-your-own" | "another-game";
  title: string;
  detail: string;
  /** Where the button goes. */
  href: string;
  /** The button's label. */
  cta: string;
}

/**
 * The one thing to suggest on the home screen. In order: an unfinished game, then the next
 * lesson that is not done, then a game (first any game, then one with coaching off, which is
 * what "ready" asks for), then simply more games.
 */
export function nextStep(
  diary: Diary,
  lessons: readonly { id: string; title: string; stage: Stage }[],
): NextStep {
  const offer = resumeOffer(diary.activeGame);
  if (offer) {
    const text = HOME_TEXT.next.resume;
    return {
      kind: "continue-game",
      title: text.title,
      detail: fillTemplate(text.detail, {
        moves: String(offer.moveCount),
        movesWord: offer.moveCount === 1 ? "move" : "moves",
      }),
      href: "/play",
      cta: text.cta,
    };
  }

  const done = lessons.filter((l) => diary.lessons[l.id]?.status === "done").length;
  const index = lessons.findIndex((l) => diary.lessons[l.id]?.status !== "done");
  if (index >= 0) {
    const lesson = lessons[index];
    const first = done === 0;
    const text = first ? HOME_TEXT.next.firstLesson : HOME_TEXT.next.lesson;
    return {
      kind: first ? "first-lesson" : "lesson",
      title: fillTemplate(text.title, { title: lesson.title, number: String(index + 1) }),
      detail: fillTemplate(text.detail, { done: String(done), total: String(lessons.length) }),
      href: `/learn/${lesson.id}`,
      cta: text.cta,
    };
  }

  const finishedGames = diary.games.filter((g) => g.result !== "abandoned").length;
  if (finishedGames === 0) return { kind: "first-game", ...HOME_TEXT.next.firstGame, href: "/play" };
  if (!milestone(diary, lessons).ready) {
    return { kind: "game-on-your-own", ...HOME_TEXT.next.gameOnYourOwn, href: "/play" };
  }
  return { kind: "another-game", ...HOME_TEXT.next.anotherGame, href: "/play" };
}
