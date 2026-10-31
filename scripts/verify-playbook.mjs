// Checks the opening playbook against the real Stockfish (the lite single-threaded build the app
// uses, run in Node). It plays the coach's suggested moves for White and for Black against several
// typical bot replies, and flags any suggestion that is about 100 centipawns (a pawn) worse than
// the engine's best move.
//
//   node scripts/verify-playbook.mjs            (depth 10)
//   VERIFY_DEPTH=14 node scripts/verify-playbook.mjs
//
// The checking itself lives in tests/verifyPlaybook.manual.test.ts so it can use the app's own
// playbook and opening code (one source of truth). This file just starts it. It prints a report
// and does not fail because of flags: they are for a person to read.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const result = spawnSync(
  npx,
  ["vitest", "run", "tests/verifyPlaybook.manual.test.ts", "--silent=false"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, VERIFY_PLAYBOOK: "1" } },
);
process.exit(result.status ?? 1);
