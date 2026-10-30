import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { doubleAttack } from "./doubleAttack";

describe("doubleAttack", () => {
  it("finds the player's knight attacking the king and a loose rook", () => {
    const ctx = contextFor("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5", "c7");
    expect(doubleAttack(ctx)).toMatchObject([
      {
        kind: "double_attack",
        actor: "you",
        attacker: { type: "knight", square: "c7" },
        targets: [{ type: "rook", square: "a8" }],
        givesCheck: true,
        perspective: "user",
        nature: "threat",
      },
    ]);
  });

  it("finds a knight attacking two rooks", () => {
    const ctx = contextFor("4k3/8/r1r5/8/8/3N4/8/4K3 w - - 0 1", "d3", "b4");
    const [event] = doubleAttack(ctx);
    expect(event).toMatchObject({ givesCheck: false });
    expect(event.kind === "double_attack" && event.targets.map((t) => t.square).sort()).toEqual(["a6", "c6"]);
  });

  it("finds the bot's fork against the player", () => {
    // The black knight lands on c2, attacking the king on e1 and the loose rook on a1.
    const ctx = contextFor("4k3/8/8/8/3n4/8/8/R3K3 b - - 0 1", "d4", "c2");
    expect(doubleAttack(ctx)).toMatchObject([
      { actor: "bot", givesCheck: true, targets: [{ type: "rook", square: "a1" }], perspective: "bot" },
    ]);
  });

  it("does NOT fire when only one target is worth winning", () => {
    expect(doubleAttack(contextFor("4k3/8/8/4r3/8/8/8/2B4K w - - 0 1", "c1", "f4"))).toEqual([]);
  });

  it("does NOT fire when the forking piece can be captured", () => {
    // The queen on d8 simply takes the knight that landed on c7.
    expect(doubleAttack(contextFor("r2qk3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5", "c7"))).toEqual([]);
  });

  it("does NOT fire when both targets are well protected", () => {
    // The knight attacks two pawns, but each is protected by another pawn.
    expect(doubleAttack(contextFor("4k3/4p3/3p4/8/8/4N3/8/4K3 w - - 0 1", "e3", "f5"))).toEqual([]);
  });

  it("does NOT fire on a quiet move", () => {
    expect(doubleAttack(contextFor(START_FEN, "e2", "e4"))).toEqual([]);
  });
});
