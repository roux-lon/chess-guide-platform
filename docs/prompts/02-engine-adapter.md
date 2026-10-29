# Phase 2: Stockfish engine adapter

Read `CLAUDE.md` and `PLAN.md` (sections 2, 3, 6 and 9) first. This is phase 2 of 7. Phase 1 is committed and working.

## Goal

Replace the random bot with Stockfish running in a Web Worker behind our `EngineAdapter`, with adjustable bot strength and position evaluation we can use later for coaching.

## Tasks

1. **Pick the package.** Find a Stockfish WASM build that is single-threaded or "lite", so it works on a static host without COOP/COEP headers. Before installing, tell me the package, its size, and why it fits a static export, then wait for my OK (CLAUDE.md rule).
2. **Self-host the engine files** in `public/` so the app works offline after first load. No CDN loading at runtime.
3. **Extend `EngineAdapter`** (keep it library-agnostic). It needs roughly:
   - `init()` and `dispose()`
   - `setLevel(level)` for presets 1 to 5 (1 = very weak, for a true beginner)
   - `getBotMove(fen)` returning a move in our own move type
   - `evaluate(fen, options?)` returning `{ cpWhite: number | null, mateIn: number | null, bestMove, principalVariation }`
   - cancel any in-flight search when a new request arrives
4. **`StockfishEngine` implementation** in `engine/`: owns the worker, speaks UCI, handles `uciok`/`readyok`, parses `info` and `bestmove`, has timeouts, and recovers if the worker crashes (restart once, then surface an error).
5. **Level presets as data** in a config file: Skill Level, depth or movetime, and for level 1 and 2 a bit of deliberate randomness (occasionally pick a weaker move) so a beginner can win. Explain your numbers in comments; we will tune by playing.
6. **Evaluation convention:** the adapter returns centipawns from White's perspective, always. Add a small pure helper in `engine/` (or `lib/`) to convert to the mover's perspective, with unit tests.
7. **Wire the game page** to use `StockfishEngine`. Add a level picker (simple for now) and a "thinking..." state. Keep `RandomMoveEngine` for tests.
8. **Tests:** unit tests for UCI parsing and the perspective helper using a fake worker. A fake `EngineAdapter` for later phases' tests. Real-Stockfish checks are manual.

## Out of scope

Coach logic, lessons, storage, styling polish.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] I can play a full legal game against Stockfish at levels 1 to 5, and level 1 is clearly beatable
- [ ] The UI thread never freezes while the bot thinks
- [ ] Changing level mid-game works; starting a new game cancels any old search
- [ ] Engine files are served from our own `public/`; the game still works with the network off after first load
- [ ] No Stockfish import outside `engine/`
- [ ] Evaluation of a known position (for example after a free queen capture) has the expected sign from both sides' perspective

Finish with a short report and a suggested commit message.
