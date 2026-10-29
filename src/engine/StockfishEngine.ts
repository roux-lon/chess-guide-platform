import { EngineCancelledError, EngineError } from "./EngineAdapter";
import type { EngineAdapter } from "./EngineAdapter";
import { DEFAULT_LEVEL, LEVELS } from "./levels";
import { scoreToWhite, sideToMove } from "./perspective";
import type { UciTransport, UciTransportFactory } from "./transport";
import type { BotLevel, EngineMove, EvaluateOptions, Evaluation } from "./types";
import { parseBestMove, parseInfo, uciToMove } from "./uci";
import type { UciInfo } from "./uci";

/** The worker died, hung or never answered. Handled inside the engine by restarting once. */
class EngineCrashError extends EngineError {
  constructor(message: string) {
    super(message);
    this.name = "EngineCrashError";
  }
}

export interface StockfishEngineOptions {
  createTransport: UciTransportFactory;
  /** Randomness for the deliberate blunders on low levels. Injectable for tests. */
  random?: () => number;
  /** How long to wait for the worker to load and say it is ready. */
  initTimeoutMs?: number;
  /** Extra time allowed on top of a search's own time limit before we call it hung. */
  searchSlackMs?: number;
  /** How long to wait for a stopped search to wind down. */
  stopTimeoutMs?: number;
}

interface SearchRequest {
  fen: string;
  skill: number;
  multiPv: number;
  depth: number;
  movetimeMs: number;
}

interface SearchOutcome {
  /** From the `bestmove` line. Null move means the engine has none. */
  bestMove: EngineMove | null;
  /** Latest info line per candidate line number. */
  infos: Map<number, UciInfo>;
}

interface ActiveSearch {
  infos: Map<number, UciInfo>;
  resolve(outcome: SearchOutcome): void;
  reject(error: Error): void;
}

interface Waiter {
  test(line: string): boolean;
  resolve(): void;
  reject(error: Error): void;
}

const DEFAULT_EVAL: Required<EvaluateOptions> = { depth: 12, movetimeMs: 1000 };

/**
 * Stockfish behind our EngineAdapter. Talks UCI over a transport (a Web Worker in the
 * browser), runs one search at a time, and restarts the worker once if it crashes.
 */
export class StockfishEngine implements EngineAdapter {
  readonly name = "Stockfish";

  private readonly createTransport: UciTransportFactory;
  private readonly random: () => number;
  private readonly initTimeoutMs: number;
  private readonly searchSlackMs: number;
  private readonly stopTimeoutMs: number;

  private level: BotLevel = DEFAULT_LEVEL;
  private transport?: UciTransport;
  private initPromise?: Promise<void>;
  private waiters = new Set<Waiter>();

  /** Identifies the newest request; older ones notice they were replaced. */
  private seq = 0;
  private active?: ActiveSearch;
  /** True from `go` until its `bestmove` arrives, even if the search was cancelled. */
  private busy = false;
  private idleWaiters = new Set<() => void>();
  private crashesInARow = 0;

