import { LESSONS, STAGES } from "@/content";
import type { Lesson, Stage, StageInfo } from "@/content";

export { LESSONS, STAGES };

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export function lessonsInStage(stage: Stage): Lesson[] {
  return LESSONS.filter((lesson) => lesson.stage === stage);
}

export function stageInfo(stage: Stage): StageInfo {
  const info = STAGES.find((s) => s.stage === stage);
  if (!info) throw new Error(`No stage ${stage}`);
  return info;
}

/** The lesson after `id`, or undefined if it is the last one. */
export function lessonAfter(id: string): Lesson | undefined {
  const index = LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? LESSONS[index + 1] : undefined;
}
