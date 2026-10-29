# Chess Coach: v1 Plan

A personal, web-hosted app that teaches chess from zero by playing with you and narrating the game. Built to grow into v1.x / v2, so the codebase is layered and testable from day one.

## 1. Goal and "done"

**Done with v1 means:** the user knows every rule of chess and can play a full game against the bot comfortably, using the coach drawer only when stuck.

**Non-goals for v1:** accounts, multiplayer, a database, an LLM, openings theory, ratings, mobile app.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Hosting | Static site (free host: Vercel, Netlify, or Cloudflare Pages) |
| Stack | Next.js (App Router, static export), strict TypeScript, Tailwind |
| Rules | chess.js |
| Engine | Stockfish WASM in a Web Worker, behind an adapter. Use a single-threaded/lite build so no special COOP/COEP headers are needed on static hosts (verify at install time) |
| Coach | Pure TypeScript logic, no LLM in v1 |
| Cost | $0 to run. LLM is optional later, key server-side only |
| Storage | Small data in browser storage, history in a user-chosen JSON file (see 4) |
| Access | Passcode gate on open (see 5) |
| Look and feel | Playful (see 7) |

## 3. Architecture

Strict layering. Dependencies point downward only. UI never imports Stockfish or chess.js directly.

```
ui/            React components, screens, board, coach drawer
  ↓
features/      lessons, guided-game, progress (orchestrate the layers below)
  ↓
coach/         pure functions: (position, move, analysis) -> CoachEvent[] -> text
engine/        EngineAdapter interface + Stockfish worker implementation
rules/         thin wrapper over chess.js (legal moves, check, special moves)
storage/       StorageAdapter interface + browser/file implementations
content/       lessons and exercises as data (TS/JSON), not in components
```

Suggested folders:

```
src/
  app/                 Next.js routes
  ui/                  components
  features/
  coach/
    events.ts          CoachEvent types
    detectors/         one file per detector (hangingPiece, fork, development...)
    narrate.ts         event -> friendly text (templates, easy to swap for an LLM later)
  engine/
    EngineAdapter.ts
    stockfishWorker.ts
  rules/
  storage/
    StorageAdapter.ts
    browserStorage.ts
    fileStorage.ts
  content/lessons/
  lib/
tests/
```

Rules for the codebase:
- `coach/`, `rules/`, `content/` have no React and no browser APIs, so they are unit-testable.
- Every layer has an interface at its boundary (`EngineAdapter`, `StorageAdapter`, `Narrator`) so v2 can swap implementations.
- Coach detectors are tested with fixed FEN positions.

## 4. Storage: history in a file

**Reality check:** a website cannot silently write to your disk. The way to do it is the browser's File System Access API: you pick a file once, the app keeps the handle, and then reads and writes it directly.

How it works:
1. First run: "Choose where to keep your chess diary." The user picks or creates `chess-progress.json`.
2. The file handle is saved in IndexedDB.
3. Each new session, one click on "Reconnect my diary" re-grants permission (browsers require a user gesture).
4. All history is written to that file. Browser storage keeps only small things: settings, the file handle, and a lightweight cache of the last lesson pointer.

**Limits:**
- Works in Chrome and Edge (desktop). Not Firefox or Safari.
- Fallback for unsupported browsers: keep data in browser storage and show **Export / Import JSON** buttons, with a reminder to export now and then.

**File shape (versioned, so it can be migrated):**

```json
{
  "version": 1,
  "updatedAt": "ISO date",
  "settings": { "botLevel": 1, "coachTone": "playful" },
  "lessons": { "pawn-moves": { "status": "done", "completedAt": "..." } },
  "games": [
    {
      "id": "...",
      "playedAt": "...",
      "result": "win|loss|draw",
      "pgn": "...",
      "coachLog": [ { "ply": 5, "event": "hanging_piece", "text": "..." } ],
      "mistakes": [ { "ply": 12, "type": "hanging_piece" } ]
    }
  ],
  "mistakeCounts": { "hanging_piece": 7, "missed_check_threat": 3 }
}
```

Write on meaningful moments (end of a lesson, end of a game, plus a debounced save), not every move.

## 5. Passcode gate

- On open, show a passcode screen. Store the **SHA-256 hash** of the passcode in an env var (not the plain text), compare in the browser, and keep an "unlocked" flag in `sessionStorage`.
- **Be clear about what this is:** on a static site the check runs in the browser, so it is a polite lock, not real security. It is fine for v1 because the app holds no secrets and no API keys.
- If we add an LLM later, the key and the passcode check must move behind a server route.
- Zero-code alternative with real protection: put the site behind Cloudflare Access (free tier).

