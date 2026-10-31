// Manual check of the opening playbook against the real Stockfish. Skipped unless
// VERIFY_PLAYBOOK=1; normally run through `node scripts/verify-playbook.mjs`.
//
// For several typical bot replies, it plays the coach's suggested moves for both colours. At every
// step it asks Stockfish how good each suggestion is next to the engine's best move and flags any
// suggestion that is about 100 centipawns (one pawn) worse. It reports; it does not fail on flags.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { afterAll, describe, it } from "vitest";
import { StockfishEngine } from "@/engine";
import type { UciTransportFactory } from "@/engine";
import { openingView } from "@/features/opening";
import { createGame } from "@/rules";
import type { Color } from "@/rules";

const require = createRequire(import.meta.url);
const FLAG_CP = 100;
const DEPTH = Number(process.env.VERIFY_DEPTH ?? 10);
const MATE_CP = 10_000;

const createTransport: UciTransportFactory = ({ onLine, onError }) => {
  const enginePath = (require("stockfish") as { findEngine(name: string): string }).findEngine("lite-single");
  const child = spawn(process.execPath, [enginePath], { stdio: "pipe" });
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(onLine);
  });
  child.on("error", onError);
  return { send: (command) => child.stdin.write(command + "\n"), terminate: () => void child.kill() };
};

/** The bot's habits: the first wish that is legal is played, else a quiet pawn move. */
const BOT_PROFILES: Record<Color, Record<string, string[]>> = {
  // The bot plays Black against a White player.
  black: {
    "classical (e5, Nc6, Nf6, Bc5)": ["e7e5", "b8c6", "g8f6", "f8c5", "d7d6", "e8g8", "c8e6"],
    "symmetrical d-pawn (d5, Nf6, e6, Be7)": ["d7d5", "g8f6", "e7e6", "f8e7", "e8g8", "b8d7", "c7c6"],
    "fianchetto (g6, Bg7, d6)": ["g7g6", "f8g7", "d7d6", "g8f6", "e8g8", "b8c6", "c8g4"],
    "French / Caro (e6, d5, c6)": ["e7e6", "d7d5", "c7c6", "g8f6", "f8e7", "e8g8", "b8d7"],
    "early queen (d5, Qxd5, Qa5)": ["d7d5", "d5e4", "d8d5", "d5a5", "b8c6", "g8f6", "c8g4"],
  },
  // The bot plays White against a Black player.
  white: {
    "king pawn (e4, Nf3, Nc3, Bc4)": ["e2e4", "g1f3", "b1c3", "f1c4", "d2d3", "e1g1", "c1e3"],
    "queen pawn (d4, Nf3, c4, Nc3)": ["d2d4", "g1f3", "c2c4", "b1c3", "c1f4", "e2e3", "f1e2"],
    "english / reti (c4, Nf3, g3)": ["c2c4", "g1f3", "g2g3", "f1g2", "e1g1", "b1c3", "d2d3"],
    "fianchetto (Nf3, g3, Bg2)": ["g1f3", "g2g3", "f1g2", "e1g1", "d2d3", "b1d2", "e2e4"],
  },
};

function botMove(game: ReturnType<typeof createGame>, wishes: readonly string[]) {
  const legal = game.legalMoves();
  for (const wish of wishes) {
    const found = legal.find((l) => l.from === wish.slice(0, 2) && l.to === wish.slice(2, 4));
    if (found) return found;
  }
  return legal.find((l) => !l.captured && !l.san.includes("+") && l.piece === "pawn") ?? legal[0];
}

describe.runIf(process.env.VERIFY_PLAYBOOK === "1")("opening playbook against real Stockfish (manual)", () => {
  const engine = new StockfishEngine({ createTransport });
  afterAll(() => engine.dispose());

  /** Points for `color`, mate counted as a huge number. */
  async function scoreFor(fen: string, color: Color) {
    const ev = await engine.evaluate(fen, { depth: DEPTH, movetimeMs: 1500 });
    const white = ev.mateIn !== null ? (ev.mateIn > 0 ? MATE_CP : -MATE_CP) : (ev.cpWhite ?? 0);
    return { score: color === "white" ? white : -white, best: ev.bestMove };
  }

  it(
    "reports every step where a suggestion is clearly worse than the engine's best move",
    async () => {
      const flags: string[] = [];
      const lines: string[] = [];
      let steps = 0;
      let suggestionsChecked = 0;
      let completed = 0;
      let runs = 0;

      for (const color of ["white", "black"] as const) {
        for (const [name, wishes] of Object.entries(BOT_PROFILES[color === "white" ? "black" : "white"])) {
          runs++;
          const game = createGame();
          const played: string[] = [];
          for (let guard = 0; guard < 60; guard++) {
            const view = openingView(game.fen(), color, game.history());
            if (view.ended) break;
            if (game.turn() !== color) {
              const m = botMove(game, wishes);
              game.tryMove(m.from, m.to, m.promotion);
              played.push(m.san);
              continue;
            }
            steps++;
            const before = await scoreFor(game.fen(), color);
            if (view.step.kind === "chance") {
              const m = game.tryMove(view.step.move.from, view.step.move.to, view.step.move.promotion);
              if (!m) throw new Error("capture was illegal");
              played.push(`${m.san}(chance)`);
              continue;
            }
            if (view.step.kind !== "goal") {
              // A danger to handle first: let the engine choose, and say so.
              const fallback = before.best ?? game.legalMoves()[0];
              const m = game.tryMove(fallback.from, fallback.to, fallback.promotion);
              if (!m) throw new Error("engine move was illegal");
              played.push(`${m.san}(${view.step.kind})`);
              continue;
            }
            for (const [i, s] of view.step.moves.entries()) {
              const after = createGame(game.fen());
              after.tryMove(s.from, s.to);
              const result = await scoreFor(after.fen(), color);
              const drop = before.score - result.score;
              suggestionsChecked++;
              if (drop > FLAG_CP) {
                flags.push(
                  `${color} vs ${name}: after ${played.join(" ") || "(start)"}, suggestion ${i + 1} ${s.san} (${view.step.goalId}) is ${drop} cp below the engine's best (${before.best ? `${before.best.from}${before.best.to}` : "none"})`,
                );
              }
            }
            const first = view.step.moves[0];
            const m = game.tryMove(first.from, first.to);
            if (!m) throw new Error("suggestion was illegal");
            played.push(m.san);
          }
          const final = openingView(game.fen(), color, game.history());
          if (final.complete) completed++;
          lines.push(
            `${color} vs ${name}: ${final.complete ? "complete" : "NOT complete"} in ${final.myMoves} moves (${final.goals
              .filter((g) => g.done)
              .map((g) => g.id)
              .join(", ") || "none"})\n   ${played.join(" ")}`,
          );
        }
      }

      console.log(
        [
          "",
          "=== Opening playbook check (real Stockfish, depth " + DEPTH + ") ===",
          ...lines,
          "",
          `Runs: ${runs}. Completed the checklist: ${completed}. My turns: ${steps}. Suggestions checked: ${suggestionsChecked}.`,
          flags.length === 0 ? "Flags: none." : `Flags (${flags.length}):\n - ${flags.join("\n - ")}`,
          "",
        ].join("\n"),
      );
    },
    30 * 60_000,
  );
});
