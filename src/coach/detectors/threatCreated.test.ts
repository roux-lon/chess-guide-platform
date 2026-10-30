import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { threatCreated } from "./threatCreated";

describe("threatCreated", () => {
  it("fires when the player's move attacks an undefended rook, and calls it a threat", () => {
    // Bc1-f4 attacks the loose rook on e5. It is the bot's turn, so the bot has to answer.
    const ctx = contextFor("4k3/8/8/4r3/8/8/8/2B4K w - - 0 1", "c1", "f4");
    expect(threatCreated(ctx)).toMatchObject([
      {
        kind: "threat_created",
        actor: "you",
        attacker: { type: "bishop", square: "f4" },
        targets: [{ type: "rook", square: "e5" }],
        gain: 5,
        discovered: false,
        perspective: "user",
        nature: "threat",
      },
    ]);
  });

  it("fires for the bot's move too, as a threat against the player", () => {
    // The d5 pawn attacks the loose knight on e4.
    const ctx = contextFor("4k3/8/3p4/8/4N3/8/8/4K3 b - - 0 1", "d6", "d5");
    expect(threatCreated(ctx)).toMatchObject([
      {
        actor: "bot",
        attacker: { type: "pawn", square: "d5" },
        targets: [{ type: "knight", square: "e4" }],
        perspective: "bot",
        nature: "threat",
      },
    ]);
  });

  it("finds an attack uncovered by moving another piece", () => {
    // Bd4-e5 steps aside and the rook on d1 now attacks the queen (protected only by the king).
    const ctx = contextFor("3qk3/8/8/8/3B4/8/8/3RK3 w - - 0 1", "d4", "e5");
    expect(threatCreated(ctx)).toMatchObject([
      {
        attacker: { type: "rook", square: "d1" },
        targets: [{ type: "queen", square: "d8" }],
        discovered: true,
      },
    ]);
  });

  it("does NOT fire when the attacked piece is protected well enough", () => {
    // Qa2 eyes the d5 pawn, but the c6 pawn protects it: queen for pawn would be a loss.
    expect(threatCreated(contextFor("4k3/8/2p5/3p4/8/8/8/Q3K3 w - - 0 1", "a1", "a2"))).toEqual([]);
  });

  it("does NOT fire when the attacking piece can simply be taken", () => {
    // Bf4 would attack the rook on e5, but the g5 pawn takes the bishop.
    expect(threatCreated(contextFor("4k3/8/8/4r1p1/8/8/8/2B4K w - - 0 1", "c1", "f4"))).toEqual([]);
  });

  it("does NOT fire on a quiet developing move", () => {
    expect(threatCreated(contextFor(START_FEN, "g1", "f3"))).toEqual([]);
  });

  it("does NOT report a double attack as a single threat", () => {
    // Nc7+ attacks the king and the rook: that story belongs to the double-attack detector.
    expect(threatCreated(contextFor("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5", "c7"))).toEqual([]);
  });

  it("does NOT report what was already attacked before the move", () => {
    // The bishop already attacked the rook on e5; moving it along the diagonal changes nothing.
    expect(threatCreated(contextFor("4k3/8/8/4r3/8/2B5/8/7K w - - 0 1", "c3", "d4"))).toEqual([]);
  });
});
