# Phase 1: Skeleton, passcode gate, board, legal play

Read `CLAUDE.md` and `PLAN.md` (sections 3, 5 and 9) first. This is phase 1 of 7. The repo currently has only the kit files.

## Goal

A running Next.js static app where I unlock with a passcode and play a full, fully legal game of chess on a board against a placeholder opponent.

## Tasks

1. **Scaffold** Next.js (App Router, strict TypeScript, Tailwind, `src/` directory, ESLint) in the current directory without overwriting `CLAUDE.md`, `PLAN.md`, `docs/` or `.env.example`. If `create-next-app` refuses a non-empty folder, scaffold in a temp folder and move the files in.
2. **Static export:** set `output: 'export'` and unoptimized images in the Next config.
3. **Tooling:** add Vitest. Add npm scripts `typecheck`, `lint`, `test`, `build`.
4. **Folders:** create the layer folders from PLAN section 3 (`ui`, `features`, `coach`, `engine`, `rules`, `storage`, `content`, `lib`). Only add placeholder files where needed.
5. **`rules/` layer:** a thin wrapper over chess.js with our own types. Provide: create game (optional FEN), legal moves from a square, try a move (with optional promotion), turn, status (check, checkmate, stalemate, and draw reasons), move history, undo. No chess.js types may leak out of this folder. Unit tests: scholar's mate, a stalemate position, castling rules, en passant, promotion.
6. **Passcode gate:**
   - `scripts/hash-passcode.mjs` prints the SHA-256 hex of a given passcode.
   - Gate component compares the hash of the typed passcode with `NEXT_PUBLIC_PASSCODE_HASH` using `crypto.subtle`, and stores an "unlocked" flag in `sessionStorage`.
   - Friendly error on a wrong passcode. Add a short code comment that this is a polite lock, not real security.
7. **Board:** choose between chessground and react-chessboard. Briefly explain your choice. Requirements: legal-move hints, highlighted squares, arrows, and room for custom shapes later (lessons). Wrap it in our own `<Board>` component with props like `fen`, `orientation`, `legalDests`, `onMove`, `highlights`, `arrows`.
8. **Placeholder opponent:** define the `EngineAdapter` interface in `engine/` (just what you need now, we will extend it in phase 2) and a `RandomMoveEngine` implementation so I can play full games before Stockfish arrives.
9. **Game page:** new game, undo, status bar (whose turn, check, game over reason), promotion picker. The UI talks to `features/` which talks to `rules/` and `engine/`.
10. **Update `CLAUDE.md`** Commands section with the real commands.

## Out of scope

Stockfish, coach, lessons, storage, styling polish.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] Passcode gate blocks the app until the right passcode is entered
- [ ] I can play a full legal game against the random bot, including castling, en passant, promotion
- [ ] Illegal moves are impossible from the UI
- [ ] Checkmate, stalemate and draws are detected and shown
- [ ] No chess.js import outside `rules/`

Finish with a short report and a suggested commit message.
