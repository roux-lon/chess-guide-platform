# Phase 10: Thinking Gym, think-first mode, and principles

Read `CLAUDE.md` and `PLAN.md` (sections 6 and 8) first. This is phase 10 of 11. Phases 8 and 9 are committed.

This is a big phase. If it runs long, finish Part A, commit, then do Parts B and C in a second session.

## Goal

Train the 4-step thinking routine directly, instead of waiting for situations to appear in games: (1) what did they just do, (2) what's my plan, (3) pick a move, (4) safety check. Make me answer before the coach reveals, and build a growing list of named principles.

## Part A: Thinking Gym (short drills)

1. **New drill types** on the phase 4 exercise framework, as data, with answers verified by `rules/` or the engine:
   - `spotThreat`: what is the bot attacking? (click the pieces, or "nothing")
   - `isItSafe`: given a proposed move, is it safe, and why?
   - `pickOfThree`: three candidate moves, choose the best and see why each is right or wrong
   - `whatsThePlan`: choose the plan that fits the position (develop, center, castle, attack, defend)
   - `spotDoubleAttack`: find the move that attacks two things at once
   Each explanation names which routine step it trains.
2. **Answer validation tests:** for every drill, a test recomputes the correct answer with the rules layer or engine and fails if the data disagrees (for example data says Nxe5 is safe but SEE says it loses a piece).
3. **Content:** at least 8 drills per type to start. Show me 3 samples before writing the rest.
4. **Gym UI:** a home entry, sessions of 5 mixed drills, accuracy per type, a wrong answer shows the reason and offers "try a similar one".
5. **Train on my mistakes:** when a game ends, store the FEN before each of my mistakes, and let the gym turn them into drills ("Here's a position from your game. Is Qg5 safe?") with answers computed by rules/engine. This changes the diary schema: ask first, bump the version, migrate, test.

## Part B: Think-first mode

6. **Setting:** Off, Sometimes, Every move. Default Sometimes (roughly one in three of my turns, more often when the position contains a threat).
7. **Questions before my move,** chosen only when the answer is verifiable from rules/engine, otherwise skip: "What is the bot attacking?"; "Which of these 2 or 3 moves is safest?" (generated from legal moves: one passes the safety check, others hang something); "What's your plan?" (choices from `movePurpose` goals).
8. **Feedback:** after I answer, one-line reason (right or wrong), then I play freely. A Skip button is always there. Never lock the board. Do not ask the same type twice in a row, and do not ask while I am in check or have only one legal move.
9. **Thinking stats** in the diary: asked and correct per question type and per principle. Schema change: ask first.

## Part C: Principles

10. **`content/principles.ts`:** about 10 named principles, each with simple text and one example FEN. Suggested set: Check what they threaten before you move; A threat is a question, not a win; Don't count on blunders; Develop before you attack; Keep every piece safe or protected; Control the center; Castle early; Two threats at once win material; Trade when you're ahead; Look for the opponent's best reply. Edit the wording so it fits the voice of the app.
11. **Tagging:** coach comments and drills carry an optional `principleId`. The drawer shows a principle chip.
12. **"Rules I've learned" page:** each principle with times followed and times broken (from tagged events), its example board, and a link to a matching drill.
13. **Review:** the post-game review groups my mistakes by principle ("You broke 'Check what they threaten' 3 times"), and the dashboard's most repeated mistake maps to a principle and a drill.

## Out of scope

Annotated games, LLM, new openings content.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] A drill whose data disagrees with rules/engine fails a test
- [ ] I can run a 5-drill gym session and see accuracy per type
- [ ] Drills built from my own past mistakes work and persist across reload
- [ ] Think-first questions appear in games at the chosen frequency and are skippable; the board is never locked
- [ ] Only verifiable questions are asked
- [ ] Principles appear as chips on comments and drills, and the "Rules I've learned" page reflects my history
- [ ] All new content is data in `content/`; no logic in components

Finish with a short report and a suggested commit message.
