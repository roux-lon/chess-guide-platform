# Phase 6: Guided games and progress

Read `CLAUDE.md` and `PLAN.md` (sections 6, 8 and 9) first. This is phase 6 of 7. Phases 1 to 5 are committed.

## Goal

Playing a full game against the bot with the coach is the main experience. Finished games are saved to my diary, the app learns which mistakes I repeat, and it nudges me toward the right lesson.

## Tasks

1. **Guided game mode** (Stage 4): start a game with a chosen bot level and coaching mode: **Full** (comment on every move, auto-highlight dangers), **Quiet** (drawer only, hints on request, the default), or **Off** (no coaching, for the "can I play comfortably?" test).
2. **Save finished games** to the diary: result, PGN (via `rules/`), date, bot level, the coach log, and the list of my mistakes by type and ply. Save at game end and when I resign or leave a game early (mark it as abandoned).
3. **Mistake tracking:** update `mistakeCounts` per type. Use the coach's `moveQuality` and detector events to classify (hanging piece, missed threat, bad trade, and so on).
4. **Post-game review screen:** result, my 3 biggest mistakes with the position and the coach's explanation, a "play it again from here" option that loads the position before the mistake and lets me retry the move.
5. **Progress dashboard:** lessons done, games played and results, mistake counts over time (a simple chart or bars is enough, no heavy chart library without asking), and the most repeated mistake.
6. **Gentle recommendations:** a pure function in `features/` that maps my top repeated mistake to a lesson to revisit, and suggests raising or lowering the bot level after a streak of wins or losses. Suggestions only, I stay in control.
7. **Resume support:** if I leave mid-game, offer "Continue your game" next time (store the FEN and move list in the diary).
8. **"Ready" milestone:** a small, honest checklist that shows v1's definition of done: all Stage 1 to 3 lessons complete, and a finished game at level 2 or higher with coaching Off. Show progress toward it, no fake celebration until it is real.
9. **Tests:** mistake classification, recommendation logic, resume logic, and saving a game through a fake `StorageAdapter`.

## Out of scope

Mascot art, animations, deployment.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] Finishing a game updates my diary file with the game, coach log and mistake counts
- [ ] The post-game review shows real mistakes from that game, and "retry from here" works
- [ ] The dashboard reflects my history after reloading the app and reconnecting the diary
- [ ] Recommendations change when I repeat a different mistake
- [ ] Abandoned and resumed games behave correctly
- [ ] No game or progress logic lives in React components

Finish with a short report and a suggested commit message.
