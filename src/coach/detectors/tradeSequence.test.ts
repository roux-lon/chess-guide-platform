import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { tradeSequence } from "./tradeSequence";

/** Plays a capture, then the recapture on the same square, and returns the recapture's context. */
function recapture(fen: string, first: [string, string], second: [string, string]) {
  const opening = contextFor(fen, first[0], first[1]);
  return contextFor(opening.move.fenAfter, second[0], second[1], { previousMove: opening.move, ply: 2 });
}

describe("tradeSequence", () => {
  it("tells a queen swap as one even trade", () => {
    // The bot's queen takes ours on d5 and the bishop on f3 takes it back.
    const ctx = recapture("3qk3/8/8/3Q4/8/5B2/8/4K3 b - - 0 1", ["d8", "d5"], ["f3", "d5"]);
    expect(tradeSequence(ctx)).toMatchObject([
      {
        kind: "trade_sequence",
        opener: "bot",
        firstCaptured: "queen",
        recaptured: "queen",
        won: "queen",
        lost: "queen",
        netForYou: 0,
        verdict: "equal",
        nature: "trade",
      },
    ]);
  });

  it("calls it a good trade when the player took the bigger piece", () => {
    // exd5 wins a knight; the bot takes back with a pawn.
    const ctx = recapture("4k3/8/2p5/3n4/4P3/8/8/4K3 w - - 0 1", ["e4", "d5"], ["c6", "d5"]);
    expect(tradeSequence(ctx)).toMatchObject([
      { opener: "you", won: "knight", lost: "pawn", netForYou: 2, verdict: "good", perspective: "user" },
    ]);
  });

  it("calls it a bad trade when the player ends up with the smaller piece", () => {
    // The pawn takes our knight and our queen takes the pawn: a knight (3) for a pawn (1).
    const ctx = recapture("4k3/8/2p5/3N4/8/8/8/3QK3 b - - 0 1", ["c6", "d5"], ["d1", "d5"]);
    expect(tradeSequence(ctx)).toMatchObject([
      { opener: "bot", won: "pawn", lost: "knight", netForYou: -2, verdict: "bad", perspective: "bot" },
    ]);
  });

  it("does NOT fire on a capture that is not a recapture", () => {
    const ctx = contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d1", "d5");
    expect(tradeSequence(ctx)).toEqual([]);
  });

  it("does NOT fire when the earlier capture was on a different square", () => {
    const first = contextFor("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", "e4", "d5");
    const elsewhere = contextFor("4k3/8/8/8/8/p7/1P6/4K3 w - - 0 1", "b2", "a3", { previousMove: first.move });
    expect(tradeSequence(elsewhere)).toEqual([]);
  });

  it("does NOT fire when the previous move captured nothing", () => {
    const first = contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "e1", "f2");
    const second = contextFor(first.move.fenAfter, "d5", "d1", { previousMove: first.move });
    expect(tradeSequence(second)).toEqual([]);
  });
});
