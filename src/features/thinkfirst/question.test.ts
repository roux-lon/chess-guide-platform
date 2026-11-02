import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { moveSafety, planFor, threatenedSquares } from "@/features/gym/solve";
import { SOMETIMES_CHANCE, chooseQuestion, judgeAnswer } from "./question";
import { addThinkingAnswers } from "./stats";

/** White's knight on e5 can be taken by the d6 pawn and nothing protects it. */
const THREAT = "rnbqkbnr/ppp2ppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 3";
/** White is in check from the queen on e7. */
const IN_CHECK = "4k3/4q3/8/8/8/8/8/4K3 w - - 0 1";
/** White has exactly one legal move (Ka1 is attacked, Kb1 is attacked... only the capture works). */
const ONE_MOVE = "7k/8/8/8/8/8/1q6/K7 w - - 0 1";

/** A repeatable stream of numbers in [0, 1) (mulberry32, so small seeds still look random). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("chooseQuestion", () => {
  it("asks nothing when the mode is off", () => {
    expect(chooseQuestion({ fen: THREAT, mode: "off", random: () => 0 })).toBeNull();
  });

  it("asks nothing while in check or with a single legal move", () => {
    expect(chooseQuestion({ fen: IN_CHECK, mode: "every", random: seeded(1) })).toBeNull();
    expect(chooseQuestion({ fen: ONE_MOVE, mode: "every", random: seeded(1) })).toBeNull();
  });

  it("sometimes asks more often when one of my pieces is in danger", () => {
    // 0.5 is above the quiet chance and below the threat chance.
    expect(SOMETIMES_CHANCE.quiet).toBeLessThan(0.5);
    expect(SOMETIMES_CHANCE.threat).toBeGreaterThan(0.5);
    expect(chooseQuestion({ fen: START_FEN, mode: "sometimes", random: () => 0.5 })).toBeNull();
    expect(chooseQuestion({ fen: THREAT, mode: "sometimes", random: () => 0.5 })).not.toBeNull();
    expect(chooseQuestion({ fen: THREAT, mode: "sometimes", random: () => 0.99 })).toBeNull();
  });

  it("every move always finds something to ask in a normal position", () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(chooseQuestion({ fen: START_FEN, mode: "every", random: seeded(seed) })).not.toBeNull();
    }
  });

  it("asks about the piece in danger first when there is one", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q = chooseQuestion({ fen: THREAT, mode: "every", random: seeded(seed) });
      expect(q?.type).toBe("dangerPiece");
    }
  });

  it("never repeats the kind it asked last", () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (const lastType of ["dangerPiece", "safestMove", "bestPlan"] as const) {
        for (const fen of [START_FEN, THREAT]) {
          const q = chooseQuestion({ fen, mode: "every", lastType, random: seeded(seed) });
          if (q) expect(q.type).not.toBe(lastType);
        }
      }
    }
  });

  it("builds only questions whose answer the rules layer can check", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const fen of [START_FEN, THREAT]) {
        const q = chooseQuestion({ fen, mode: "every", random: seeded(seed) });
        if (!q) continue;
        if (q.type === "safestMove") {
          const safe = q.options.filter((o) => o.move && moveSafety(fen, o.move.from, o.move.to).safe);
          expect(safe).toHaveLength(1);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
        }
        if (q.type === "bestPlan") {
          const right = planFor(fen);
          expect(right).toBeDefined();
          expect(q.options.filter((o) => o.plan === right)).toHaveLength(1);
        }
        if (q.type === "dangerPiece") {
          const threatened = threatenedSquares(fen);
          expect(threatened.length).toBeLessThanOrEqual(1);
          for (const t of threatened) expect(q.options.some((o) => o.square === t)).toBe(true);
          expect(q.options.filter((o) => o.square === undefined)).toHaveLength(1);
        }
      }
    }
  });
});

describe("judgeAnswer", () => {
  const danger = chooseQuestion({ fen: THREAT, mode: "every", random: seeded(3) });

  it("says the threatened knight is the piece in danger", () => {
    expect(danger?.type).toBe("dangerPiece");
    if (!danger) return;
    const right = danger.options.findIndex((o) => o.square === "e5");
    const none = danger.options.findIndex((o) => o.square === undefined);
    expect(judgeAnswer(danger, right).correct).toBe(true);
    const bad = judgeAnswer(danger, none);
    expect(bad.correct).toBe(false);
    expect(bad.dangerSquares).toEqual(["e5"]);
    expect(bad.reason.length).toBeGreaterThan(0);
  });

  it("judges a safest-move answer by the safety check, not by stored data", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = chooseQuestion({ fen: THREAT, mode: "every", lastType: "dangerPiece", random: seeded(seed) });
      if (q?.type !== "safestMove") continue;
      q.options.forEach((o, i) => {
        const expected = o.move ? moveSafety(THREAT, o.move.from, o.move.to).safe : false;
        expect(judgeAnswer(q, i).correct).toBe(expected);
      });
      return;
    }
    throw new Error("no safest-move question was built in 60 tries");
  });

  it("judges a plan answer", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const plan = chooseQuestion({ fen: START_FEN, mode: "every", lastType: "safestMove", random: seeded(seed) });
      if (plan?.type !== "bestPlan") continue;
      const right = planFor(START_FEN);
      plan.options.forEach((o, i) => expect(judgeAnswer(plan, i).correct).toBe(o.plan === right));
      return;
    }
    throw new Error("no plan question was built in 60 tries");
  });

  it("returns a plain failure for an option that does not exist", () => {
    if (danger) expect(judgeAnswer(danger, 99).correct).toBe(false);
  });
});

describe("addThinkingAnswers", () => {
  it("counts per question kind, and per principle when tagged, without changing the input", () => {
    const start = { byQuestion: {}, byPrinciple: {} };
    const next = addThinkingAnswers(start, [
      { type: "bestPlan", correct: true },
      { type: "bestPlan", correct: false, principleId: "develop-first" },
    ]);
    expect(next.byQuestion.bestPlan).toEqual({ asked: 2, correct: 1 });
    expect(next.byPrinciple["develop-first"]).toEqual({ asked: 1, correct: 0 });
    expect(start).toEqual({ byQuestion: {}, byPrinciple: {} });
  });
});
