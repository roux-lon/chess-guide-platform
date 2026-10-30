import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { captureTrade } from "./captureTrade";

describe("captureTrade", () => {
  it("calls winning a loose queen good", () => {
    const events = captureTrade(contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "d1", "d5"));
    expect(events).toMatchObject([
      {
        kind: "capture_trade",
        actor: "you",
        captured: "queen",
        capturer: "queen",
        square: "d5",
        netPoints: 9,
        verdict: "good",
        perspective: "user",
        nature: "trade",
      },
    ]);
  });

  it("calls an even pawn swap equal", () => {
    // exd5 and the c6 pawn takes back.
    const events = captureTrade(contextFor("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", "e4", "d5"));
    expect(events[0]).toMatchObject({ verdict: "equal", netPoints: 0 });
  });

  it("calls a queen taking a protected pawn bad", () => {
    const events = captureTrade(contextFor("4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1", "d1", "d5"));
    expect(events[0]).toMatchObject({
      verdict: "bad",
      captured: "pawn",
      capturer: "queen",
      netPoints: -8,
    });
  });

  it("describes the bot's captures from the bot's side", () => {
    const events = captureTrade(contextFor("3q4/8/8/8/8/8/8/3QK2k b - - 0 1", "d8", "d1"));
    expect(events[0]).toMatchObject({ actor: "bot", captured: "queen" });
  });

  it("gives the credit to the side that comes out ahead", () => {
    // The bot takes a protected pawn with its queen: that is a bad trade for the bot, so the player gains.
    const events = captureTrade(contextFor("3qk3/8/8/3P4/2P5/8/8/3QK3 b - - 0 1", "d8", "d5"));
    expect(events).toMatchObject([{ actor: "bot", verdict: "bad", perspective: "user" }]);
  });

  it("leaves a recapture to the trade-sequence detector", () => {
    // White took a pawn on d5, black took back with the queen; white recaptures the queen.
    const previous = contextFor("3qk3/8/8/3p4/4P3/8/8/3QK3 w - - 0 1", "e4", "d5").move;
    const recapture = contextFor(previous.fenAfter, "d8", "d5", { previousMove: previous });
    expect(captureTrade(recapture)).toEqual([]);
  });

  it("does NOT fire on a move that captures nothing", () => {
    expect(captureTrade(contextFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", "e1", "f2"))).toEqual([]);
  });
});
