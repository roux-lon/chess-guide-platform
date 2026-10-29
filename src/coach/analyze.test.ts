import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { analyzeMoveEvents, takeBackReason } from "./analyze";
import { contextFor, cp } from "./testHelpers";

describe("analyzeMoveEvents", () => {
  it("always leads with what was played", () => {
    const events = analyzeMoveEvents(contextFor(START_FEN, "e2", "e4"));
    expect(events[0]).toMatchObject({ kind: "move_played", san: "e4", piece: "pawn", actor: "you" });
  });

  it("describes castling and captures in the lead event", () => {
    const castle = analyzeMoveEvents(contextFor("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1", "g1"));
    expect(castle[0]).toMatchObject({ castle: "kingside" });
    const capture = analyzeMoveEvents(contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d1", "d5"));
    expect(capture[0]).toMatchObject({ captured: "queen" });
  });
});

describe("takeBackReason", () => {
  it("offers a take-back when the player leaves a piece hanging", () => {
    const events = analyzeMoveEvents(contextFor("4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1", "f1", "b5"));
    expect(takeBackReason(events)).toBe("hanging");
  });

  it("offers a take-back after a blunder", () => {
    const ctx = contextFor(START_FEN, "e2", "e4", { evalBefore: cp(20), evalAfter: cp(-500) });
    expect(takeBackReason(analyzeMoveEvents(ctx))).toBe("blunder");
  });

  it("does NOT offer one for a safe move", () => {
    const ctx = contextFor(START_FEN, "e2", "e4", { evalBefore: cp(20), evalAfter: cp(30) });
    expect(takeBackReason(analyzeMoveEvents(ctx))).toBeNull();
  });

  it("does NOT offer one when the player merely attacks the bot's loose piece", () => {
    // Ra1 attacks the loose a5 pawn; the rook itself is safe.
    const events = analyzeMoveEvents(contextFor("4k3/8/8/p7/8/8/8/3RK3 w - - 0 1", "d1", "a1"));
    expect(events).toContainEqual(expect.objectContaining({ kind: "hanging_piece", owner: "bot" }));
    expect(takeBackReason(events)).toBeNull();
  });

  it("offers one when moving the king leaves the queen loose", () => {
    const events = analyzeMoveEvents(contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "e1", "f2"));
    expect(takeBackReason(events)).toBe("hanging");
  });

  it("does NOT offer one when the bot hangs its own piece", () => {
    const events = analyzeMoveEvents(contextFor("3qk3/8/8/8/8/8/8/R3K3 b - - 0 1", "d8", "a5"));
    expect(takeBackReason(events)).toBeNull();
  });
});
