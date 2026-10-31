import { describe, expect, it } from "vitest";
import { GYM_DRILLS } from "@/content";
import { drillProblems } from "./solve";

describe("gym drills agree with the rules layer", () => {
  it("has unique ids", () => {
    const ids = GYM_DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GYM_DRILLS.map((d) => [d.id, d] as const))("%s", (_id, drill) => {
    expect(drillProblems(drill)).toEqual([]);
  });
});

describe("a drill whose data disagrees with the rules fails", () => {
  const safeDrill = GYM_DRILLS.find((d) => d.type === "isItSafe");
  const threatDrill = GYM_DRILLS.find((d) => d.type === "spotThreat");
  const pickDrill = GYM_DRILLS.find((d) => d.type === "pickOfThree");

  it("catches a move called safe that loses a piece", () => {
    if (safeDrill?.type !== "isItSafe") throw new Error("missing sample");
    expect(drillProblems({ ...safeDrill, safe: true, loses: undefined })[0]).toMatch(/not safe/);
  });

  it("catches a missing threatened piece", () => {
    if (threatDrill?.type !== "spotThreat") throw new Error("missing sample");
    expect(drillProblems({ ...threatDrill, threatened: [] })[0]).toMatch(/e4/);
  });

  it("catches the wrong best move", () => {
    if (pickDrill?.type !== "pickOfThree") throw new Error("missing sample");
    expect(drillProblems({ ...pickDrill, best: 0 })[0]).toMatch(/choice 2/);
  });
});

describe("the drill set", () => {
  const types = ["spotThreat", "isItSafe", "pickOfThree", "whatsThePlan", "spotDoubleAttack"] as const;

  it.each(types)("has at least 8 %s drills", (type) => {
    expect(GYM_DRILLS.filter((d) => d.type === type).length).toBeGreaterThanOrEqual(8);
  });

  it("gives every drill a reason and a routine step", () => {
    for (const drill of GYM_DRILLS) {
      expect(drill.explanation.length, drill.id).toBeGreaterThan(20);
      expect([1, 2, 3, 4]).toContain(drill.routineStep);
    }
  });

  it("explains every wrong choice in a pickOfThree", () => {
    for (const drill of GYM_DRILLS) {
      if (drill.type !== "pickOfThree") continue;
      for (const choice of drill.choices) expect(choice.feedback.length, drill.id).toBeGreaterThan(15);
    }
  });
});
