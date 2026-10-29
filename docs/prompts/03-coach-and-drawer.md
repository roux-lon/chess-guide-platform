# Phase 3: Coach layer and comment drawer

Read `CLAUDE.md` and `PLAN.md` (section 6 especially) first. This is phase 3 of 7. Phases 1 and 2 are committed.

## Goal

Every move in a game, mine and the bot's, gets a short beginner-friendly comment. Comments live in a slide-out drawer, not on the board. An "I'm stuck" button gives tiered hints.

## Tasks

1. **Extend `rules/`** with what the coach needs, still hiding chess.js: attackers and defenders of a square, pieces attacked by a given piece, whether a piece is hanging (attacked and undefended, or attacked by a cheaper piece), piece values. Unit tests on fixed FENs.
2. **`coach/events.ts`:** typed `CoachEvent` union. Each event carries the data needed to narrate it (squares, pieces, values), not text.
3. **Detectors** in `coach/detectors/`, one file each, each a pure function with its own tests on fixed FEN positions:
   - `hangingPiece` (mine or the bot's)
   - `captureTrade` (good, equal or bad trade by piece value)
   - `checkGiven` and `inCheckWarning`
   - `threatFromOpponent` (what the last bot move attacks)
   - `goodDevelopment` and `centerControl` (early game)
   - `moveQuality` (`good`, `mistake`, `blunder` from evaluation swing, mover's perspective; thresholds in a config file)
   Skip fork and pin for now unless they come out simple.
4. **`Narrator` interface** and a `TemplateNarrator` in `coach/narrate.ts`: events to text, using template files (several variants per event so it is not repetitive). Tone per CLAUDE.md: short, encouraging, beginner vocabulary, explain a term the first time it appears (track "terms already explained" in coach state). Never snarky.
5. **`analyzeMove` pipeline** in `features/`: validate with rules, get evaluation before and after from the engine, run detectors, narrate, append to a `coachLog` entry `{ ply, moveSan, side, events, text }`. The bot's moves go through the same pipeline.
6. **Coach drawer UI:** slide-out panel with the move log, newest comment highlighted, auto-opens only when the user presses "I'm stuck" or taps the coach button. Board stays clean. Keyboard accessible (Esc closes).
7. **"I'm stuck" hints,** tiered, each press reveals the next tier: (1) which piece or area to look at, (2) what the bot is threatening right now, (3) the suggested move. Tier 3 uses the engine's best move.
8. **Take-back offer:** when my move creates a `hangingPiece` or `blunder` for me, show an "Undo my move?" button with a friendly warning. This is optional for me to use.
9. Keep evaluation calls reasonable: reuse the "after" evaluation of one move as the "before" of the next.

## Out of scope

Lessons, storage, saving games, visual polish.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] Detector tests pass on fixed FENs, including at least one case per detector where it should NOT fire
- [ ] Every move, mine and the bot's, produces a comment in the drawer
- [ ] No coach logic lives in React components
- [ ] Hint tiers escalate and reset after a move is played
- [ ] Hanging a piece on purpose triggers a warning and the undo offer
- [ ] `coach/` has no React or browser imports

Finish with a short report and a suggested commit message.
