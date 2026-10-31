import { describe, expect, it, vi } from "vitest";
import { isBoardExercise } from "@/content";
import type { Lesson } from "@/content";
import { getLesson } from "./curriculum";
import { findSolutions } from "./judge";
import { LessonSession } from "./LessonSession";

const pawn = getLesson("pawn") as Lesson;

/** Solves whatever exercise the session is showing, the way a learner would. */
function solveCurrent(session: LessonSession): void {
  const runner = session.getSnapshot().runner;
  if (!runner) throw new Error("no exercise is showing");
  const exercise = runner.exercise;
  if (!isBoardExercise(exercise)) {
    if (exercise.type === "quiz") session.answer(exercise.correct);
    return;
  }
  const solution = findSolutions(exercise)[0];
  session.attempt(solution.from, solution.to);
  if (session.getSnapshot().runner?.pendingPromotion && solution.promotion) {
    session.choosePromotion(solution.promotion);
  }
}

describe("LessonSession", () => {
  it("opens on the explanation, with every dot still to do", () => {
    const session = new LessonSession({ lesson: pawn });
    const snap = session.getSnapshot();
    expect(snap.phase).toBe("intro");
    expect(snap.total).toBe(pawn.exercises.length);
    expect(snap.dots.every((d) => d === "todo")).toBe(true);
    expect(snap.runner).toBeUndefined();
  });

  it("moves to the first exercise on start", () => {
    const session = new LessonSession({ lesson: pawn });
    session.start();
    const snap = session.getSnapshot();
    expect(snap.phase).toBe("exercise");
    expect(snap.index).toBe(0);
    expect(snap.dots[0]).toBe("current");
    expect(snap.dots.slice(1).every((d) => d === "todo")).toBe(true);
    expect(snap.runner?.exercise.id).toBe(pawn.exercises[0].id);
    expect(snap.canContinue).toBe(false);
  });

  it("does not move on until the exercise is solved", () => {
    const session = new LessonSession({ lesson: pawn });
    session.start();
    session.next();
    expect(session.getSnapshot().index).toBe(0);

    solveCurrent(session);
    expect(session.getSnapshot().canContinue).toBe(true);
    session.next();
    expect(session.getSnapshot().index).toBe(1);
    expect(session.getSnapshot().dots.slice(0, 2)).toEqual(["done", "current"]);
    expect(session.getSnapshot().canContinue).toBe(false);
  });

  it("lets the player go wrong, get help and retry without losing their place", () => {
    const session = new LessonSession({ lesson: pawn });
    session.start();
    session.attempt("e2", "e3"); // wrong: the goal is e4
    expect(session.getSnapshot().runner?.status).toBe("wrong");
    expect(session.getSnapshot().index).toBe(0);
    session.showHint();
    expect(session.getSnapshot().runner?.hintLevel).toBe(1);
    session.retry();
    solveCurrent(session);
    expect(session.getSnapshot().canContinue).toBe(true);
  });

  it("completes the lesson after the last exercise and reports it once", () => {
    const onComplete = vi.fn();
    const session = new LessonSession({ lesson: pawn, onComplete });
    session.start();

    for (let i = 0; i < pawn.exercises.length; i++) {
      expect(session.getSnapshot().isLastExercise).toBe(i === pawn.exercises.length - 1);
      expect(onComplete).not.toHaveBeenCalled();
      solveCurrent(session);
      session.next();
    }

    const snap = session.getSnapshot();
    expect(snap.phase).toBe("complete");
    expect(snap.dots.every((d) => d === "done")).toBe(true);
    expect(snap.runner).toBeUndefined();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("pawn");

    session.next();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("can replay from the explanation", () => {
    const session = new LessonSession({ lesson: pawn });
    session.start();
    solveCurrent(session);
    session.next();
    session.restart();
    expect(session.getSnapshot().phase).toBe("intro");
    session.start();
    expect(session.getSnapshot().index).toBe(0);
    expect(session.getSnapshot().runner?.status).toBe("ready");
  });

  it("ignores exercise actions when no exercise is showing", () => {
    const session = new LessonSession({ lesson: pawn });
    expect(() => {
      session.attempt("e2", "e4");
      session.answer(0);
      session.showHint();
      session.retry();
    }).not.toThrow();
    expect(session.getSnapshot().phase).toBe("intro");
  });

  it("tells listeners when an exercise changes", () => {
    const session = new LessonSession({ lesson: pawn });
    session.start();
    const listener = vi.fn();
    session.subscribe(listener);
    session.attempt("e2", "e3");
    expect(listener).toHaveBeenCalled();
    expect(session.getSnapshot().runner?.status).toBe("wrong");
  });

  // Plays every exercise of every lesson, so it is slow when the whole suite runs in parallel.
  it("can solve every lesson in the curriculum from start to finish", { timeout: 30_000 }, async () => {
    const { LESSONS } = await import("./curriculum");
    for (const lesson of LESSONS) {
      const done = vi.fn();
      const session = new LessonSession({ lesson, onComplete: done });
      session.start();
      for (let i = 0; i < lesson.exercises.length; i++) {
        solveCurrent(session);
        expect(session.getSnapshot().canContinue, `${lesson.exercises[i].id}`).toBe(true);
        session.next();
      }
      expect(done, lesson.id).toHaveBeenCalledWith(lesson.id);
    }
  });
});
