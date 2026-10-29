import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { threatFromOpponent } from "./threatFromOpponent";

describe("threatFromOpponent", () => {
  it("fires when the bot's piece now attacks a protected piece of equal value", () => {
    // Black knight g7-e6 eyes White's knight on d4, which the c3 pawn protects.
    const ctx = contextFor("4k3/6n1/8/8/3N4/2P5/8/4K3 b - - 0 1", "g7", "e6");
    expect(threatFromOpponent(ctx)).toEqual([
      {
        kind: "threat_from_opponent",
        attacker: { type: "knight", square: "e6" },
        targets: [{ type: "knight", square: "d4" }],
      },
    ]);
  });

  it("does NOT fire when the target is loose (the hanging detector handles that)", () => {
    const ctx = contextFor("4k3/6n1/8/8/3N4/8/8/4K3 b - - 0 1", "g7", "e6");
    expect(threatFromOpponent(ctx)).toEqual([]);
  });

  it("does NOT fire when the moved piece attacks nothing", () => {
    const ctx = contextFor("4k3/p7/8/8/3N4/2P5/8/4K3 b - - 0 1", "a7", "a6");
    expect(threatFromOpponent(ctx)).toEqual([]);
  });

  it("does NOT fire for the player's own moves", () => {
    const ctx = contextFor("4k3/6n1/8/8/3N4/2P5/8/4K3 b - - 0 1", "g7", "e6", {
      playerColor: "black",
    });
    expect(threatFromOpponent(ctx)).toEqual([]);
  });
});
