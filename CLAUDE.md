# Chess Coach

A personal web app that teaches chess from zero by playing with the user and narrating every move. Static site, no database, no LLM in v1. The user is a complete chess beginner, so UI copy and coach text must never assume chess knowledge.

Full spec: @PLAN.md
Build prompts, one per phase: `docs/prompts/`

## Commands

- Dev server: `npm run dev`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint`
- Unit tests: `npm run test` (Vitest, runs once; config in `vitest.config.mts`)
- Static build: `npm run build` (writes the static site to `out/`)
- Passcode hash: `node scripts/hash-passcode.mjs "word"`, then put the output in `.env.local` as `NEXT_PUBLIC_PASSCODE_HASH` (restart dev / rebuild after changing it)

- Copy engine files: `npm run copy-engine` (runs automatically on install, dev and build; puts the lite single-threaded Stockfish into `public/engine/`, which is gitignored)
- Real-Stockfish check (manual): `REAL_STOCKFISH=1 npx vitest run tests/realStockfish.manual.test.ts`

Engine notes: `engine/` owns Stockfish. Everything else uses `EngineAdapter` (`init`, `setLevel`, `getBotMove`, `evaluate`, `cancel`, `dispose`). Level presets are data in `engine/levels.ts`. `evaluate` always returns centipawns from White's perspective (`mateIn` too: positive = White mates); use `toMoverPerspective` before judging a move. For tests use `FakeEngine` (scripted) or `FakeUciHost` (fake worker). Never point tests at the real worker.

Coach notes: `coach/` is pure (no React, no browser, no engine import; it takes evaluations as plain numbers). Flow per move: `features/coach/analyzeMove` validates with rules, evaluates before/after (reusing the previous "after"), runs `coach/detectors`, and narrates with a `Narrator` (`TemplateNarrator`; wording lives in `coach/templates/`, thresholds in `coach/config.ts`). Detectors take a `MoveContext` and are tested on fixed FENs with `coach/testHelpers.ts` (`contextFor`). The coach uses a SECOND engine instance (`analysisEngine`) because one engine runs one search at a time. `GameSession` owns the log, hint tiers (reset after every move) and the take-back offer; React only displays them. Add a new detector: new file in `coach/detectors/`, register it in `detectors/index.ts`, add an event type in `events.ts`, template keys in `templates/templates.ts`, and a `describeEvent` case in `narrate.ts` (a test fails until every template key is reachable).
- Real-engine coach check (manual): `REAL_STOCKFISH=1 npx vitest run tests/realCoach.manual.test.ts`

Lesson notes: lessons are data in `src/content/lessons/stage*.ts` (typed in `content/types.ts`), never in components. Exercises are judged by `features/lessons/judge.ts` using `rules/` only (`explainIllegalMove` gives the reason for an illegal drag). Wording for wrong answers is in `content/feedback.ts`. `ExerciseRunner` runs one exercise, `LessonSession` sequences a lesson, `unlock.ts` decides what is open (linear). `validateCurriculum` (run by `curriculum.test.ts`) fails on an illegal FEN, a missing king, an unsolvable exercise, duplicate ids or a lesson without 3 to 6 exercises. Every position needs BOTH kings. To add a lesson: add it to the right `stage*.ts` list, then run `npm run test`. Routes: `/` hub, `/learn` map, `/learn/[lessonId]` lesson (static, one page per lesson id), `/play` the bot. The passcode gate and nav live in `app/layout.tsx`.
Storage notes: `storage/StorageAdapter.ts` is the interface (load/save the whole diary, shape per PLAN section 4, version 1). Phase 4 uses `BrowserStorage` (localStorage); `features/progress/ProgressStore` saves when a lesson is finished. The diary schema must not change without asking.

Notes: chessground (board) is imported only in `src/ui/Board.tsx`; chess.js only in `src/rules/`. `engine/` does not import `rules/`: the random bot gets its legal-move list injected from `features/play/createEngine.ts`.

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
