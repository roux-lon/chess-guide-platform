import { MILESTONE_TEXT } from "@/content";
import type { Stage } from "@/content";
import { fillTemplate } from "@/lib/template";
import type { Diary } from "@/storage";

export interface MilestoneItem {
  id: string;
  label: string;
  done: boolean;
  /** How far along, in plain words, like "5 of 9 lessons". */
  progress: string;
  /** What to do next, shown while it is not done. */
  hint?: string;
}

export interface Milestone {
  /** True only when every item is genuinely done. Nothing is celebrated before then. */
  ready: boolean;
  items: MilestoneItem[];
  /** How many items are still open. */
  remaining: number;
  summary: string;
}

/** The smallest game level that counts towards "ready". */
export const READY_LEVEL = 2;

/**
 * Version 1's definition of done, as an honest checklist: every lesson in Stages 1 to 3 is
 * finished, and a game has been played to the end at level 2 or higher with coaching off.
 */
export function milestone(diary: Diary, lessons: readonly { id: string; stage: Stage }[]): Milestone {
  const stageItems: MilestoneItem[] = ([1, 2, 3] as const).map((stage) => {
    const inStage = lessons.filter((l) => l.stage === stage);
    const done = inStage.filter((l) => diary.lessons[l.id]?.status === "done").length;
    return {
      id: `stage-${stage}`,
      label: fillTemplate(MILESTONE_TEXT.lessonsItem, { stage: `Stage ${stage}` }),
      done: inStage.length > 0 && done === inStage.length,
      progress: `${done} of ${inStage.length} lessons`,
    };
  });

  const playedOnOwn = diary.games.filter(
    (g) => g.result !== "abandoned" && g.botLevel >= READY_LEVEL && g.coachingMode === "off",
  );
  const gameItem: MilestoneItem = {
    id: "game",
    label: MILESTONE_TEXT.gameItem,
    done: playedOnOwn.length > 0,
    progress: playedOnOwn.length > 0 ? "Done" : "Not yet",
    ...(playedOnOwn.length > 0 ? {} : { hint: MILESTONE_TEXT.gameHint }),
  };

  const items = [...stageItems, gameItem];
  const remaining = items.filter((i) => !i.done).length;
  const ready = remaining === 0;
  return {
    ready,
    items,
    remaining,
    summary: ready
      ? MILESTONE_TEXT.ready
      : fillTemplate(MILESTONE_TEXT.notReady, { remaining: `${remaining} ${remaining === 1 ? "step" : "steps"}` }),
  };
}
