import { describe, expect, it } from "vitest";
import { EngineCancelledError, EngineError } from "./EngineAdapter";
import { StockfishEngine } from "./StockfishEngine";
import { FakeUciHost, tick } from "./fakeUciHost";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BLACK_TO_MOVE = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

function setup(options: { random?: () => number } = {}) {
  const host = new FakeUciHost();
  const engine = new StockfishEngine({
    createTransport: host.createTransport,
    initTimeoutMs: 50,
    searchSlackMs: 50,
    stopTimeoutMs: 50,
    ...options,
  });
  return { host, engine };
}

describe("StockfishEngine startup", () => {
  it("does the UCI handshake and only once", async () => {
    const { host, engine } = setup();
    await engine.init();
    await engine.init();
    expect(host.instances).toHaveLength(1);
    expect(host.latest.sent).toEqual(["uci", "isready"]);
  });

  it("does not start a worker until it is used", () => {
    const { host } = setup();
    expect(host.instances).toHaveLength(0);
  });

  it("fails with a clear error if the engine never answers", async () => {
    const { host, engine } = setup();
    host.autoHandshake = false;
    await expect(engine.init()).rejects.toBeInstanceOf(Error);
    expect(host.latest.terminated).toBe(true);
  });

  it("can start again after dispose", async () => {
    const { host, engine } = setup();
    await engine.init();
    engine.dispose();
    expect(host.latest.terminated).toBe(true);
    await engine.init();
    expect(host.instances).toHaveLength(2);
  });
});

describe("getBotMove", () => {
  it("sends the level's settings and returns the parsed move", async () => {
    const { host, engine } = setup();
    engine.setLevel(5);
    host.onGo = (instance) => instance.emit("bestmove g1f3 ponder g8f6");
    const move = await engine.getBotMove(START);
    expect(move).toEqual({ from: "g1", to: "f3" });
    expect(host.latest.sent).toEqual([
      "uci",
      "isready",
      "setoption name Skill Level value 20",
      "setoption name MultiPV value 1",
      `position fen ${START}`,
      "go depth 12 movetime 800",
    ]);
  });

  it("returns promotions in our move type", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => instance.emit("bestmove a7a8q");
    expect(await engine.getBotMove("8/P6k/8/8/8/8/8/K7 w - - 0 1")).toEqual({
      from: "a7",
      to: "a8",
      promotion: "queen",
    });
  });

  it("rejects when the engine has no move", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => instance.emit("bestmove (none)");
    await expect(engine.getBotMove(START)).rejects.toBeInstanceOf(EngineError);
  });

  describe("deliberate blunders on level 1", () => {
    const script = (host: FakeUciHost) => {
      host.onGo = (instance) => {
        instance.emit("info depth 1 multipv 1 score cp 50 pv e2e4");
        instance.emit("info depth 1 multipv 2 score cp 20 pv d2d4");
        instance.emit("info depth 1 multipv 3 score cp 10 pv g1f3");
        instance.emit("info depth 1 multipv 4 score cp -40 pv a2a3");
        instance.emit("bestmove e2e4");
      };
    };

    it("asks for several candidate lines", async () => {
      const { host, engine } = setup({ random: () => 0.99 });
      script(host);
      engine.setLevel(1);
      await engine.getBotMove(START);
      expect(host.latest.sent).toContain("setoption name MultiPV value 4");
      expect(host.latest.sent).toContain("setoption name Skill Level value 0");
    });

    it("sometimes plays a weaker candidate instead of the best move", async () => {
      // 0.0 < 0.4 chance -> blunder; second call 0.0 -> first alternative (line 2).
      const { host, engine } = setup({ random: () => 0 });
      script(host);
      engine.setLevel(1);
      expect(await engine.getBotMove(START)).toEqual({ from: "d2", to: "d4" });
    });

    it("usually plays the best move", async () => {
      const { host, engine } = setup({ random: () => 0.99 });
      script(host);
      engine.setLevel(1);
      expect(await engine.getBotMove(START)).toEqual({ from: "e2", to: "e4" });
    });

    it("never blunders at level 3 and above", async () => {
      const { host, engine } = setup({ random: () => 0 });
      script(host);
      engine.setLevel(3);
      expect(await engine.getBotMove(START)).toEqual({ from: "e2", to: "e4" });
    });
  });
});

