export type LessonState = "done" | "unlocked" | "locked";

/**
 * Lessons unlock in order: the first is always open, and each later one opens when the
 * lesson before it is done. A finished lesson stays "done" and can be replayed.
 */
export function lessonStates(
  lessons: readonly { id: string }[],
  isDone: (id: string) => boolean,
): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  lessons.forEach((lesson, index) => {
    if (isDone(lesson.id)) states.set(lesson.id, "done");
    else if (index === 0 || isDone(lessons[index - 1].id)) states.set(lesson.id, "unlocked");
    else states.set(lesson.id, "locked");
  });
  return states;
}

/** The first lesson that is not done yet, or null when everything is finished. */
export function nextLessonId(
  lessons: readonly { id: string }[],
  isDone: (id: string) => boolean,
): string | null {
  return lessons.find((lesson) => !isDone(lesson.id))?.id ?? null;
}

export interface Progress {
  done: number;
  total: number;
}

export function progressOf(
  lessons: readonly { id: string }[],
  isDone: (id: string) => boolean,
): Progress {
  return { done: lessons.filter((l) => isDone(l.id)).length, total: lessons.length };
}
