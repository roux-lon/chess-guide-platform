import { describe, expect, it } from "vitest";
import type { Exercise, Lesson } from "@/content";
import { validateCurriculum } from "./validate";

const KINGS = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";

const goodExercise = (id: string): Exercise => ({
  id,
  type: "moveToSquare",
  prompt: "Move the rook.",
  fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
  from: "a1",
  to: "a5",
  hint: "Straight up.",
  success: "Yes.",
});

const lessonWith = (id: string, exercises: Exercise[], overrides: Partial<Lesson> = {}): Lesson => ({
  id,
  stage: 1,
  title: "Test lesson",
  summary: "A test.",
  icon: "x",
  body: [{ type: "paragraph", text: "Words." }],
  exercises,
  ...overrides,
});

const threeGood = (prefix: string) => [1, 2, 3].map((n) => goodExercise(`${prefix}-${n}`));

describe("validateCurriculum", () => {
  it("accepts a good lesson", () => {
    expect(validateCurriculum([lessonWith("good", threeGood("good"))])).toEqual([]);
  });

  it("rejects an illegal start position", () => {
    const bad: Exercise = { ...goodExercise("bad-1"), fen: "this is not a fen" } as Exercise;
    const problems = validateCurriculum([lessonWith("bad", [bad, ...threeGood("bad").slice(1)])]);
    expect(problems.join("\n")).toMatch(/bad-1.*not a legal position/);
  });

  it("rejects a position without both kings", () => {
    const noKings: Exercise = { ...goodExercise("bad-1"), fen: "8/8/8/8/8/8/8/R7 w - - 0 1" } as Exercise;
    const problems = validateCurriculum([lessonWith("bad", [noKings, ...threeGood("bad").slice(1)])]);
    expect(problems.join("\n")).toMatch(/bad-1.*not a legal position/);
  });

  it("rejects an illegal diagram position", () => {
    const lesson = lessonWith("bad", threeGood("bad"), {
      body: [{ type: "diagram", fen: "nonsense" }],
    });
    expect(validateCurriculum([lesson]).join("\n")).toMatch(/diagram.*not a legal position/);
  });

  it("rejects an exercise that cannot be solved", () => {
    const unsolvable: Exercise = {
      id: "stuck-1",
      type: "captureTarget",
      prompt: "Capture it.",
      // The target is the black king, which can never be captured, so nothing solves this.
      fen: "4k3/8/8/8/8/8/8/N3K3 w - - 0 1",
      target: "e8",
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("stuck", [unsolvable, ...threeGood("stuck").slice(1)])]);
    expect(problems.join("\n")).toMatch(/stuck-1.*no legal move solves it/);
  });

  it("rejects a mate-in-one that has no mate", () => {
    const noMate: Exercise = {
      id: "nomate-1",
      type: "mateInOne",
      prompt: "Mate.",
      fen: KINGS,
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("nomate", [noMate, ...threeGood("nomate").slice(1)])]);
    expect(problems.join("\n")).toMatch(/nomate-1.*no legal move solves it/);
  });

  it("rejects a capture target that is empty or friendly", () => {
    const empty: Exercise = {
      id: "empty-1",
      type: "captureTarget",
      prompt: "Capture.",
      fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
      target: "a5",
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("empty", [empty, ...threeGood("empty").slice(1)])]);
    expect(problems.join("\n")).toMatch(/empty-1.*no enemy piece/);
  });

  it("rejects an escape-check exercise where the king is not in check", () => {
    const calm: Exercise = {
      id: "calm-1",
      type: "escapeCheck",
      prompt: "Escape.",
      fen: KINGS,
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("calm", [calm, ...threeGood("calm").slice(1)])]);
    expect(problems.join("\n")).toMatch(/calm-1.*not in check/);
  });

  it("rejects a quiz whose correct answer is out of range", () => {
    const quiz: Exercise = {
      id: "quiz-1",
      type: "quiz",
      prompt: "Pick.",
      choices: [{ text: "a" }, { text: "b" }],
      correct: 5,
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("quiz", [quiz, ...threeGood("quiz").slice(1)])]);
    expect(problems.join("\n")).toMatch(/quiz-1.*correct answer index/);
  });

  it("rejects duplicate lesson and exercise ids", () => {
    const problems = validateCurriculum([
      lessonWith("same", threeGood("same")),
      lessonWith("same", threeGood("same")),
    ]).join("\n");
    expect(problems).toMatch(/duplicate lesson id/);
    expect(problems).toMatch(/same-1.*duplicate id/);
  });

  it("rejects too few or too many exercises", () => {
    expect(validateCurriculum([lessonWith("few", threeGood("few").slice(0, 2))]).join("\n")).toMatch(
      /has 2 exercises/,
    );
    const seven = [1, 2, 3, 4, 5, 6, 7].map((n) => goodExercise(`many-${n}`));
    expect(validateCurriculum([lessonWith("many", seven)]).join("\n")).toMatch(/has 7 exercises/);
  });

  it("rejects lessons out of stage order and squares that do not exist", () => {
    const outOfOrder = validateCurriculum([
      lessonWith("late", threeGood("late"), { stage: 2 }),
      lessonWith("early", threeGood("early"), { stage: 1 }),
    ]);
    expect(outOfOrder.join("\n")).toMatch(/stage order/);

    const badArrow = lessonWith("arrow", threeGood("arrow"), {
      body: [{ type: "diagram", fen: KINGS, arrows: [{ from: "a1", to: "z9" }] }],
    });
    expect(validateCurriculum([badArrow]).join("\n")).toMatch(/arrow a1-z9/);
  });

  it("rejects a position where the player has no move at all", () => {
    const stalemated: Exercise = {
      id: "dead-1",
      type: "mateInOne",
      prompt: "Mate.",
      fen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1",
      hint: "h",
      success: "s",
    };
    const problems = validateCurriculum([lessonWith("dead", [stalemated, ...threeGood("dead").slice(1)])]);
    expect(problems.join("\n")).toMatch(/dead-1.*no legal moves/);
  });
});
