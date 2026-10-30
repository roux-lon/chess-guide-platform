import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { opportunity } from "./opportunity";

describe("opportunity", () => {
  it("fires when the bot's move leaves a piece the player can win", () => {
    // Black's queen lands on a5 where White's rook on a1 takes it for free.
    const ctx = contextFor("3qk3/8/8/8/8/8/8/R3K3 b - - 0 1", "d8", "a5");
    expect(opportunity(ctx)).toMatchObject([
      {
        kind: "opportunity",
        target: { type: "queen", square: "a5" },
        attacker: { type: "rook", square: "a1" },
        gain: 9,
        count: 1,
        perspective: "user",
        nature: "opportunity",
      },
    ]);
  });

  it("NEVER fires after the player's own move, even if they now attack something", () => {
    // Bf4 attacks the loose rook on e5, but the bot is to move: that is a threat, not a chance.
    const ctx = contextFor("4k3/8/8/4r3/8/8/8/2B4K w - - 0 1", "c1", "f4");
    expect(ctx.toMove).toBe("bot");
    expect(opportunity(ctx)).toEqual([]);
  });

  it("does NOT fire when the capture would lose material", () => {
    // The bot plays c6, so the queen taking d5 would be recaptured by the pawn.
    expect(opportunity(contextFor("4k3/2p5/8/3p4/8/8/8/3QK3 b - - 0 1", "c7", "c6"))).toEqual([]);
  });

  it("does NOT fire when nothing can be captured", () => {
    const ctx = contextFor(START_FEN, "e2", "e4", { playerColor: "black" });
    expect(opportunity(ctx)).toEqual([]);
  });

  it("does NOT fire when the game just ended", () => {
    const ctx = contextFor("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8", { playerColor: "black" });
    expect(opportunity(ctx)).toEqual([]);
  });
});
