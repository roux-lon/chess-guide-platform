import { describe, expect, it, vi } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove } from "@/engine";
import { createGameFromSan } from "@/rules";
import { GameSession } from "./GameSession";
import type { GameSessionOptions } from "./GameSession";

const E5: EngineMove = { from: "e7", to: "e5" };
const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

function make(options: Partial<GameSessionOptions> & { botMoves?: EngineMove[] } = {}) {
  const { botMoves = [], ...rest } = options;
  const engine = new FakeEngine(botMoves);
  const analysis = new FakeEngine();
  const session = new GameSession({ engine, botDelayMs: 0, coachWaitMs: 200, ...rest });
  return { session, engine, analysis };
}

const withCoach = (options: Partial<GameSessionOptions> & { botMoves?: EngineMove[] } = {}) => {
  const analysis = new FakeEngine();
  return { ...make({ analysisEngine: analysis, ...options }), analysis };
};

describe("coaching modes", () => {
  it("defaults to quiet: a coach, but nothing lit up on the board", async () => {
    const { session } = withCoach({ botMoves: [E5] });
    expect(session.getSnapshot().coachingMode).toBe("quiet");
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().coachLog.length).toBeGreaterThan(0));
    expect(session.getSnapshot().dangers).toEqual([]);
    expect(session.getSnapshot().latestComment).toBeUndefined();
  });

  describe("full", () => {
    // Bb5 walks into the c6 pawn's capture; the c6 pawn is loose too.
    const FEN = "4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1";

    it("lights up dangers on the board and shows the latest comment", async () => {
      const { session } = withCoach({ coachingMode: "full", startFen: FEN, botMoves: [{ from: "e8", to: "d8" }] });
      expect(session.getSnapshot().dangers).toEqual([]);

      session.attemptMove("f1", "b5");
      expect(session.getSnapshot().dangers).toContainEqual({ square: "b5", kind: "danger" });
      expect(session.getSnapshot().dangers).toContainEqual({ square: "c6", kind: "good" });

      await vi.waitFor(() => expect(session.getSnapshot().latestComment).toBeDefined());
      const { coachLog, latestComment } = session.getSnapshot();
      expect(latestComment).toBe(coachLog[coachLog.length - 1].text);
      expect(coachLog[0].text).toMatch(/bishop/i);
    });

    it("lights nothing up once the game is over", () => {
      const { session } = withCoach({ coachingMode: "full", startFen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1" });
      expect(session.getSnapshot().gameOver).toBe(true);
      expect(session.getSnapshot().dangers).toEqual([]);
    });
  });

  describe("off", () => {
    it("has no coach, no hints, no log and no take-backs", async () => {
      const { session } = make({ coachingMode: "off", botMoves: [E5] });
      session.attemptMove("e2", "e4");
      await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
      const snap = session.getSnapshot();
      expect(snap.coachingMode).toBe("off");
      expect(snap.coachLog).toEqual([]);
      expect(snap.canRequestHint).toBe(false);
      expect(snap.canUndo).toBe(false);
      expect(snap.takeBackOffer).toBeUndefined();

      session.undo();
      expect(session.getSnapshot().moves).toHaveLength(2);
    });
  });
});

