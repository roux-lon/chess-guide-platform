import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove, EvaluateOptions, Evaluation } from "@/engine";
import { START_FEN } from "@/rules";
import { GameSession } from "./GameSession";

const noEval = (bestMove: EngineMove | null): Evaluation => ({
  cpWhite: 0,
  mateIn: null,
  bestMove,
  principalVariation: [],
});

/** Analysis engine: always suggests Nf3 at the start, otherwise nothing. */
const analysis = () =>
  new FakeEngine([], (fen) => noEval(fen === START_FEN ? { from: "g1", to: "f3" } : null));

/** Takes a moment to answer, like the real engine. */
class SlowEngine extends FakeEngine {
  async evaluate(fen: string, options?: EvaluateOptions): Promise<Evaluation> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return super.evaluate(fen, options);
  }
}

function coachSession(botMoves: EngineMove[], analysisEngine: FakeEngine = analysis(), fen?: string) {
  return new GameSession({
    engine: new FakeEngine(botMoves),
    analysisEngine,
    botDelayMs: 0,
    coachWaitMs: 500,
    startFen: fen,
  });
}

const E5: EngineMove = { from: "e7", to: "e5" };

describe("GameSession coach", () => {
  it("comments on every move, the player's and the bot's", async () => {
    const session = coachSession([E5]);
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().coachLog).toHaveLength(2));
    const log = session.getSnapshot().coachLog;
    expect(log.map((e) => [e.ply, e.side, e.moveSan])).toEqual([
      [1, "you", "e4"],
      [2, "bot", "e5"],
    ]);
    expect(log.every((e) => e.text.length > 0)).toBe(true);
  });

  it("works without a coach engine, with no log and no hints", async () => {
    const session = new GameSession({ engine: new FakeEngine([E5]), botDelayMs: 0 });
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
    expect(session.getSnapshot().coachLog).toEqual([]);
    expect(session.getSnapshot().canRequestHint).toBe(false);
  });

  it("starts a new game with an empty log", async () => {
    const session = coachSession([E5]);
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().coachLog).toHaveLength(2));
    session.newGame();
    expect(session.getSnapshot().coachLog).toEqual([]);
  });

  describe("hints", () => {
    it("reveal one tier per press, in order, and stop after three", async () => {
      const session = coachSession([]);
      expect(session.getSnapshot().canRequestHint).toBe(true);

      await session.requestHint();
      expect(session.getSnapshot().hints.map((h) => h.tier)).toEqual([1]);
      expect(session.getSnapshot().hints[0].text).toContain("knight on g1");

      await session.requestHint();
      expect(session.getSnapshot().hints.map((h) => h.tier)).toEqual([1, 2]);
      expect(session.getSnapshot().hints[1].text).toMatch(/threatening|win anything|could win/i);

      await session.requestHint();
      const hints = session.getSnapshot().hints;
      expect(hints.map((h) => h.tier)).toEqual([1, 2, 3]);
      expect(hints[2].text).toContain("Nf3");
      expect(hints[2].text).toContain("g1");
      expect(hints[2].text).toContain("f3");

      expect(session.getSnapshot().canRequestHint).toBe(false);
      await session.requestHint();
      expect(session.getSnapshot().hints).toHaveLength(3);
    });

    it("reset once a move is played", async () => {
      const session = coachSession([E5]);
      await session.requestHint();
      await session.requestHint();
      expect(session.getSnapshot().hints).toHaveLength(2);
      session.attemptMove("e2", "e4");
      expect(session.getSnapshot().hints).toEqual([]);
      await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
      expect(session.getSnapshot().hints).toEqual([]);
      expect(session.getSnapshot().canRequestHint).toBe(true);
    });

    it("reset on undo and on a new game", async () => {
      const session = coachSession([E5]);
      session.attemptMove("e2", "e4");
      await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
      await session.requestHint();
      expect(session.getSnapshot().hints).toHaveLength(1);
      session.undo();
      expect(session.getSnapshot().hints).toEqual([]);
      await session.requestHint();
      session.newGame();
      expect(session.getSnapshot().hints).toEqual([]);
    });

    it("are not available while the bot is thinking or the game is over", async () => {
      const session = coachSession([E5]);
      session.attemptMove("e2", "e4");
      expect(session.getSnapshot().botThinking).toBe(true);
      expect(session.getSnapshot().canRequestHint).toBe(false);
      await session.requestHint();
      expect(session.getSnapshot().hints).toEqual([]);

      const over = coachSession([], analysis(), "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
      expect(over.getSnapshot().status.isGameOver).toBe(true);
      expect(over.getSnapshot().canRequestHint).toBe(false);
    });

    it("drop a lookup that finishes after the position changed", async () => {
      const session = coachSession([E5], new SlowEngine([], () => noEval({ from: "g1", to: "f3" })));
      const pending = session.requestHint();
      expect(session.getSnapshot().hintLoading).toBe(true);
      session.attemptMove("e2", "e4");
      await pending;
      expect(session.getSnapshot().hints).toEqual([]);
    });
  });

  describe("take-back offer", () => {
    // Bf1-b5 walks into the c6 pawn's capture, leaving the bishop hanging.
    const HANGS_BISHOP = "4k3/8/2p5/8/8/8/8/4KB2 w - - 0 1";

    it("appears when the player hangs a piece, and goes away on undo", async () => {
      const session = coachSession([{ from: "e8", to: "d8" }], analysis(), HANGS_BISHOP);
      session.attemptMove("f1", "b5");
      await vi.waitFor(() => expect(session.getSnapshot().takeBackOffer).toBeDefined());
      const offer = session.getSnapshot().takeBackOffer;
      expect(offer).toMatchObject({ ply: 1, reason: "hanging" });
      expect(offer?.message).toMatch(/take that move back|take it back/i);

      session.undo();
      expect(session.getSnapshot().takeBackOffer).toBeUndefined();
      expect(session.getSnapshot().coachLog).toEqual([]);
      expect(session.getSnapshot().fen.startsWith("4k3/8/2p5/8/8/8/8/4KB2")).toBe(true);
    });

    it("does NOT appear for a safe move", async () => {
      const session = coachSession([E5]);
      session.attemptMove("e2", "e4");
      await vi.waitFor(() => expect(session.getSnapshot().coachLog).toHaveLength(2));
      expect(session.getSnapshot().takeBackOffer).toBeUndefined();
    });

    it("shows up before the bot replies, because the bot waits for the coach", async () => {
      const slow = new SlowEngine([], () => noEval(null));
      const session = coachSession([{ from: "e8", to: "d8" }], slow, HANGS_BISHOP);
      let movesWhenOffered: number | undefined;
      session.subscribe(() => {
        const snap = session.getSnapshot();
        if (snap.takeBackOffer && movesWhenOffered === undefined) movesWhenOffered = snap.moves.length;
      });
      session.attemptMove("f1", "b5");
      await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
      expect(movesWhenOffered).toBe(1);
    });

    it("moves on once the player makes another move", async () => {
      const session = coachSession(
        [{ from: "e8", to: "d8" }, { from: "d8", to: "e8" }],
        analysis(),
        HANGS_BISHOP,
      );
      session.attemptMove("f1", "b5");
      await vi.waitFor(() => expect(session.getSnapshot().takeBackOffer).toBeDefined());
      await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
      session.attemptMove("b5", "e2");
      await vi.waitFor(() => expect(session.getSnapshot().coachLog.length).toBeGreaterThanOrEqual(3));
      expect(session.getSnapshot().takeBackOffer).toBeUndefined();
    });
  });

  it("drops the log entries of undone moves", async () => {
    const session = coachSession([E5]);
    session.attemptMove("e2", "e4");
    await vi.waitFor(() => expect(session.getSnapshot().coachLog).toHaveLength(2));
    session.undo();
    expect(session.getSnapshot().coachLog).toEqual([]);
  });
});
