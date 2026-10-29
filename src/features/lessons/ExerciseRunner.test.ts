import { describe, expect, it, vi } from "vitest";
import { SHOW_ANSWER_TEXT } from "@/content";
import type { Exercise } from "@/content";
import { ExerciseRunner } from "./ExerciseRunner";

const base = { prompt: "p", hint: "Look at the rook.", success: "Well done!" };

const rookToA6: Exercise = {
  ...base,
  id: "r-1",
  type: "moveToSquare",
  fen: "4k3/8/8/8/8/8/8/R6K w - - 0 1",
  from: "a1",
  to: "a6",
};

const promotion: Exercise = {
  ...base,
  id: "r-promo",
  type: "moveToSquare",
  fen: "8/P6k/8/8/8/8/8/K7 w - - 0 1",
  from: "a7",
  to: "a8",
  promotion: "queen",
};

const quiz: Exercise = {
  ...base,
  id: "r-quiz",
  type: "quiz",
  prompt: "Pick one",
  choices: [{ text: "Wrong", feedback: "Not that one because reasons." }, { text: "Right" }, { text: "Also wrong" }],
  correct: 1,
};

describe("ExerciseRunner: board exercises", () => {
  it("starts ready, with the player's pieces movable and the goal highlighted", () => {
    const snap = new ExerciseRunner(rookToA6).getSnapshot();
    expect(snap.status).toBe("ready");
    expect(snap.fen).toBe(rookToA6.type === "moveToSquare" ? rookToA6.fen : "");
    expect(snap.movableColor).toBe("white");
    expect(snap.orientation).toBe("white");
    expect(snap.legalDests.get("a1")).toContain("a6");
    expect(snap.highlights).toContainEqual({ square: "a6", kind: "good" });
    expect(snap.hintLevel).toBe(0);
    expect(snap.canShowHint).toBe(true);
    expect(snap.attempts).toBe(0);
  });

  it("explains an illegal move using the piece's rule", () => {
    const runner = new ExerciseRunner(rookToA6);
    runner.attempt("a1", "b2");
    const snap = runner.getSnapshot();
    expect(snap.status).toBe("illegal");
    expect(snap.feedback).toMatch(/rook cannot move like that/i);
    expect(snap.feedback).toMatch(/straight lines/);
    expect(snap.attempts).toBe(1);
    // Nothing moved and the player can go again straight away.
    expect(snap.movableColor).toBe("white");
    expect(snap.fen).toBe("4k3/8/8/8/8/8/8/R6K w - - 0 1");
  });

  it("explains a wrong but allowed move by naming the goal", () => {
    const runner = new ExerciseRunner(rookToA6);
    runner.attempt("a1", "a3");
    const snap = runner.getSnapshot();
    expect(snap.status).toBe("wrong");
    expect(snap.feedback).toMatch(/goal is a6/);
    expect(snap.feedback).not.toMatch(/\{/);
  });

  it("solves, locks the board and shows the success message", () => {
    const runner = new ExerciseRunner(rookToA6);
    runner.attempt("a1", "a6");
    const snap = runner.getSnapshot();
    expect(snap.status).toBe("correct");
    expect(snap.feedback).toBe("Well done!");
    expect(snap.fen?.startsWith("4k3/8/R7/8/8/8/8/7K")).toBe(true);
    expect(snap.lastMove).toEqual({ from: "a1", to: "a6" });
    expect(snap.movableColor).toBeUndefined();
    expect(snap.legalDests.size).toBe(0);
    expect(snap.canShowHint).toBe(false);
  });

  it("ignores moves after it is solved", () => {
    const runner = new ExerciseRunner(rookToA6);
    runner.attempt("a1", "a6");
    runner.attempt("a6", "a7");
    expect(runner.getSnapshot().status).toBe("correct");
    expect(runner.getSnapshot().lastMove).toEqual({ from: "a1", to: "a6" });
  });

  it("lets the player retry after a wrong answer", () => {
    const runner = new ExerciseRunner(rookToA6);
    runner.attempt("a1", "a3");
    runner.retry();
    expect(runner.getSnapshot().status).toBe("ready");
    expect(runner.getSnapshot().feedback).toBeUndefined();
    runner.attempt("a1", "a6");
    expect(runner.getSnapshot().status).toBe("correct");
    expect(runner.getSnapshot().attempts).toBe(2);
  });

  it("uses the side to move for orientation, and honours Black", () => {
    const black: Exercise = {
      ...base,
      id: "r-black",
      type: "moveToSquare",
      fen: "4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1",
      from: "d4",
      to: "e3",
    };
    const snap = new ExerciseRunner(black).getSnapshot();
    expect(snap.turn).toBe("black");
    expect(snap.orientation).toBe("black");
    expect(snap.movableColor).toBe("black");
  });

  describe("promotion", () => {
    it("waits for a piece choice and locks the board meanwhile", () => {
      const runner = new ExerciseRunner(promotion);
      runner.attempt("a7", "a8");
      const snap = runner.getSnapshot();
      expect(snap.pendingPromotion).toEqual({ from: "a7", to: "a8" });
      expect(snap.status).toBe("ready");
      expect(snap.movableColor).toBeUndefined();
      expect(snap.attempts).toBe(0);
    });

    it("judges the chosen piece", () => {
      const runner = new ExerciseRunner(promotion);
      runner.attempt("a7", "a8");
      runner.choosePromotion("knight");
      expect(runner.getSnapshot().status).toBe("wrong");
      expect(runner.getSnapshot().feedback).toMatch(/queen/);
      expect(runner.getSnapshot().pendingPromotion).toBeUndefined();

      runner.retry();
      runner.attempt("a7", "a8");
      runner.choosePromotion("queen");
      expect(runner.getSnapshot().status).toBe("correct");
    });

    it("can be cancelled", () => {
      const runner = new ExerciseRunner(promotion);
      runner.attempt("a7", "a8");
      runner.cancelPromotion();
      expect(runner.getSnapshot().pendingPromotion).toBeUndefined();
      expect(runner.getSnapshot().movableColor).toBe("white");
    });
  });

  describe("hints", () => {
    it("first shows the hint text, then the answer as an arrow", () => {
      const runner = new ExerciseRunner(rookToA6);
      runner.showHint();
      let snap = runner.getSnapshot();
      expect(snap.hintLevel).toBe(1);
      expect(snap.hintText).toBe("Look at the rook.");
      expect(snap.arrows).toEqual([]);
      expect(snap.canShowHint).toBe(true);

      runner.showHint();
      snap = runner.getSnapshot();
      expect(snap.hintLevel).toBe(2);
      expect(snap.hintText).toContain("Look at the rook.");
      expect(snap.hintText).toContain(SHOW_ANSWER_TEXT);
      expect(snap.arrows).toEqual([{ from: "a1", to: "a6", color: "green" }]);
      expect(snap.canShowHint).toBe(false);

      runner.showHint();
      expect(runner.getSnapshot().hintLevel).toBe(2);
    });

    it("keeps the hint after a wrong try, and stops offering it once solved", () => {
      const runner = new ExerciseRunner(rookToA6);
      runner.showHint();
      runner.attempt("a1", "a3");
      runner.retry();
      expect(runner.getSnapshot().hintLevel).toBe(1);
      runner.attempt("a1", "a6");
      runner.showHint();
      expect(runner.getSnapshot().hintLevel).toBe(1);
    });
  });
});

describe("ExerciseRunner: quizzes", () => {
  it("gives the wrong answer's own explanation, and marks it", () => {
    const runner = new ExerciseRunner(quiz);
    runner.answer(0);
    const snap = runner.getSnapshot();
    expect(snap.status).toBe("wrong");
    expect(snap.feedback).toBe("Not that one because reasons.");
    expect(snap.choices?.map((c) => c.state)).toEqual(["wrong", "idle", "idle"]);
  });

  it("falls back to a kind message when a wrong answer has no explanation", () => {
    const runner = new ExerciseRunner(quiz);
    runner.answer(2);
    expect(runner.getSnapshot().feedback).toMatch(/not quite/i);
  });

  it("does not count the same wrong answer twice", () => {
    const runner = new ExerciseRunner(quiz);
    runner.answer(0);
    runner.answer(0);
    expect(runner.getSnapshot().attempts).toBe(1);
  });

  it("accepts the right answer after wrong ones", () => {
    const runner = new ExerciseRunner(quiz);
    runner.answer(0);
    runner.answer(1);
    const snap = runner.getSnapshot();
    expect(snap.status).toBe("correct");
    expect(snap.feedback).toBe("Well done!");
    expect(snap.choices?.map((c) => c.state)).toEqual(["wrong", "correct", "idle"]);
  });

  it("ignores answers once solved, and ignores moves", () => {
    const runner = new ExerciseRunner(quiz);
    runner.answer(1);
    runner.answer(0);
    runner.attempt("a1", "a2");
    expect(runner.getSnapshot().status).toBe("correct");
    expect(runner.getSnapshot().attempts).toBe(1);
  });

  it("has only the hint text, no answer arrow", () => {
    const runner = new ExerciseRunner(quiz);
    runner.showHint();
    runner.showHint();
    const snap = runner.getSnapshot();
    expect(snap.hintLevel).toBe(1);
    expect(snap.arrows).toEqual([]);
    expect(snap.canShowHint).toBe(false);
  });

  it("shows a board picture when the quiz has one, but never lets it be moved", () => {
    const withBoard: Exercise = { ...quiz, id: "r-quiz-board", fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1" } as Exercise;
    const snap = new ExerciseRunner(withBoard).getSnapshot();
    expect(snap.fen).toBeDefined();
    expect(snap.movableColor).toBeUndefined();
    expect(snap.legalDests.size).toBe(0);
  });
});

describe("ExerciseRunner: notifications", () => {
  it("tells listeners about every change, and stops after unsubscribe", () => {
    const runner = new ExerciseRunner(rookToA6);
    const listener = vi.fn();
    const stop = runner.subscribe(listener);
    runner.attempt("a1", "a3");
    runner.retry();
    runner.showHint();
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    runner.attempt("a1", "a6");
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("gives a new snapshot object after each change", () => {
    const runner = new ExerciseRunner(rookToA6);
    const before = runner.getSnapshot();
    expect(runner.getSnapshot()).toBe(before);
    runner.attempt("a1", "a3");
    expect(runner.getSnapshot()).not.toBe(before);
  });
});