describe("resigning", () => {
  it("stops the game: no more moves, and the bot's pending reply is dropped", async () => {
    const { session, engine } = make({ botMoves: [E5] });
    session.attemptMove("e2", "e4");
    expect(session.getSnapshot().botThinking).toBe(true);

    session.resign();
    const snap = session.getSnapshot();
    expect(snap).toMatchObject({ resigned: true, gameOver: true, botThinking: false, canResign: false });
    expect(snap.legalDests.size).toBe(0);
    expect(engine.cancelCount).toBeGreaterThan(0);

    await settle();
    expect(session.getSnapshot().moves).toHaveLength(1);
    session.attemptMove("d2", "d4");
    expect(session.getSnapshot().moves).toHaveLength(1);
  });

  it("disables hints and undo afterwards", async () => {
    const { session } = withCoach();
    session.attemptMove("e2", "e4");
    session.resign();
    expect(session.getSnapshot().canRequestHint).toBe(false);
    expect(session.getSnapshot().canUndo).toBe(false);
    session.undo();
    expect(session.getSnapshot().moves).toHaveLength(1);
  });

  it("does nothing twice, or after the game has ended", () => {
    const { session } = make();
    session.resign();
    const first = session.getSnapshot();
    session.resign();
    expect(session.getSnapshot()).toBe(first);

    const over = make({ startFen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1" }).session;
    over.resign();
    expect(over.getSnapshot().resigned).toBe(false);
  });
});

describe("identity and bookkeeping", () => {
  it("gives each game its own id, or the one it is given", () => {
    expect(make().session.gameId).not.toBe(make().session.gameId);
    const { session } = make({ gameId: "my-game" });
    expect(session.gameId).toBe("my-game");
    expect(session.getSnapshot().gameId).toBe("my-game");
  });

  it("reports the moves in standard notation and whether it is practice", async () => {
    const { session } = make({ botMoves: [E5], practice: true });
    expect(session.getSnapshot().practice).toBe(true);
    expect(make().session.getSnapshot().practice).toBe(false);
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().sanMoves).toEqual(["e4", "e5"]));
  });

  it("can say when the coach has finished commenting", async () => {
    const { session } = withCoach();
    session.attemptMove("e2", "e4");
    await session.coachSettled();
    expect(session.getSnapshot().coachLog).toHaveLength(1);
    await expect(make().session.coachSettled()).resolves.toBeUndefined();
  });
});

describe("restoring a saved game", () => {
  const MOVES = ["e4", "e5", "Nf3"];
  const restore = {
    moves: MOVES,
    coachLog: [
      { ply: 1, event: "center_control", text: "A fine start." },
      { ply: 2, event: "move_played", text: "The bot answered." },
      { ply: 3, event: "missed_threat", text: "Watch out." },
    ],
    mistakes: [
      { ply: 1, type: "mistake", lossCp: 200 },
      { ply: 3, type: "missed_threat", lossCp: 300 },
    ],
  };

  it("continues from the saved position, with the bot to move if it was its turn", async () => {
    const { session } = withCoach({
      gameId: "saved",
      restore,
      botMoves: [{ from: "b8", to: "c6" }],
    });
    expect(session.getSnapshot().sanMoves).toEqual(MOVES);
    expect(session.getSnapshot().fen).toBe(createGameFromSan(MOVES)?.fen());
    expect(session.getSnapshot().turn).toBe("black");

    session.start();
    await vi.waitFor(() => expect(session.getSnapshot().sanMoves).toEqual([...MOVES, "Nc6"]));
    expect(session.getSnapshot().gameId).toBe("saved");
    expect(session.getSnapshot().turn).toBe("white");
  });

  it("shows the old comments again, on the right side", () => {
    const { session } = withCoach({ restore });
    const log = session.getSnapshot().coachLog;
    expect(log.map((e) => [e.ply, e.side, e.text])).toEqual([
      [1, "you", "A fine start."],
      [2, "bot", "The bot answered."],
      [3, "you", "Watch out."],
    ]);
    expect(log[0].moveSan).toBe("e4");
  });

  it("attributes old comments correctly when the player was Black", () => {
    const { session } = withCoach({ restore, playerColor: "black" });
    expect(session.getSnapshot().coachLog.map((e) => e.side)).toEqual(["bot", "you", "bot"]);
  });

  it("keeps the old mistakes, and drops those for moves that are taken back", async () => {
    const { session } = withCoach({ restore, botMoves: [{ from: "b8", to: "c6" }] });
    expect(session.getRestoredMistakes()).toHaveLength(2);

    session.start();
    await vi.waitFor(() => expect(session.getSnapshot().sanMoves).toHaveLength(4));
    session.undo(); // takes back the bot's Nc6 and the player's Nf3
    expect(session.getSnapshot().sanMoves).toEqual(["e4", "e5"]);
    expect(session.getRestoredMistakes().map((m) => m.ply)).toEqual([1]);
    expect(session.getSnapshot().coachLog.map((e) => e.ply)).toEqual([1, 2]);
  });

  it("refuses moves that cannot be replayed", () => {
    expect(() => make({ restore: { moves: ["e4", "e4"], coachLog: [], mistakes: [] } })).toThrow(/could not be replayed/);
  });

  it("works without a coach, with no old comments to show", () => {
    const { session } = make({ restore });
    expect(session.getSnapshot().sanMoves).toEqual(MOVES);
    expect(session.getSnapshot().coachLog).toEqual([]);
  });
});
