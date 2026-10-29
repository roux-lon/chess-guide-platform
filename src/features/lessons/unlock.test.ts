import { describe, expect, it } from "vitest";
import { lessonStates, nextLessonId, progressOf } from "./unlock";

const lessons = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const doneSet = (...ids: string[]) => (id: string) => ids.includes(id);
const states = (...done: string[]) => Object.fromEntries(lessonStates(lessons, doneSet(...done)));

describe("lessonStates", () => {
  it("opens only the first lesson at the start", () => {
    expect(states()).toEqual({ a: "unlocked", b: "locked", c: "locked", d: "locked" });
  });

  it("opens the next lesson when one is finished", () => {
    expect(states("a")).toEqual({ a: "done", b: "unlocked", c: "locked", d: "locked" });
    expect(states("a", "b")).toEqual({ a: "done", b: "done", c: "unlocked", d: "locked" });
  });

  it("does not open a lesson just because a later one is done", () => {
    expect(states("c")).toEqual({ a: "unlocked", b: "locked", c: "done", d: "unlocked" });
  });

  it("marks everything done when all are finished", () => {
    expect(Object.values(states("a", "b", "c", "d"))).toEqual(["done", "done", "done", "done"]);
  });

  it("copes with no lessons", () => {
    expect(lessonStates([], () => false).size).toBe(0);
  });
});

describe("nextLessonId", () => {
  it("is the first lesson that is not done", () => {
    expect(nextLessonId(lessons, doneSet())).toBe("a");
    expect(nextLessonId(lessons, doneSet("a", "b"))).toBe("c");
  });

  it("is null when everything is done", () => {
    expect(nextLessonId(lessons, doneSet("a", "b", "c", "d"))).toBeNull();
  });
});

describe("progressOf", () => {
  it("counts done lessons", () => {
    expect(progressOf(lessons, doneSet("a", "c"))).toEqual({ done: 2, total: 4 });
  });
});
