// Manual check of a whole guided game against the real Stockfish (bot AND coach engines).
// Skipped unless REAL_STOCKFISH=1:
//   REAL_STOCKFISH=1 npx vitest run tests/realGame.manual.test.ts --disable-console-intercept
import { appendFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { StockfishEngine } from "@/engine";
import { GameFlow } from "@/features/games";
import { ProgressStore } from "@/features/progress/ProgressStore";
import { parsePgnMoves } from "@/rules";
import { MemoryStorage } from "@/storage";
import { createNodeTransport } from "./nodeStockfishTransport";

const LOG = process.env.REAL_GAME_LOG;
const note = (line: string) => {
  if (LOG) appendFileSync(LOG, `${line}\n`);
};

describe.runIf(process.env.REAL_STOCKFISH === "1")("a real guided game (manual)", () => {
  it("plays several moves against the real bot with the real coach, then resigns and saves", async () => {
    const storage = new MemoryStorage();
    const progress = new ProgressStore(storage);
    const engines: StockfishEngine[] = [];
    const make = () => {
      const engine = new StockfishEngine({ createTransport: createNodeTransport });
      engines.push(engine);
      return engine;
    };
    const flow = new GameFlow({
      progress,
      createBotEngine: make,
      createAnalysisEngine: make,
      sessionDefaults: { botDelayMs: 0 },
    });
    flow.connect();
    await progress.load();

    await flow.startGame({ level: 1, playerColor: "white", coachingMode: "full" });
    const session = flow.getSnapshot().session;
    if (!session) throw new Error("no session");

    // Always play the first legal move found: not clever, but it is real play.
    for (let turn = 0; turn < 4; turn++) {
      const before = session.getSnapshot().sanMoves.length;
      await vi.waitFor(() => expect(session.getSnapshot().legalDests.size).toBeGreaterThan(0), { timeout: 20_000 });
      const [from, targets] = [...session.getSnapshot().legalDests.entries()][turn % 5];
      session.attemptMove(from, targets[0]);
      await vi.waitFor(() => expect(session.getSnapshot().sanMoves.length).toBeGreaterThanOrEqual(before + 2), {
        timeout: 20_000,
      });
    }

    await session.coachSettled();
    note(`moves: ${session.getSnapshot().sanMoves.join(" ")}`);
    for (const entry of session.getSnapshot().coachLog) note(`  ply ${entry.ply} (${entry.side}): ${entry.text}`);

    await flow.resign();
    const diary = progress.getSnapshot().diary;
    note(`saved game: ${JSON.stringify(diary.games[0]?.result)} mistakes=${JSON.stringify(diary.games[0]?.mistakes)}`);

    expect(diary.games).toHaveLength(1);
    expect(diary.games[0].result).toBe("abandoned");
    expect(diary.activeGame).toBeUndefined();
    const plies = parsePgnMoves(diary.games[0].pgn)?.length ?? 0;
    expect(plies).toBeGreaterThanOrEqual(8);
    expect(diary.games[0].coachLog.length).toBeGreaterThanOrEqual(plies - 1);

    engines.forEach((e) => e.dispose());
  }, 120_000);
});
