# Phase 11: Watch & Predict (annotated classic games)

Read `CLAUDE.md` and `PLAN.md` (sections 6 and 8) first. This is phase 11 of 11. Phases 8 to 10 are committed.

## Goal

Learn from stronger players properly: replay a short classic game, **pause before key moves, guess, then see the idea explained**. This fixes "I watch games but can't see why they play those moves."

## Tasks

1. **Choose the games first and show me the list before writing annotations.** Propose 5 well-known, public-domain classic games with clear beginner ideas (development, center, king safety, attacks), for example the Opera Game (Morphy, 1858) and the Légal's Mate game (1750), plus three more of your choice. For each, one line on what it teaches. Wait for my OK.
2. **`content/games/` schema:** `id, title, year, players, pgn, intro` (what to watch for), `stops` (each: ply, type `guessMove` | `whatThreatens` | `whatsThePlan`, options if needed, answer, `why` explanation, `tempting alternative` and why it is worse, optional `principleId`), optional short notes on other moves (one idea each), and an `outro`. Write all annotations yourself in the beginner voice of the app. Do not copy annotations from books or websites.
3. **Verification:**
   - tests: every PGN is legal and complete, stop plies are valid, answers exist and are legal
   - `scripts/verify-annotated-games.mjs`: run Stockfish at modest depth and flag any stop whose "correct" move is more than about 50 centipawns worse than the engine's best, or is not among its top 3. Print a report. For each flag, fix the annotation or justify it in a comment, and list the flags for me. If Stockfish cannot run in Node, say so and use the engine adapter in a browser-based check instead, or produce a manual list. State honestly what was verified.
4. **Viewer UI:**
   - board replay with Next and Back, auto-pausing at each stop
   - I predict by making the move on the board (for `guessMove`) or choosing an option
   - then reveal: the real move, arrows and highlights, the `why`, and the tempting alternative
   - running score, and a "Show hint" that follows the 4-step routine
   - an end summary with the principles that appeared
   - "Play from here against the bot" at any stop, starting a guided game from that position with the matching color
5. **Entry and progress:** a menu entry "Watch & Predict" and a list of games with completion state. Store games watched and prediction accuracy by stop type in the diary. Schema change: ask first, bump the version, migrate, test.
6. Reuse the existing `<Board>`, coach styling and mascot. Keep all content as data.

## Out of scope

LLM features, engine-generated annotations, games from copyrighted sources.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] I approved the game list before annotations were written
- [ ] Every game's moves are legal; every stop has a valid answer and explanation
- [ ] The Stockfish verification ran (or the limits are stated) and its flags are listed for me
- [ ] I can play through a game, guess at each stop, and see the reason afterwards
- [ ] "Play from here" starts a guided game from the stop position
- [ ] Progress persists in the diary and survives reload and reconnect
- [ ] Annotations are original text, stored as data

Finish with a short report and a suggested commit message.
