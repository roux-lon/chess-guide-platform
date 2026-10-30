import { describe, expect, it } from "vitest";
import { contextFor } from "../testHelpers";
import { gameOver } from "./gameOver";

const BACK_RANK = "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1";

describe("gameOver", () => {
  it("reports a win when the player gives checkmate", () => {
    expect(gameOver(contextFor(BACK_RANK, "a1", "a8"))).toMatchObject([
      { kind: "game_over", result: "you_win", reason: "checkmate" },
    ]);
  });

  it("reports a loss when the bot gives checkmate", () => {
    const ctx = contextFor(BACK_RANK, "a1", "a8", { playerColor: "black" });
    expect(gameOver(ctx)).toMatchObject([{ kind: "game_over", result: "bot_wins", reason: "checkmate" }]);
  });

  it("reports stalemate as a draw", () => {
    const ctx = contextFor("7k/8/6K1/8/8/8/8/5Q2 w - - 0 1", "f1", "f7");
    expect(gameOver(ctx)).toMatchObject([{ kind: "game_over", result: "draw", reason: "stalemate" }]);
  });

  it("reports a draw by insufficient material", () => {
    const ctx = contextFor("4k3/8/8/8/8/8/3p4/4K3 w - - 0 1", "e1", "d2");
    expect(gameOver(ctx)).toMatchObject([
      { kind: "game_over", result: "draw", reason: "insufficient-material" },
    ]);
  });

  it("does NOT fire on an ordinary move", () => {
    expect(gameOver(contextFor(BACK_RANK, "a1", "a2"))).toEqual([]);
  });
});
