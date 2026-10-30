import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { missedThreat } from "./missedThreat";

// The black bishop on a5 attacks the white knight on c3, and nothing protects the knight.
const KNIGHT_ATTACKED = "4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1";
// The black bishop on c3 attacks the white rook on a1, which nothing protects.
const ROOK_ATTACKED = "4k3/8/8/8/8/2bQ4/8/R5K1 w - - 0 1";

describe("missedThreat", () => {
  it("fires when the player ignores an attack on a piece", () => {
    const events = missedThreat(contextFor(KNIGHT_ATTACKED, "e1", "f1"));
    expect(events).toMatchObject([
      {
        kind: "missed_threat",
        piece: { type: "knight", square: "c3" },
        attackers: [{ type: "bishop", square: "a5" }],
        gain: 3,
        perspective: "user",
        nature: "threat",
      },
    ]);
  });

  it("names the most valuable piece left hanging", () => {
    const events = missedThreat(contextFor(ROOK_ATTACKED, "g1", "h1"));
    expect(events).toMatchObject([{ piece: { type: "rook", square: "a1" } }]);
  });

  it("does NOT fire when the attacked piece moves away", () => {
    expect(missedThreat(contextFor(ROOK_ATTACKED, "a1", "b1"))).toEqual([]);
  });

  it("does NOT fire when the player protects the piece", () => {
    // Kd2 defends the knight, and a bishop for a knight is an even trade.
    expect(missedThreat(contextFor(KNIGHT_ATTACKED, "e1", "d2"))).toEqual([]);
  });

  it("does NOT fire when the player captures the attacker", () => {
    expect(missedThreat(contextFor(ROOK_ATTACKED, "d3", "c3"))).toEqual([]);
  });

  it("does NOT fire when the move gives check, because the bot must answer it", () => {
    expect(missedThreat(contextFor(ROOK_ATTACKED, "d3", "b5"))).toEqual([]);
  });

  it("does NOT fire when nothing was being threatened", () => {
    expect(missedThreat(contextFor(START_FEN, "e2", "e4"))).toEqual([]);
  });

  it("does NOT fire for the bot's moves", () => {
    const ctx = contextFor(KNIGHT_ATTACKED, "e1", "f1", { playerColor: "black" });
    expect(missedThreat(ctx)).toEqual([]);
  });

  it("does NOT fire when the player wins something worth at least as much", () => {
    // The knight on c3 stays attacked by the bishop, but Rxa2 wins a rook (5) for the knight (3).
    const ctx = contextFor("4k3/8/8/b7/8/2N5/r7/R3K3 w - - 0 1", "a1", "a2");
    expect(missedThreat(ctx)).toEqual([]);
  });

  it("DOES fire when the capture is worth less than the piece left hanging", () => {
    // Same idea, but the player takes a pawn (1) while the knight (3) stays loose.
    const ctx = contextFor("4k3/8/8/b7/8/2N5/p7/R3K3 w - - 0 1", "a1", "a2");
    expect(missedThreat(ctx)).toMatchObject([{ piece: { type: "knight", square: "c3" } }]);
  });
});
