import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { hangingPiece } from "./hangingPiece";

describe("hangingPiece", () => {
  it("fires when the player moves a piece onto an attacked, unprotected square", () => {
    // Bf1-b5 walks into the c6 pawn's capture.
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    const events = hangingPiece(ctx);
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "hanging_piece",
        actor: "you",
        owner: "you",
        piece: { type: "bishop", square: "b5" },
        reason: "undefended",
      }),
    );
  });

  it("also reports the bot's pieces that the player just attacked for free", () => {
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    expect(hangingPiece(ctx)).toContainEqual(
      expect.objectContaining({ owner: "bot", piece: { type: "pawn", square: "c6" } }),
    );
  });

  it("does NOT fire when the destination is safe", () => {
    // Bf1-c4: the c6 pawn only attacks b5 and d5.
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "c4");
    expect(hangingPiece(ctx)).toEqual([]);
  });

  it("does NOT repeat a piece that was already hanging before the move", () => {
    // Black's queen on d5 hangs before and after Kf2. Only White's queen is newly loose.
    const ctx = contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "e1", "f2");
    const events = hangingPiece(ctx);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ owner: "you", piece: { type: "queen", square: "d1" } });
  });

  it("warns about the player's piece when the bot's move attacks it", () => {
    // Black pawn d6-d5 attacks the loose knight on e4.
    const ctx = contextFor("4k3/8/3p4/8/4N3/8/8/4K3 b - - 0 1", "d6", "d5");
    expect(hangingPiece(ctx)).toContainEqual(
      expect.objectContaining({
        actor: "bot",
        owner: "you",
        piece: { type: "knight", square: "e4" },
      }),
    );
  });

  it("notices when the bot leaves its own piece loose", () => {
    // Black queen d8-a5 lands on the open a-file facing White's rook.
    const ctx = contextFor("3qk3/8/8/8/8/8/8/R3K3 b - - 0 1", "d8", "a5");
    expect(hangingPiece(ctx)).toContainEqual(
      expect.objectContaining({ actor: "bot", owner: "bot", piece: { type: "queen", square: "a5" } }),
    );
  });

  it("flags a protected piece attacked by a cheaper one", () => {
    // Black rook d5 is protected by the queen, but White's pawn e4 is worth less.
    const ctx = contextFor("3qk3/8/8/3r4/8/8/4P3/4K3 w - - 0 1", "e2", "e4");
    expect(hangingPiece(ctx)).toContainEqual(
      expect.objectContaining({
        owner: "bot",
        piece: { type: "rook", square: "d5" },
        reason: "cheaper-attacker",
      }),
    );
  });

  it("reports at most two pieces", () => {
    const ctx = contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5");
    expect(hangingPiece(ctx).length).toBeLessThanOrEqual(2);
  });
});
