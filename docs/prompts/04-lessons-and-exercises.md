# Phase 4: Lessons and exercises

Read `CLAUDE.md` and `PLAN.md` (sections 7 and 8) first. This is phase 4 of 7. Phases 1 to 3 are committed.

## Goal

A beginner with zero chess knowledge can learn every rule through short lessons with interactive exercises, then be ready for guided games.

## Tasks

1. **Content schema** in `content/`: typed lesson and exercise data (TS or JSON with types). A lesson has an id, stage, title, short friendly explanation (rich enough for headings and a tiny bit of emphasis, but no React), and 3 to 6 exercises.
2. **Exercise types** (each validated by `rules/`, never by hand-written special cases in the UI):
   - `moveToSquare` (move this piece to the highlighted square)
   - `captureTarget` (take the undefended piece)
   - `safeSquare` (pick a square where the piece cannot be captured)
   - `mateInOne` (deliver checkmate)
   - `escapeCheck` (find a legal way out)
   - `quiz` (short multiple choice, for concepts like piece values)
   Each exercise has a start FEN, a goal, an optional hint, and a short success message.
3. **Exercise runner** in `features/lessons/`: loads an exercise, accepts moves, decides correct, wrong or illegal, offers a hint, and allows retry. Wrong answers get a gentle explanation of why, not just "wrong".
4. **Write the Stage 1 and 2 curriculum** from PLAN section 8: the board and coordinates, pawn, rook, bishop, queen, knight, king, capturing, piece values, check, escaping check, checkmate, stalemate and draws, castling, en passant, promotion. Beginner voice, playful, small chunks. Explain every term the first time.
5. **Write Stage 3** basics: "what is my opponent threatening?", don't hang pieces, trading fairly, opening principles (center, develop, castle). It is fine if this stage has fewer exercises than stages 1 and 2.
6. **Lesson path UI:** a stage map where later lessons unlock after earlier ones, a lesson screen (explanation, then exercises, with progress dots), and a completion screen. Reuse the `<Board>` component with highlights and arrows.
7. **Progress** goes through the `StorageAdapter` interface. Define the interface now (load and save the diary object per PLAN section 4) and implement a simple browser version for this phase. The file version comes in phase 5.
8. **Tests:** content validation (every exercise's start FEN is legal, has at least one correct solution, ids are unique), runner logic, and unlock logic.

## Out of scope

Guided games, file-based storage, mascot art, confetti.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] A content-validation test fails if I add a lesson with an illegal FEN or an unsolvable exercise
- [ ] I can complete Stages 1 and 2 start to finish, with no outside chess help
- [ ] Wrong moves get a helpful explanation; hints work; retry works
- [ ] Completing a lesson persists through a page reload
- [ ] No lesson text is inline in components

Finish with a short report and a suggested commit message.
