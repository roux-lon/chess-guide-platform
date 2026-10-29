// Manual check of the coach pipeline against the real Stockfish. Skipped unless REAL_STOCKFISH=1:
//   REAL_STOCKFISH=1 npx vitest run tests/realCoach.manual.test.ts
import { afterAll, describe, expect, it } from "vitest";
import { StockfishEngine } from "@/engine";
import { CoachAnalyzer } from "@/features/coach";
import { createNodeTransport } from "./nodeStockfishTransport";

describe.runIf(process.env.REAL_STOCKFISH === "1")("coach with real Stockfish (manual)", () => {
  const engine = new StockfishEngine({ createTransport: createNodeTransport });
  const analyzer = new CoachAnalyzer({ engine });
  afterAll(() => analyzer.dispose());

  // White queen d1 can take the loose black queen on d5.
  const FEN = "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";

  it("suggests taking the free queen", async () => {
    expect(await analyzer.bestMoveFor(FEN)).toEqual({ from: "d1", to: "d5" });
  }, 30_000);

  it("praises taking the queen and warns about leaving yours loose", async () => {
    const good = await analyzer.enqueue({
      fenBefore: FEN,
      from: "d1",
      to: "d5",
      ply: 1,
      playerColor: "white",
    });
    expect(good?.warning).toBeUndefined();
    expect(good?.text).toMatch(/captured|took/i);

    analyzer.reset();
    const bad = await analyzer.enqueue({
      fenBefore: FEN,
      from: "e1",
      to: "f2",
      ply: 1,
      playerColor: "white",
    });
    console.log("good:", good?.text);
    console.log("bad:", bad?.text, bad?.events.map((e) => e.kind));
    expect(bad?.warning).toBeDefined();
    expect(bad?.events.some((e) => e.kind === "hanging_piece")).toBe(true);
    expect(bad?.events.some((e) => e.kind === "move_quality" && e.quality === "blunder")).toBe(true);
  }, 60_000);
});
