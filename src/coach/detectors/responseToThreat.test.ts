import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { responseToThreat } from "./responseToThreat";

describe("responseToThreat", () => {
  it("notices when the bot moves the attacked piece away", () => {
    // The bishop on f4 attacks the loose rook on e5; the rook runs to h5.
    const ctx = contextFor("4k3/8/8/4r3/5B2/8/8/K7 b - - 0 1", "e5", "h5");
    expect(responseToThreat(ctx)).toMatchObject([
      { kind: "response_to_threat", how: "moved", piece: { type: "rook", square: "h5" }, perspective: "bot" },
    ]);
  });

  it("notices when the bot protects the attacked piece", () => {
    // The b-pawn steps to b6 and now guards the rook on a5.
    const ctx = contextFor("4k3/1p6/8/r7/8/8/8/R3K3 b - - 0 1", "b7", "b6");
    expect(responseToThreat(ctx)).toMatchObject([
      { how: "defended", piece: { type: "rook", square: "a5" } },
    ]);
  });

  it("notices when the bot takes the attacker", () => {
    // The pawn on e4 attacks the queen on d5; the queen takes it.
    const ctx = contextFor("4k3/8/8/3q4/4P3/8/8/4K3 b - - 0 1", "d5", "e4");
    expect(responseToThreat(ctx)).toMatchObject([
      { how: "captured_attacker", piece: { type: "queen", square: "e4" } },
    ]);
  });

  it("notices when the bot ignores the threat and hits back", () => {
    // The rook on e5 stays attacked, but the queen gives check on d1.
    const ctx = contextFor("3qk3/8/8/4r3/5B2/8/8/K7 b - - 0 1", "d8", "d1");
    expect(responseToThreat(ctx)).toMatchObject([{ how: "counterattack", piece: { type: "rook", square: "e5" } }]);
  });

  it("says nothing when the bot just ignores the threat (that is a chance for the player)", () => {
    expect(responseToThreat(contextFor("4k3/8/8/4r3/5B2/8/8/K7 b - - 0 1", "e8", "d8"))).toEqual([]);
  });

  it("says nothing when nothing was threatened", () => {
    expect(responseToThreat(contextFor(START_FEN, "e2", "e4", { playerColor: "black" }))).toEqual([]);
  });

  it("only talks about the bot's moves", () => {
    const ctx = contextFor("4k3/8/8/4r3/5B2/8/8/K7 b - - 0 1", "e5", "h5", { playerColor: "black" });
    expect(responseToThreat(ctx)).toEqual([]);
  });
});
