import { describe, expect, it } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove } from "@/engine";
import { GameSession } from "./GameSession";

/** Replays a fixed list of bot moves. */
function scriptedEngine(moves: EngineMove[]): FakeEngine {
  return new FakeEngine(moves);
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

function newSession(moves: EngineMove[], playerColor: "white" | "black" = "white") {
  return new GameSession({ engine: scriptedEngine(moves), playerColor, botDelayMs: 0 });
}

describe("GameSession", () => {
  it("plays the human move, then the bot reply", async () => {
    const session = newSession([{ from: "e7", to: "e5" }]);
    session.attemptMove("e2", "e4");
    expect(session.getSnapshot().botThinking).toBe(true);
    expect(session.getSnapshot().legalDests.size).toBe(0);
    await settle();
    const snap = session.getSnapshot();
    expect(snap.moves.map((m) => m.san)).toEqual(["e4", "e5"]);
    expect(snap.botThinking).toBe(false);
    expect(snap.turn).toBe("white");
    expect(snap.legalDests.size).toBeGreaterThan(0);
  });

  it("ignores illegal moves", () => {
    const session = newSession([]);
    session.attemptMove("e2", "e5");
    expect(session.getSnapshot().moves).toHaveLength(0);
  });

  it("asks for a promotion piece before playing a promotion", () => {
    const session = new GameSession({
      engine: scriptedEngine([]),
      botDelayMs: 0,
      startFen: "8/P6k/8/8/8/8/8/K7 w - - 0 1",
    });
    session.attemptMove("a7", "a8");
    expect(session.getSnapshot().pendingPromotion).toEqual({ from: "a7", to: "a8" });
    expect(session.getSnapshot().moves).toHaveLength(0);
    session.choosePromotion("queen");
    expect(session.getSnapshot().moves[0]).toMatchObject({ promotion: "queen" });
  });

  it("undo takes back the bot reply and the human move", async () => {
    const session = newSession([{ from: "e7", to: "e5" }]);
    session.attemptMove("e2", "e4");
    await settle();
    expect(session.getSnapshot().canUndo).toBe(true);
    session.undo();
    const snap = session.getSnapshot();
    expect(snap.moves).toHaveLength(0);
    expect(snap.canUndo).toBe(false);
    expect(snap.turn).toBe("white");
  });

  it("undo while the bot is thinking discards its reply", async () => {
    const session = newSession([{ from: "e7", to: "e5" }]);
    session.attemptMove("e2", "e4");
    session.undo();
    await settle();
    expect(session.getSnapshot().moves).toHaveLength(0);
    expect(session.getSnapshot().botThinking).toBe(false);
  });

  it("lets the bot open when the human plays black", async () => {
    const session = newSession([{ from: "e2", to: "e4" }], "black");
    session.start();
    await settle();
    const snap = session.getSnapshot();
    expect(snap.moves.map((m) => m.san)).toEqual(["e4"]);
    expect(snap.canUndo).toBe(false);
  });

  it("reports an illegal bot move instead of playing it", async () => {
    const session = newSession([{ from: "a1", to: "a8" }]);
    session.attemptMove("e2", "e4");
    await settle();
    const snap = session.getSnapshot();
    expect(snap.error).toMatch(/illegal/i);
    expect(snap.moves).toHaveLength(1);
  });

  it("passes the level to the engine and reports it", () => {
    const engine = scriptedEngine([]);
    const session = new GameSession({ engine, level: 3, botDelayMs: 0 });
    expect(engine.level).toBe(3);
    session.setLevel(5);
    expect(engine.level).toBe(5);
    expect(session.getSnapshot().level).toBe(5);
  });

  it("restarts the bot's search when the level changes mid-thought", async () => {
    const engine = scriptedEngine([
      { from: "e7", to: "e5" },
      { from: "d7", to: "d5" },
    ]);
    const session = new GameSession({ engine, botDelayMs: 5 });
    session.attemptMove("e2", "e4");
    session.setLevel(4);
    expect(engine.cancelCount).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(engine.botMoveRequests).toHaveLength(2);
    // Only the second answer was played; the first was thrown away.
    expect(session.getSnapshot().moves.map((m) => m.san)).toEqual(["e4", "d5"]);
  });

  it("cancels the engine on undo", () => {
    const engine = scriptedEngine([{ from: "e7", to: "e5" }]);
    const session = new GameSession({ engine, botDelayMs: 0 });
    session.attemptMove("e2", "e4");
    session.undo();
    expect(engine.cancelCount).toBe(1);
  });

});
