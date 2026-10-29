import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { checkGiven } from "./checkGiven";
import { inCheckWarning } from "./inCheckWarning";

describe("checkGiven", () => {
  it("fires when the player checks the bot's king", () => {
    const ctx = contextFor("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8");
    expect(checkGiven(ctx)).toEqual([{ kind: "check_given", actor: "you", by: "rook" }]);
  });

  it("does NOT fire on an ordinary move", () => {
    expect(checkGiven(contextFor("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a2"))).toEqual([]);
  });

  it("does NOT fire on checkmate (game over covers that)", () => {
    const ctx = contextFor("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8");
    expect(checkGiven(ctx)).toEqual([]);
  });

  it("does NOT fire for the bot's checks", () => {
    const ctx = contextFor("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8", { playerColor: "black" });
    expect(checkGiven(ctx)).toEqual([]);
  });
});

describe("inCheckWarning", () => {
  const fen = "4k2r/8/8/8/8/8/8/4K3 b - - 0 1";

  it("fires when the bot checks the player and counts the ways out", () => {
    const events = inCheckWarning(contextFor(fen, "h8", "h1"));
    expect(events).toEqual([
      {
        kind: "in_check_warning",
        kingSquare: "e1",
        checkers: [{ type: "rook", square: "h1" }],
        escapeMoves: 3,
      },
    ]);
  });

  it("does NOT fire when the bot makes a quiet move", () => {
    expect(inCheckWarning(contextFor(fen, "e8", "d8"))).toEqual([]);
  });

  it("does NOT fire when the player is the one moving", () => {
    expect(inCheckWarning(contextFor(fen, "h8", "h1", { playerColor: "black" }))).toEqual([]);
  });

  it("does NOT fire on checkmate", () => {
    const ctx = contextFor("r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1", "a8", "a1");
    expect(inCheckWarning(ctx)).toEqual([]);
  });
});