  constructor({
    createTransport,
    random = Math.random,
    initTimeoutMs = 20_000,
    searchSlackMs = 5_000,
    stopTimeoutMs = 3_000,
  }: StockfishEngineOptions) {
    this.createTransport = createTransport;
    this.random = random;
    this.initTimeoutMs = initTimeoutMs;
    this.searchSlackMs = searchSlackMs;
    this.stopTimeoutMs = stopTimeoutMs;
  }

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.start().catch((error: unknown) => {
        this.teardown(error instanceof Error ? error : new Error(String(error)));
        throw error;
      });
    }
    return this.initPromise;
  }

  setLevel(level: BotLevel): void {
    this.level = level;
  }

  async getBotMove(fen: string): Promise<EngineMove> {
    const preset = LEVELS[this.level];
    const outcome = await this.search({
      fen,
      skill: preset.skill,
      multiPv: preset.multiPv,
      depth: preset.depth,
      movetimeMs: preset.movetimeMs,
    });
    const best = outcome.bestMove;
    if (!best) throw new EngineError("There are no legal moves in this position.");

    if (preset.blunderChance > 0 && this.random() < preset.blunderChance) {
      const alternatives: EngineMove[] = [];
      for (const [line, info] of outcome.infos) {
        const move = line >= 2 && info.pv[0] ? uciToMove(info.pv[0]) : null;
        if (move && (move.from !== best.from || move.to !== best.to)) alternatives.push(move);
      }
      if (alternatives.length > 0) {
        return alternatives[Math.floor(this.random() * alternatives.length)];
      }
    }
    return best;
  }

  async evaluate(fen: string, options: EvaluateOptions = {}): Promise<Evaluation> {
    const mover = sideToMove(fen);
    const outcome = await this.search({
      fen,
      skill: 20,
      multiPv: 1,
      depth: options.depth ?? DEFAULT_EVAL.depth,
      movetimeMs: options.movetimeMs ?? DEFAULT_EVAL.movetimeMs,
    });
    const info = outcome.infos.get(1);

    let mateIn: number | null = null;
    let cpWhite: number | null = null;
    if (info?.scoreMate !== undefined) {
      mateIn = info.scoreMate === 0 ? 0 : scoreToWhite(info.scoreMate, mover);
    } else if (info?.scoreCp !== undefined) {
      cpWhite = scoreToWhite(info.scoreCp, mover);
    }

    const principalVariation = (info?.pv ?? [])
      .map(uciToMove)
      .filter((m): m is EngineMove => m !== null);

    return { cpWhite, mateIn, bestMove: outcome.bestMove, principalVariation };
  }

  cancel(): void {
    this.seq++;
    this.abortActive();
  }

  dispose(): void {
    this.seq++;
    this.teardown(new EngineCancelledError());
  }

  // ---- starting up ----

  private async start(): Promise<void> {
    const transport = this.createTransport({
      onLine: (chunk) => this.handleOutput(chunk),
      onError: (error) => this.handleCrash(error),
    });
    this.transport = transport;

    transport.send("uci");
    await this.expect((line) => line === "uciok", this.initTimeoutMs, "uciok");
    transport.send("isready");
    await this.expect((line) => line === "readyok", this.initTimeoutMs, "readyok");
  }

  // ---- searching ----

  /** Runs a search; if the worker crashes, restarts it once and tries again. */
  private async search(request: SearchRequest): Promise<SearchOutcome> {
    const id = ++this.seq;
    this.abortActive();
    try {
      const outcome = await this.attempt(id, request);
      this.crashesInARow = 0;
      return outcome;
    } catch (error) {
      if (!(error instanceof EngineCrashError)) throw error;
      if (id !== this.seq) throw new EngineCancelledError();
      if (this.crashesInARow >= 1) {
        this.crashesInARow = 0;
        throw new EngineError("The chess engine stopped working. Try starting a new game.");
      }
      this.crashesInARow++;
      return this.attempt(id, request).then(
        (outcome) => {
          this.crashesInARow = 0;
          return outcome;
        },
        (retryError: unknown) => {
          if (retryError instanceof EngineCrashError) {
            this.crashesInARow = 0;
            throw new EngineError("The chess engine stopped working. Try starting a new game.");
          }
          throw retryError;
        },
      );
    }
  }

  private async attempt(id: number, request: SearchRequest): Promise<SearchOutcome> {
    await this.init();
    await this.whenIdle();
    if (id !== this.seq) throw new EngineCancelledError();
    if (!this.transport) await this.init();
    const transport = this.transport;
    if (!transport) throw new EngineCrashError("The engine is not running");

    return new Promise<SearchOutcome>((resolve, reject) => {
      const timer = setTimeout(
        () => this.handleCrash(new Error("The engine took too long to answer")),
        request.movetimeMs + this.searchSlackMs,
      );
      this.active = {
        infos: new Map(),
        resolve: (outcome) => {
          clearTimeout(timer);
          resolve(outcome);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      this.busy = true;
      transport.send(`setoption name Skill Level value ${request.skill}`);
      transport.send(`setoption name MultiPV value ${request.multiPv}`);
      transport.send(`position fen ${request.fen}`);
      transport.send(`go depth ${request.depth} movetime ${request.movetimeMs}`);
    });
  }

  /** Rejects the running search and asks the engine to stop. Its bestmove is swallowed later. */
  private abortActive(): void {
    const active = this.active;
    if (!active) return;
    this.active = undefined;
    active.reject(new EngineCancelledError());
    if (this.busy) this.transport?.send("stop");
  }

  /** Resolves once the engine has finished (or wound down) its last search. */
  private whenIdle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.idleWaiters.delete(done);
        resolve();
      };
      const timer = setTimeout(
        () => this.handleCrash(new Error("The engine did not stop when asked")),
        this.stopTimeoutMs,
      );
      this.idleWaiters.add(done);
    });
  }

  // ---- reading output ----

  private handleOutput(chunk: string): void {
    for (const raw of chunk.split("\n")) {
      const line = raw.trim();
      if (line) this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    for (const waiter of [...this.waiters]) {
      if (waiter.test(line)) {
        this.waiters.delete(waiter);
        waiter.resolve();
      }
    }

    if (line.startsWith("info")) {
      const info = parseInfo(line);
      if (info && this.active) this.active.infos.set(info.multipv, info);
      return;
    }

    const best = parseBestMove(line);
    if (best) {
      this.busy = false;
      const active = this.active;
      this.active = undefined;
      for (const done of [...this.idleWaiters]) done();
      active?.resolve({ bestMove: best.move, infos: active.infos });
    }
  }

  private expect(test: (line: string) => boolean, timeoutMs: number, what: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => this.handleCrash(new Error(`The engine did not answer (${what})`)),
        timeoutMs,
      );
      this.waiters.add({
        test,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  // ---- failure and cleanup ----

  private handleCrash(error: Error): void {
    if (!this.transport) return;
    this.teardown(new EngineCrashError(error.message));
  }

  /** Kills the worker and fails everything waiting on it. Safe to call twice. */
  private teardown(error: Error): void {
    const transport = this.transport;
    this.transport = undefined;
    this.initPromise = undefined;
    this.busy = false;
    transport?.terminate();

    const active = this.active;
    this.active = undefined;
    active?.reject(error);

    for (const waiter of [...this.waiters]) {
      this.waiters.delete(waiter);
      waiter.reject(error);
    }
    for (const done of [...this.idleWaiters]) done();
  }
}
