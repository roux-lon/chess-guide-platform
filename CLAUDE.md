# Chess Coach

A personal web app that teaches chess from zero by playing with the user and narrating every move. Static site, no database, no LLM in v1. The user is a complete chess beginner, so UI copy and coach text must never assume chess knowledge.

Full spec: @PLAN.md
Build prompts, one per phase: `docs/prompts/`

## Commands

- Dev server: `npm run dev`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint`
- Unit tests: `npm run test` (Vitest, runs once; config in `vitest.config.mts`)
- Static build: `npm run build` (writes the static site to `out/`, then `postbuild` writes `out/sw.js`, the offline helper)
- Deploy: see `docs/DEPLOY.md` (Cloudflare Pages). Hand checks: `docs/QA-CHECKLIST.md`
- Passcode hash: `node scripts/hash-passcode.mjs "word"`, then put the output in `.env.local` as `NEXT_PUBLIC_PASSCODE_HASH` (restart dev / rebuild after changing it)

- Copy engine files: `npm run copy-engine` (runs automatically on install, dev and build; puts the lite single-threaded Stockfish into `public/engine/`, which is gitignored)
- Real-Stockfish check (manual): `REAL_STOCKFISH=1 npx vitest run tests/realStockfish.manual.test.ts`

Engine notes: `engine/` owns Stockfish. Everything else uses `EngineAdapter` (`init`, `setLevel`, `getBotMove`, `evaluate`, `cancel`, `dispose`). Level presets are data in `engine/levels.ts`. `evaluate` always returns centipawns from White's perspective (`mateIn` too: positive = White mates); use `toMoverPerspective` before judging a move. For tests use `FakeEngine` (scripted) or `FakeUciHost` (fake worker). Never point tests at the real worker.

Coach notes: `coach/` is pure (no React, no browser, no engine import; it takes evaluations as plain numbers). Flow per move: `features/coach/analyzeMove` validates with rules, evaluates before/after (reusing the previous "after"), runs `coach/detectors`, and narrates with a `Narrator` (`TemplateNarrator`; wording lives in `coach/templates/`, thresholds and the event priority table in `coach/config.ts`). A `MoveContext` carries who just moved (`actor`), who is to move (`toMove`) and the `previousMove` (so a recapture is part of a trade). Every event carries `perspective` (`user`/`bot`) and `nature` (`threat`/`opportunity`/`trade`/`info`); NOTE the event's own tag is already called `kind`, so the threat/chance/trade/tip field is `nature` on events and `kind` on a `CoachComment`. The narrator turns the ranked events of a move into a `CoachComment { kind, toMove, headline, why, watch, more[], events }`: the top-priority event is the headline, `why` is the `move_purpose` (from `PURPOSE_WHY`), `watch` comes from `WATCH_TEMPLATES` (or a `GENERIC_WATCH` thinking habit), the rest go in `more`. `CoachLogEntry.text` is the same comment as one string (what the diary keeps); `comment` is missing for entries restored from a saved game. Detectors (all take a `MoveContext`, all tested on fixed FENs with `coach/testHelpers.ts`: `contextFor`, `contextsFromMoves`, `contextsFromSan`): `hangingPiece` (my own piece after MY move, by SEE), `missedThreat`, `threatCreated` (a move attacks something worth winning: a threat the other side must answer, never a chance), `opportunity` (only when it is the player's turn, so only after the bot's move), `doubleAttack`, `tradeSequence` (capture + recapture = one story; `captureTrade` skips recaptures), `responseToThreat` (bot moves only), `movePurpose` (always fires; `classifyPurpose` is also used by hints), `checkGiven`, `inCheckWarning`, `moveQuality`, `gameOver`. Position questions live in `rules/`: `staticExchange` (SEE, sees pieces hiding behind other attackers), and `rules/tactics.ts` (`isPieceSafe`, `unsafePieces`, `piecesNewlyAttacked`, `winnableThreats`, `doubleAttack`, `winningCaptures`, `undevelopedMinors`...). Hints (`coach/hints.ts`) are the thinking routine: 1 Safety check, 2 Plan check, 3 Best move with its purpose (or an honest "engine's pick"); titles are `HINT_TITLES`. A take-back is only offered for a hanging or missed piece worth at least `takeBackMinPoints` (a knight), or a blunder. The coach uses a SECOND engine instance (`analysisEngine`) because one engine runs one search at a time. `GameSession` owns the log, hint tiers (reset after every move) and the take-back offer; React only displays them (`ui/CoachDrawer`: headline big, why/watch small, `more` collapsed, kind and turn chips; labels in `content/coachText.ts`). Add a new detector: new file in `coach/detectors/`, register it in `detectors/index.ts`, add an event type in `events.ts` (with `...meta(perspective, nature)`), a priority key in `EVENT_PRIORITY`, template keys in `templates/templates.ts` (headline variants, plus `WATCH_TEMPLATES` if it has its own advice), and a `describeEvent` case in `narrate.ts` (a test fails until every template key is reachable). `coach/samples.test.ts` plays full games and fails on empty or restating comments; `coach/regression.test.ts` holds the real-play bugs (threat vs chance, queen trade, forks).
- Real-engine coach check (manual): `REAL_STOCKFISH=1 npx vitest run tests/realCoach.manual.test.ts`
- Real guided-game check (manual, bot + coach engines + saving): `REAL_STOCKFISH=1 npx vitest run tests/realGame.manual.test.ts`

Lesson notes: lessons are data in `src/content/lessons/stage*.ts` (typed in `content/types.ts`), never in components. Exercises are judged by `features/lessons/judge.ts` using `rules/` only (`explainIllegalMove` gives the reason for an illegal drag). Wording for wrong answers is in `content/feedback.ts`. `ExerciseRunner` runs one exercise, `LessonSession` sequences a lesson, `unlock.ts` decides what is open (linear). `validateCurriculum` (run by `curriculum.test.ts`) fails on an illegal FEN, a missing king, an unsolvable exercise, duplicate ids or a lesson without 3 to 6 exercises. Every position needs BOTH kings. To add a lesson: add it to the right `stage*.ts` list, then run `npm run test`. Routes: `/` hub, `/learn` map, `/learn/[lessonId]` lesson (static, one page per lesson id), `/play` the bot. The passcode gate, nav and the diary banner live in `app/layout.tsx`; `/settings` is the diary page.
Storage notes: the diary (shape per PLAN section 4, now version 3: games carry playerColor/botLevel/coachingMode and may be "abandoned", plus an optional `activeGame` (v2), plus `xp` and a daily `streak` {current, best, lastDay} (v3); do not change it again without asking, and any change needs a version bump + a step in `migrate.ts`) lives behind `storage/StorageAdapter`. `getStorage()` / `getStorageServices()` in `storage/getStorage.ts` is the ONLY place that picks the adapter by feature detection: `FileStorage` (File System Access API + IndexedDB handle, Chrome/Edge), `BrowserFallbackStorage` (localStorage plus Export/Import, Firefox/Safari), `MemoryStorage` (server render, tests). Only `storage/` may touch the File System Access API, IndexedDB or localStorage. Reading goes through `readDiary` = `migrate` (version steps in `migrate.ts`, add one and bump `DIARY_VERSION` when the shape changes) then strict `validateDiary`; an unreadable file is NEVER overwritten (status "invalid-file" blocks saves until the person saves a copy and starts fresh). Saves: `save(diary, { immediate: true })` for lesson/game end, plain `save(diary)` is debounced (`DebouncedWriter`); never save per move. `features/progress/ProgressStore` is the facade the UI uses (status, choose/reconnect file, legacy import, export/import, settings). localStorage keeps only tiny hints (`SmallStore`, key `chess-coach.small`). Test file storage with the fakes in `storage/testing.ts` (`FakeFileHandle`, `FakePicker`, `manualTimers`); the real picker and IndexedDB store are thin and checked by hand.

Games notes: a game is `GameSession` (one game, one id) and its whole life is `features/games/GameFlow` (menu -> playing -> review, resign, leave, resume, practice). `GameFlow` saves: finished/resigned games immediately via `ProgressStore.recordGame` (upsert by id, so an abandoned game that is resumed and finished stays ONE game; `mistakeCounts` is recomputed from the games, never incremented), the game in progress via `saveActiveGame` (debounced, never per move), and a left game as `abandoned` + kept as `activeGame` for "Continue your game". Coaching modes: full (danger highlights + latest comment), quiet (default, drawer), off (no analysis engine, no undo, no hints). Mistakes: `features/games/mistakes.ts` classifies the coach log (hanging_piece > missed_threat > bad_trade > blunder > mistake; one per move; the engine saying "good" vetoes the static findings); the new `coach/detectors/missedThreat` feeds it. Pure logic lives in `features/games/` (record, review, recommend, milestone, dashboard) and is tested; React only draws. Practice positions ("play it again from here") are never saved. The "Ready" checklist (`milestone.ts`) only says ready when every item is truly done.

Notes: chessground (board) is imported only in `src/ui/Board.tsx`; chess.js only in `src/rules/`. `engine/` does not import `rules/`: the random bot gets its legal-move list injected from `features/play/createEngine.ts`.

Polish notes (phase 7): the mascot is **Pip**, an original inline SVG in `ui/Mascot.tsx` with four moods (happy, thinking, oops, cheering); which mood to show is decided by pure functions in `features/mascot/moods.ts`. Design tokens live in `ui/theme.ts` AND `app/globals.css` (`@theme`); `ui/theme.test.ts` fails if they drift apart or if a text/background pair drops below WCAG AA (4.5:1), so change colours there, not in components. Rewards: `content/rewards.ts` (XP amounts: lesson +50 first time only, finished game +30, win +20, draw +10, abandoned 0; 100 XP per level) and `features/rewards/` (pure: `addActivity`, `liveStreak`, `levelOf`); `ProgressStore.completeLesson`/`recordGame` apply them (XP paid once, when a game first becomes finished; the streak uses the person's LOCAL calendar day via `lib/date.ts`). There is NO XP for practice positions. Home screen: `features/home/nextStep.ts` (pure) picks the one suggested step; `ui/HomeScreen.tsx` draws it. Confetti (`ui/Confetti.tsx`, canvas, no dependency) draws nothing under `prefers-reduced-motion` or when switched off; sound (`ui/sound.ts`) is generated with Web Audio, off by default; both are per-device `Prefs` in `SmallStore` (`features/preferences`). Keyboard play: `ui/MoveInput.tsx` + `features/play/parseMove.ts` (squares only, like "e2 e4"; no SAN such as "Nf3" yet). Offline: `scripts/sw.template.js` is turned into `out/sw.js` by `scripts/build-sw.mjs` (lists every file, cache name = build hash; pages network-first, files cache-first; a new version waits until the person presses Refresh). It registers only in production (`ui/OfflineHelper.tsx`). Its logic is tested in `tests/swTemplate.test.ts`. `public/_headers` keeps `sw.js` uncached and serves `.wasm` correctly. Errors: `app/error.tsx` and `app/not-found.tsx` use `ui/ErrorScreen.tsx`; the bot can be asked to retry (`GameSession.retryBot`).

## Ideas for v1.x and v2

Not built, not promised. v1 is finished when the person knows every rule and can play a full game comfortably (PLAN.md section 1).

- An LLM post-game summary and "ask the coach" chat. The key and the passcode check must move behind a server route first (a static site cannot hide a key). Keep it optional and off by default.
- More detectors: `fork_available` and `pin` (planned in PLAN.md section 6 as stretch goals).
- Openings: a few named openings with plain explanations, and "you left the opening" hints.
- Typing moves in standard notation ("Nf3", "O-O") in `parseMove.ts`.
- XP for practice positions and replayed lessons; more reward kinds (badges).
- Accounts and syncing between devices (would need a server; today the diary is a file you own).
- Support for Firefox/Safari file saving beyond Export/Import, if browsers add the File System Access API.

## Architecture

Layers, dependencies point DOWN only. Never import upward.

```
ui/        React components, screens, board, coach drawer
features/  lessons, guided-game, progress (orchestrate the layers below)
coach/     pure functions: position + move + analysis -> CoachEvent[] -> text
engine/    EngineAdapter interface + Stockfish worker implementation
rules/     thin wrapper over chess.js
storage/   StorageAdapter interface + browser and file implementations
content/   lessons and exercises as data
```

- `coach/`, `rules/`, `content/` contain no React and no browser APIs. They must be unit-testable in plain Node.
- Third-party libraries (chess.js, Stockfish, the board library, File System Access API) live behind our own adapters or wrappers. `ui/` never imports Stockfish or chess.js directly, and chess.js types do not leak out of `rules/`.
- Boundaries are interfaces: `EngineAdapter`, `StorageAdapter`, `Narrator`.

## Conventions

- Next.js App Router, static export (`output: 'export'`), strict TypeScript, no `any`.
- Tailwind for styling. Keep a small shared design-token file (colors, radii) so the playful theme is easy to change.
- Vitest for tests. Name test files `*.test.ts` next to the code or in `tests/`.
- Lesson text, exercises, and coach message templates live in data/template files, never inline in components.
- Evaluations from the engine are in centipawns from White's perspective. Convert to the mover's perspective before judging a move.
- Coach tone: short, encouraging, beginner vocabulary. Explain a chess term the first time it appears. Never snarky after a blunder.
- The app must work with no network after the first load, except for hosting itself.

## Workflow

- Work on ONE phase at a time, following PLAN.md section 9. Do not start the next phase's work early.
- Before coding, state your approach in 5 to 10 short bullets, then proceed.
- Ask before: adding a dependency (say why, and confirm it works in a static export), changing a layer boundary, or changing the diary JSON schema.
- At the end of each phase: run typecheck, lint, test and build. Report the phase's acceptance checks as pass/fail honestly. If something was not tested, say so. Never claim "done" on unverified work.
- Keep commits small. Suggest a commit message at the end of each phase.
- If this file's Commands or conventions become outdated, update it.

## Do not

- Do not put API keys or secrets in client code.
- Do not add a database, user accounts, or an LLM call in v1.
- Do not hardcode the passcode in plain text. Only its SHA-256 hash is stored (env var).
- Do not use copyrighted characters or assets. The mascot must be original.
- Do not write to the diary file on every move. Save on meaningful moments plus a debounce.

## Coach teaching rules

The coach shows how to think; it does not narrate the board. Full text: PLAN.md section 6.

1. **Know whose turn it is.** Every analysis carries who just moved and who is to move. A piece the bot attacks right after MY move is a *threat the bot must answer*, never a chance for me ("can you take it?" is hope-chess). A chance exists only when it is MY turn and I can win material right now, which means only after the bot's move.
2. **Judge by exchange, not by looks.** "Safe", "hanging", "worth winning" and "good trade" all come from static exchange evaluation (SEE), not from "is it attacked?".
3. **One story per exchange.** A capture and its recapture is one trade ("Queen trade"), judged by material. The recapture is never described as the other side "leaving a piece unprotected".
4. **One main idea per comment.** Rank the findings, lead with the top one (the headline), say why the move was played (its purpose) and what to watch (the opponent's best reply or the main danger). Everything else goes under "more".
5. **Never restate the move.** The log already shows it. If nothing teachable happened, give the purpose of the move in a few words (develop, control the center, castle, retreat...) or say honestly that it was a quiet move.
6. **Hints are the thinking routine:** (1) Safety check: which of my pieces are in danger, or plainly "nothing is". (2) Plan check: the biggest thing still undone, or the bot's main threat. (3) The engine's move, with its purpose and a reason that can be verified. If the purpose is unclear, say it is the engine's pick.
7. **Take-back only for real problems** (a piece hanging by SEE, or a blunder), never for noise.
8. **Tone:** short, encouraging, beginner words. Explain a chess term the first time it appears. Never snarky after a blunder.
