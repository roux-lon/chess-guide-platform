import { describe, expect, it } from "vitest";
import { RandomMoveEngine } from "./RandomMoveEngine";

const moves = [
  { from: "a2", to: "a3" },
  { from: "b2", to: "b3" },
  { from: "c2", to: "c3" },
];

describe("RandomMoveEngine", () => {
  it("picks from the provided legal moves", async () => {
    const engine = new RandomMoveEngine(() => moves, () => 0.5);
    expect(await engine.chooseMove("any")).toEqual(moves[1]);
  });

  it("never indexes past the end", async () => {
    const engine = new RandomMoveEngine(() => moves, () => 0.999999);
    expect(await engine.chooseMove("any")).toEqual(moves[2]);
  });

  it("rejects when there are no legal moves", async () => {
    const engine = new RandomMoveEngine(() => []);
    await expect(engine.chooseMove("any")).rejects.toThrow();
  });
});
