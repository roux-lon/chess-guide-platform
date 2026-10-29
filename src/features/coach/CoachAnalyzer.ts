import { COACH_CONFIG, TemplateNarrator } from "@/coach";
import type { CoachEvent, Narrator, TermId } from "@/coach";
import type { EngineAdapter, EngineMove, Evaluation } from "@/engine";
import type { Color, PromotionPiece } from "@/rules";
import { analyzeMove } from "./analyzeMove";
import type { CoachLogEntry } from "./types";

export interface CoachJob {
  fenBefore: string;
  from: string;
  to: string;
  promotion?: PromotionPiece;
  ply: number;
  playerColor: Color;
}

interface JobRecord extends CoachJob {
  cancelled: boolean;
}

export interface CoachAnalyzerOptions {
  /** A dedicated engine for analysis, so it never cancels the bot's search. */
  engine: EngineAdapter;
  narrator?: Narrator;
  /** Comments already made, such as those restored when a saved game is continued. */
  initialLog?: readonly CoachLogEntry[];
  /** Called whenever the log changes. */
  onChange?: () => void;
}

const CACHE_SIZE = 40;

/**
 * Owns the coach log. Moves are queued and analysed one at a time (an engine runs one
 * search at a time), the "after" evaluation of one move is reused as the "before" of the
 * next, and undo can drop queued or finished entries.
 */
export class CoachAnalyzer {
  private readonly engine: EngineAdapter;
  private readonly narrator: Narrator;
  private readonly onChange: () => void;

  private log: CoachLogEntry[] = [];
  private jobs: JobRecord[] = [];
  private explained = new Set<TermId>();
  private cache = new Map<string, Evaluation>();
  private chain: Promise<unknown> = Promise.resolve();

  constructor({
    engine,
    narrator = new TemplateNarrator(),
    initialLog = [],
    onChange = () => {},
  }: CoachAnalyzerOptions) {
    this.log = [...initialLog];
    this.engine = engine;
    this.narrator = narrator;
    this.onChange = onChange;
  }

  /** Starts the engine early so the first comment is quick. Failures show up on first use. */
  warmUp(): void {
    this.engine.init().catch(() => {});
  }

  /** Resolves when every move queued so far has been commented on (or dropped). */
  idle(): Promise<void> {
    return this.chain.then(() => undefined);
  }

  getLog(): readonly CoachLogEntry[] {
    return this.log;
  }

  /** Queues a move for analysis. Resolves with its log entry, or null if it was dropped or failed. */
  enqueue(job: CoachJob): Promise<CoachLogEntry | null> {
    const record: JobRecord = { ...job, cancelled: false };
    this.jobs.push(record);
    return this.schedule(() => this.run(record));
  }

  /** Keeps only the first `plies` half-moves of the log (used by undo). */
  truncate(plies: number): void {
    for (const job of this.jobs) {
      if (job.ply > plies) job.cancelled = true;
    }
    this.jobs = this.jobs.filter((job) => !job.cancelled);
    const kept = this.log.filter((entry) => entry.ply <= plies);
    if (kept.length !== this.log.length) {
      this.log = kept;
      this.onChange();
    }
  }

  /** Forgets everything, for a new game. */
  reset(): void {
    for (const job of this.jobs) job.cancelled = true;
    this.jobs = [];
    this.log = [];
    this.explained = new Set();
    this.cache.clear();
    this.engine.cancel();
    this.onChange();
  }

  /** The engine's best move for the player to play in `fen`, or null if it cannot say. */
  bestMoveFor(fen: string): Promise<EngineMove | null> {
    return this.schedule(async () => (await this.evaluate(fen))?.bestMove ?? null);
  }

  /** Narrates events outside the move log (hints), sharing the "terms explained" memory. */
  narrate(events: CoachEvent[]): string {
    const { text, explainedTerms } = this.narrator.narrate({ events, explained: this.explained });
    explainedTerms.forEach((t) => this.explained.add(t));
    return text;
  }

  dispose(): void {
    for (const job of this.jobs) job.cancelled = true;
    this.jobs = [];
    this.engine.dispose();
  }

  // ---- internals ----

  /** Runs `task` after everything queued before it, whatever happened to those. */
  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task);
    this.chain = result.catch(() => undefined);
    return result;
  }

  private async run(job: JobRecord): Promise<CoachLogEntry | null> {
    if (job.cancelled) return null;
    try {
      const result = await analyzeMove(
        { evaluate: (fen) => this.evaluate(fen), narrator: this.narrator },
        { ...job, explained: this.explained },
      );
      if (job.cancelled) return null;
      result.explainedTerms.forEach((t) => this.explained.add(t));
      this.log = [...this.log, result.entry];
      this.onChange();
      return result.entry;
    } catch {
      return null;
    }
  }

  /** Evaluates with the engine, remembering recent answers. Null if the engine fails or is cancelled. */
  private async evaluate(fen: string): Promise<Evaluation | null> {
    const cached = this.cache.get(fen);
    if (cached) return cached;
    try {
      const evaluation = await this.engine.evaluate(fen, COACH_CONFIG.analysisSearch);
      this.cache.set(fen, evaluation);
      if (this.cache.size > CACHE_SIZE) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
      return evaluation;
    } catch {
      return null;
    }
  }
}