describe("evaluate", () => {
  const reply = (host: FakeUciHost, info: string, best = "e2e4") => {
    host.onGo = (instance) => {
      instance.emit(info);
      instance.emit(`bestmove ${best}`);
    };
  };

  it("searches at full strength regardless of the bot level", async () => {
    const { host, engine } = setup();
    engine.setLevel(1);
    reply(host, "info depth 12 multipv 1 score cp 20 pv e2e4");
    await engine.evaluate(START);
    expect(host.latest.sent).toContain("setoption name Skill Level value 20");
    expect(host.latest.sent).toContain("setoption name MultiPV value 1");
    expect(host.latest.goCommands).toEqual(["go depth 12 movetime 1000"]);
  });

  it("honours custom limits", async () => {
    const { host, engine } = setup();
    reply(host, "info depth 5 score cp 0 pv e2e4");
    await engine.evaluate(START, { depth: 5, movetimeMs: 200 });
    expect(host.latest.goCommands).toEqual(["go depth 5 movetime 200"]);
  });

  it("keeps the sign when White is to move", async () => {
    const { host, engine } = setup();
    reply(host, "info depth 12 score cp 250 pv e2e4 e7e5");
    const result = await engine.evaluate(START);
    expect(result.cpWhite).toBe(250);
    expect(result.mateIn).toBeNull();
    expect(result.bestMove).toEqual({ from: "e2", to: "e4" });
    expect(result.principalVariation).toEqual([
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
    ]);
  });

  it("flips the sign when Black is to move (engine scores are for the mover)", async () => {
    const { host, engine } = setup();
    // Black is up a queen: the engine says +900 for Black, the side to move.
    reply(host, "info depth 12 score cp 900 pv d8h4", "d8h4");
    const result = await engine.evaluate(BLACK_TO_MOVE);
    expect(result.cpWhite).toBe(-900);
  });

  it("reports mate from White's perspective", async () => {
    const { host, engine } = setup();
    reply(host, "info depth 6 score mate 2 pv d8h4 g2g3");
    const blackMates = await engine.evaluate(BLACK_TO_MOVE);
    expect(blackMates.mateIn).toBe(-2);
    expect(blackMates.cpWhite).toBeNull();

    reply(host, "info depth 6 score mate 3 pv d1h5");
    const whiteMates = await engine.evaluate(START);
    expect(whiteMates.mateIn).toBe(3);

    reply(host, "info depth 6 score mate -1 pv a2a3");
    const whiteGetsMated = await engine.evaluate(START);
    expect(whiteGetsMated.mateIn).toBe(-1);
  });

  it("handles a finished game (no move, no line)", async () => {
    const { host, engine } = setup();
    reply(host, "info depth 0 score mate 0", "(none)");
    const result = await engine.evaluate("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
    expect(result).toEqual({ cpWhite: null, mateIn: 0, bestMove: null, principalVariation: [] });
  });

  it("rejects a FEN it cannot read", async () => {
    const { engine } = setup();
    await expect(engine.evaluate("nonsense")).rejects.toThrow();
  });
});

describe("cancelling", () => {
  /** Holds every search open until the test emits a bestmove itself. */
  const holdSearches = (host: FakeUciHost) => {
    host.onGo = () => {};
  };

  it("cancel() rejects the running search and sends stop", async () => {
    const { host, engine } = setup();
    holdSearches(host);
    const pending = engine.getBotMove(START);
    const outcome = pending.catch((e: unknown) => e);
    await tick();
    engine.cancel();
    expect(await outcome).toBeInstanceOf(EngineCancelledError);
    expect(host.latest.sent).toContain("stop");
  });

  it("a new request cancels the old one and waits for it to wind down", async () => {
    const { host, engine } = setup();
    holdSearches(host);

    const first = engine.getBotMove(START).catch((e: unknown) => e);
    await tick();
    expect(host.latest.goCommands).toHaveLength(1);

    const second = engine.getBotMove(BLACK_TO_MOVE);
    await tick();
    expect(await first).toBeInstanceOf(EngineCancelledError);
    expect(host.latest.sent).toContain("stop");
    // The old search has not reported back yet, so the new one must not start.
    expect(host.latest.goCommands).toHaveLength(1);

    // The stopped search's bestmove arrives and must be thrown away.
    host.latest.emit("bestmove e2e4");
    await tick();
    expect(host.latest.goCommands).toHaveLength(2);

    host.latest.emit("bestmove e7e5");
    expect(await second).toEqual({ from: "e7", to: "e5" });
  });

  it("only the newest of several quick requests runs", async () => {
    const { host, engine } = setup();
    holdSearches(host);
    const a = engine.getBotMove(START).catch((e: unknown) => e);
    const b = engine.getBotMove(START).catch((e: unknown) => e);
    const c = engine.getBotMove(BLACK_TO_MOVE);
    await tick();
    expect(await a).toBeInstanceOf(EngineCancelledError);
    expect(await b).toBeInstanceOf(EngineCancelledError);
    expect(host.latest.goCommands).toHaveLength(1);
    expect(host.latest.sent).toContain(`position fen ${BLACK_TO_MOVE}`);
    host.latest.emit("bestmove d7d5");
    expect(await c).toEqual({ from: "d7", to: "d5" });
  });
});

describe("crash recovery", () => {
  it("restarts once and retries the search", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => {
      if (instance === host.instances[0]) instance.crash();
      else instance.emit("bestmove d2d4");
    };
    expect(await engine.getBotMove(START)).toEqual({ from: "d2", to: "d4" });
    expect(host.instances).toHaveLength(2);
    expect(host.instances[0].terminated).toBe(true);
  });

  it("surfaces an error if the restarted engine crashes too", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => instance.crash();
    const error = await engine.getBotMove(START).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineError);
    expect(error).not.toBeInstanceOf(EngineCancelledError);
    expect(host.instances).toHaveLength(2);
  });

  it("can recover on a later request after surfacing an error", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => instance.crash();
    await engine.getBotMove(START).catch(() => {});
    host.onGo = (instance) => instance.emit("bestmove e2e4");
    expect(await engine.getBotMove(START)).toEqual({ from: "e2", to: "e4" });
  });

  it("treats a search that never answers as a crash", async () => {
    const { host, engine } = setup();
    host.onGo = (instance) => {
      // First worker hangs; the replacement answers.
      if (instance !== host.instances[0]) instance.emit("bestmove e2e4");
    };
    engine.setLevel(1); // movetime 100 + 50 slack, so this stays quick
    expect(await engine.getBotMove(START)).toEqual({ from: "e2", to: "e4" });
    expect(host.instances).toHaveLength(2);
  });
});