## 6. Coach design

**Flow per move:** rules layer validates the move, then the engine evaluates before and after, then detectors emit `CoachEvent`s, then the narrator turns events into text, then the text goes into the move log.

**Every move gets a comment** (yours and the bot's), stored in `coachLog`. The board stays clean; comments live in a slide-out drawer, with the newest highlighted.

**"I'm stuck" button:** opens the drawer and gives a tiered hint:
1. Which piece or area to look at.
2. What the bot is threatening.
3. The suggested move (only if asked again).

**v1 detectors (start small, add later):**
- `hanging_piece` (yours or the bot's, undefended and attacked)
- `capture_trade` (good or bad trade by piece value)
- `check_given` / `in_check_warning`
- `threat_from_opponent` (what the last bot move attacks)
- `good_development` / `center_control` (early game)
- `blunder` / `mistake` / `good_move` (from engine evaluation swing, thresholds in config)
- `fork_available` and `pin` (stretch goal for v1, easy to add later)

**Bot:** Stockfish with limited skill level and depth, adjustable. Start very weak so a beginner can win.

**Take-back:** if the coach warns "your bishop can be captured for free", offer "Undo my move".

## 7. UI direction: playful

- Original mascot (for example a friendly knight character) who delivers the coach lines. Do not use copyrighted characters.
- Bright, rounded, friendly design. Chunky buttons, soft shadows, large board.
- Pieces and lessons have personality: "The pawn is a tiny soldier who only walks forward."
- Light gamification: lesson path with unlocked stages, XP, daily streak, confetti on checkmate or a lesson win.
- Coach tone is encouraging and short. Never snarky when the user blunders.
- Accessible: good contrast, keyboard-friendly board if the library allows.

## 8. Curriculum (content as data)

Stage 1, the board and pieces: board and coordinates, pawn, rook, bishop, queen, knight, king, capturing, piece values.
Stage 2, the rules that matter: check, escaping check, checkmate, stalemate and draws, castling, en passant, promotion.
Stage 3, thinking: "what is my opponent threatening?", don't hang pieces, trade fairly, opening principles (center, develop, castle).
Stage 4, guided games: play the bot with full coaching, then with coaching hidden by default.

Each lesson: short explanation, then 3 to 6 interactive exercises (board with a goal, validated by chess.js), then a completion event saved to the diary.

## 9. Build order, with acceptance checks

1. **Skeleton and board.** Next.js + TS + Tailwind, passcode gate, board renders, legal moves only. *Check: can play a full legal game against a placeholder random bot.*
2. **Engine adapter.** Worker-based Stockfish, level setting, evaluation output. *Check: can play a full game against Stockfish at adjustable levels; UI never imports Stockfish.*
3. **Coach layer and drawer.** Events, narrator, move log, stuck button. *Check: detector unit tests pass on fixed FENs; every move has a comment.*
4. **Lessons and exercises.** Stage 1 and 2 first, then 3. *Check: a new player can finish Stage 1 without outside help.*
5. **Diary storage.** File System Access adapter, export/import fallback, versioned schema. *Check: close and reopen the browser, reconnect, progress is intact.*
6. **Guided games and progress.** Mistake tracking, simple dashboard of repeated mistakes. *Check: finishing a game updates the file.*
7. **Polish and deploy.** Mascot, confetti, streaks, static export, hosting. *Check: works from the deployed URL on Chrome.*

## 10. Working rules for Claude Code

Put this in `CLAUDE.md`:

- Follow the layering in section 3. Do not import across layers upward.
- Strict TypeScript, no `any`. Pure logic in `coach/`, `rules/`, `content/` must have unit tests (Vitest).
- Work phase by phase from section 9. Finish one phase's acceptance check before starting the next.
- Hide third-party libraries behind our adapters.
- Keep lesson text and coach templates in data/template files, not inline in components.
- Never put API keys or secrets in client code.
- Before adding a dependency, say why and check it works in a static export.

## 11. Open items to confirm during the build

- Exact Stockfish package and lite build (check size and single-thread support).
- Board library: chessground vs react-chessboard (pick the one that makes custom highlights and exercise goals easiest).
- Bot level presets and evaluation thresholds for mistake/blunder (tune by playing).
- Whether to add an optional LLM post-game summary in v1.x (server-side key, protected route).
