import { describe, expect, it, vi } from "vitest";
import type { CoachEvent } from "@/coach";
import { FakeEngine } from "@/engine";
import type { Evaluation } from "@/engine";
import { START_FEN } from "@/rules";
import { CoachAnalyzer } from "./CoachAnalyzer";
import type { CoachJob } from "./CoachAnalyzer";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const flat: Evaluation = {
  cpWhite: 20,
  mateIn: null,
  bestMove: { from: "e2", to: "e4" },
  principalVariation: [],
};

const e4: CoachJob = { fenBefore: START_FEN, from: "e2", to: "e4", ply: 1, playerColor: "white" };
const e5: CoachJob = { fenBefore: AFTER_E4, from: "e7", to: "e5", ply: 2, playerColor: "white" };

function setup(evaluations: (fen: string) => Evaluation = () => flat) {
  const engine = new FakeEngine([], evaluations);
  const onChange = vi.fn();
  const analyzer = new CoachAnalyzer({ engine, onChange });
  return { engine, analyzer, onChange };
}

describe("CoachAnalyzer", () => {
  it("logs moves in order and notifies on each", async () => {
    const { analyzer, onChange } = setup();
    await Promise.all([analyzer.enqueue(e4), analyzer.enqueue(e5)]);
    expect(analyzer.getLog().map((e) => [e.ply, e.moveSan, e.side])).toEqual([
      [1, "e4", "you"],
      [2, "e5", "bot"],
    ]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("reuses the 'after' evaluation as the next 'before'", async () => {
    const { analyzer, engine } = setup();
    await analyzer.enqueue(e4);
    await analyzer.enqueue(e5);
    // start, after e4, after e5: three positions for two moves, not four.
    expect(engine.evaluateRequests).toHaveLength(3);
    expect(engine.evaluateRequests[1]).toBe(AFTER_E4);
  });

  it("drops queued jobs on truncate and keeps earlier entries", async () => {
    const { analyzer } = setup();
    const first = analyzer.enqueue(e4);
    const second = analyzer.enqueue(e5);
    analyzer.truncate(1);
    expect(await first).not.toBeNull();
    expect(await second).toBeNull();
    expect(analyzer.getLog().map((e) => e.ply)).toEqual([1]);
  });

  it("removes finished entries on truncate", async () => {
    const { analyzer, onChange } = setup();
    await analyzer.enqueue(e4);
    await analyzer.enqueue(e5);
    onChange.mockClear();
    analyzer.truncate(1);
    expect(analyzer.getLog().map((e) => e.ply)).toEqual([1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    analyzer.truncate(5);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("accepts a different move for a ply that was undone", async () => {
    const { analyzer } = setup();
    await analyzer.enqueue(e4);
    await analyzer.enqueue(e5);
    analyzer.truncate(1);
    await analyzer.enqueue({ ...e5, from: "c7", to: "c5" });
    expect(analyzer.getLog().map((e) => e.moveSan)).toEqual(["e4", "c5"]);
  });

  it("resets for a new game and cancels the engine", async () => {
    const { analyzer, engine } = setup();
    await analyzer.enqueue(e4);
    analyzer.reset();
    expect(analyzer.getLog()).toEqual([]);
    expect(engine.cancelCount).toBe(1);
  });

  it("still logs a move when the engine fails", async () => {
    const { analyzer } = setup(() => {
      throw new Error("engine down");
    });
    const entry = await analyzer.enqueue(e4);
    expect(entry?.text).toMatch(/middle|center/i);
  });

  it("ignores an illegal job without breaking the queue", async () => {
    const { analyzer } = setup();
    const bad = await analyzer.enqueue({ ...e4, to: "e6" });
    expect(bad).toBeNull();
    expect(await analyzer.enqueue(e4)).not.toBeNull();
  });

  it("finds the best move for a position, using the cache", async () => {
    const { analyzer, engine } = setup();
    expect(await analyzer.bestMoveFor(START_FEN)).toEqual({ from: "e2", to: "e4" });
    expect(await analyzer.bestMoveFor(START_FEN)).toEqual({ from: "e2", to: "e4" });
    expect(engine.evaluateRequests).toHaveLength(1);
  });

  it("returns null when no best move is known", async () => {
    const { analyzer } = setup(() => ({ ...flat, bestMove: null }));
    expect(await analyzer.bestMoveFor(START_FEN)).toBeNull();
  });

  it("shares the 'terms explained' memory with hint narration", () => {
    const { analyzer } = setup();
    const events: CoachEvent[] = [
      { kind: "hint_safety", perspective: "user", nature: "info", unsafe: [], inCheck: true },
    ];
    const first = analyzer.narrate(events);
    const second = analyzer.narrate(events);
    expect(first).toContain("Check");
    expect(second).not.toContain("means a king is under attack");
  });
});
