import { describe, expect, it } from "vitest";
import { MOODS, coachMood, lessonMood, moodLabel, resultMood } from "./moods";

describe("lessonMood", () => {
  it("cheers when right, says oops when wrong, thinks once a hint is out", () => {
    expect(lessonMood("correct", false)).toBe("cheering");
    expect(lessonMood("wrong", false)).toBe("oops");
    expect(lessonMood("illegal", true)).toBe("oops");
    expect(lessonMood("ready", true)).toBe("thinking");
    expect(lessonMood("ready", false)).toBe("happy");
  });
});

describe("resultMood", () => {
  it("cheers a win and is kind about everything else", () => {
    expect(resultMood("win")).toBe("cheering");
    expect(resultMood("draw")).toBe("happy");
    // Never a frown for a loss: Pip thinks about what to learn.
    expect(resultMood("loss")).toBe("thinking");
    expect(resultMood("abandoned")).toBe("thinking");
  });
});

describe("coachMood", () => {
  it("says oops when there is a take-back to offer, thinks while looking for a hint", () => {
    expect(coachMood({ hintLoading: false, hasTakeBackOffer: true })).toBe("oops");
    expect(coachMood({ hintLoading: true, hasTakeBackOffer: false })).toBe("thinking");
    expect(coachMood({ hintLoading: false, hasTakeBackOffer: false })).toBe("happy");
  });
});

describe("moodLabel", () => {
  it("describes every mood in words", () => {
    for (const mood of MOODS) expect(moodLabel(mood)).toMatch(/^Pip /);
    expect(new Set(MOODS.map(moodLabel)).size).toBe(MOODS.length);
  });
});
