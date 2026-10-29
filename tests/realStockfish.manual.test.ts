// Manual check against the real Stockfish files. Skipped unless REAL_STOCKFISH=1:
//   REAL_STOCKFISH=1 npx vitest run tests/realStockfish.manual.test.ts
// Runs the same lite single-threaded build the browser uses, through our StockfishEngine.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";
import { StockfishEngine } from "@/engine";
import type { UciTransportFactory } from "@/engine";

const require = createRequire(import.meta.url);

const createTransport: UciTransportFactory = ({ onLine, onError }) => {
  const enginePath = (require("stockfish") as { findEngine(name: string): string }).findEngine(
    "lite-single",
  );
  const child = spawn(process.execPath, [enginePath], { stdio: "pipe" });
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(onLine);
  });
  child.on("error", onError);
  return {
    send: (command) => child.stdin.write(command + "\n"),
    terminate: () => void child.kill(),
  };
};

describe.runIf(process.env.REAL_STOCKFISH === "1")("real Stockfish (manual)", () => {
  const engine = new StockfishEngine({ createTransport });
  afterAll(() => engine.dispose());

  // White queen on d1 can take the undefended black queen on d5.
  const WHITE_WINS_QUEEN = "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";
  // Same idea with colours swapped: Black to move takes the white queen.
  const BLACK_WINS_QUEEN = "4k3/8/8/3q4/8/8/8/3Q2K1 b - - 0 1";

  it("evaluates a free queen with the right sign for each side", async () => {
    const white = await engine.evaluate(WHITE_WINS_QUEEN, { depth: 8, movetimeMs: 1000 });
    const black = await engine.evaluate(BLACK_WINS_QUEEN, { depth: 8, movetimeMs: 1000 });
    expect(white.cpWhite).toBeGreaterThan(500);
    expect(black.cpWhite).toBeLessThan(-500);
    expect(white.bestMove).toEqual({ from: "d1", to: "d5" });
    expect(black.bestMove).toEqual({ from: "d5", to: "d1" });
  }, 30_000);

  it("reports mate from White's perspective", async () => {
    const whiteMates = await engine.evaluate("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", { depth: 6 });
    expect(whiteMates.mateIn).toBe(1);
    const blackMates = await engine.evaluate("r3k3/8/8/8/8/8/5PPP/6K1 b - - 0 1", { depth: 6 });
    expect(blackMates.mateIn).toBe(-1);
  });

  it("plays a legal-looking move at every level", async () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      engine.setLevel(level);
      const move = await engine.getBotMove(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      );
      expect(move.from).toMatch(/^[a-h][1-8]$/);
      expect(move.to).toMatch(/^[a-h][1-8]$/);
    }
  }, 30_000);
});
