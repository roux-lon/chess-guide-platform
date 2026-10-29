import { StockfishEngine } from "./StockfishEngine";
import { createWorkerTransport } from "./workerTransport";

/**
 * Served from our own public/ folder (copied there by scripts/copy-engine.mjs), so
 * nothing loads from a CDN. The lite single-threaded build needs no special headers.
 */
export const STOCKFISH_SCRIPT_URL = "/engine/stockfish-19-lite-single.js";

/** The worker is only created on init(), so this is safe to call during server rendering. */
export function createStockfishEngine(): StockfishEngine {
  return new StockfishEngine({ createTransport: createWorkerTransport(STOCKFISH_SCRIPT_URL) });
}
