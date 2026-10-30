import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { hangingPiece } from "./hangingPiece";

describe("hangingPiece", () => {
  it("fires when the player moves a piece onto an attacked, unprotected square", () => {
    // Bf1-b5 walks into the c6 pawn's capture.
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    expect(hangingPiece(ctx)).toMatchObject([
      {
        kind: "hanging_piece",
        actor: "you",
        owner: "you",
        piece: { type: "bishop", square: "b5" },
        reason: "undefended",
        gain: 3,
        perspective: "user",
        nature: "threat",
      },
    ]);
  });

  it("fires when moving the king takes away a queen's only guard", () => {
    // Black's queen on d5 attacks White's queen on d1, which only the king on e1 protected.
    const ctx = contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "e1", "f2");
    expect(hangingPiece(ctx)).toMatchObject([{ piece: { type: "queen", square: "d1" }, gain: 9 }]);
  });

  it("is only about the player's own pieces", () => {
    // Bb5 also attacks the loose pawn on c6, but that is a threat on the bot, told elsewhere.
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    expect(hangingPiece(ctx).every((e) => e.kind === "hanging_piece" && e.owner === "you")).toBe(true);
  });

  it("does NOT fire when the destination is safe", () => {
    // Bf1-c4: the c6 pawn only attacks b5 and d5.
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "c4");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("does NOT repeat a piece that was already in danger before the move", () => {
    // The knight on c3 is attacked by the bishop on a5 before and after Kf1.
    const ctx = contextFor("4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1", "e1", "f1");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("does NOT fire on the bot's moves, even when they attack the player's piece", () => {
    // Black pawn d6-d5 attacks the loose knight on e4. That is told as a threat (threatCreated).
    const ctx = contextFor("4k3/8/3p4/8/4N3/8/8/4K3 b - - 0 1", "d6", "d5");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("flags a protected piece that a cheaper piece attacks", () => {
    // The rook on d5 is guarded by the queen on h1, but the e6 pawn is worth less than a rook.
    const ctx = contextFor("3k4/8/4p3/8/8/8/8/3RK2Q w - - 0 1", "d1", "d5");
    expect(hangingPiece(ctx)).toMatchObject([
      { piece: { type: "rook", square: "d5" }, reason: "cheaper-attacker" },
    ]);
  });

  it("flags a piece that is guarded once but attacked twice", () => {
    // The knight lands on d5, guarded by the e4 pawn but attacked by a bishop and a rook.
    const ctx = contextFor("3r2k1/1b6/8/8/4P3/2N5/8/4K3 w - - 0 1", "c3", "d5");
    expect(hangingPiece(ctx)).toMatchObject([
      { piece: { type: "knight", square: "d5" }, reason: "outnumbered" },
    ]);
  });

  it("does NOT fire when the guards are enough", () => {
    // Same attackers, but now two pawns guard d5, so the exchange does not win anything.
    const ctx = contextFor("3r2k1/1b6/8/8/2P1P3/2N5/8/4K3 w - - 0 1", "c3", "d5");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("does NOT fire for a capture that wins at least as much as it risks", () => {
    // Rxd5 wins a rook (5) and can be taken back (5): an even trade, not a hanging piece.
    const ctx = contextFor("3rk3/8/8/3r4/8/8/8/3RK3 w - - 0 1", "d1", "d5");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("does NOT fire for quiet development moves", () => {
    expect(hangingPiece(contextFor(START_FEN, "g1", "f3"))).toEqual([]);
  });

  it("reports at most two pieces", () => {
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    expect(hangingPiece(ctx).length).toBeLessThanOrEqual(2);
  });
});
