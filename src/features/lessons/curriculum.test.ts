import { describe, expect, it } from "vitest";
import { LESSONS, STAGES } from "./curriculum";
import { validateCurriculum } from "./validate";

describe("the real curriculum", () => {
  // Checks every exercise of every lesson, so it is slow when the whole suite runs in parallel.
  it("has no problems: legal positions, solvable exercises, unique ids", { timeout: 30_000 }, () => {
    expect(validateCurriculum(LESSONS)).toEqual([]);
  });

  it("covers every topic the plan asks for", () => {
    const ids = LESSONS.map((l) => l.id);
    for (const id of [
      "board-and-coordinates",
      "pawn",
      "rook",
      "bishop",
      "queen",
      "knight",
      "king",
      "capturing",
      "piece-values",
      "check",
      "escaping-check",
      "checkmate",
      "stalemate-and-draws",
      "castling",
      "en-passant",
      "promotion",
      "whats-the-threat",
      "dont-hang-pieces",
      "trading-fairly",
      "opening-principles",
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it("puts lessons in stage order, and every stage has lessons", () => {
    const stages = LESSONS.map((l) => l.stage);
    expect(stages).toEqual([...stages].sort());
    for (const { stage } of STAGES) {
      expect(LESSONS.some((l) => l.stage === stage), `stage ${stage}`).toBe(true);
    }
  });

  it("uses every exercise type at least once", () => {
    const types = new Set(LESSONS.flatMap((l) => l.exercises.map((e) => e.type)));
    expect([...types].sort()).toEqual(
      ["captureTarget", "escapeCheck", "mateInOne", "moveToSquare", "quiz", "safeSquare"].sort(),
    );
  });

  it("gives every exercise a hint and a way to learn from a wrong quiz answer", () => {
    for (const lesson of LESSONS) {
      for (const exercise of lesson.exercises) {
        expect(exercise.hint.length, exercise.id).toBeGreaterThan(0);
        if (exercise.type === "quiz") {
          exercise.choices.forEach((choice, i) => {
            if (i !== exercise.correct) {
              expect(choice.feedback, `${exercise.id} choice ${i}`).toBeTruthy();
            }
          });
        }
      }
    }
  });
});

describe("piece personality lines", () => {
  const speakers = ["pawn", "rook", "bishop", "queen", "knight", "king"];

  it("give each piece lesson a short line in its own voice", () => {
    for (const id of speakers) {
      const lesson = LESSONS.find((l) => l.id === id);
      expect(lesson?.personality, id).toBeTruthy();
      expect(lesson!.personality!.length, id).toBeLessThan(200);
      expect(lesson!.personality!, id).toMatch(/^I'm /);
    }
  });

  it("are optional, and never leave template markers behind", () => {
    for (const lesson of LESSONS) {
      if (lesson.personality !== undefined) expect(lesson.personality).not.toMatch(/[{}]/);
    }
  });
});
