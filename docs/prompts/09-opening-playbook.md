# Phase 9: Opening Playbook

Read `CLAUDE.md` and `PLAN.md` (sections 6 and 8) first. This is phase 9 of 11. Phase 8 is committed.

## Goal

Fix "I don't know what to play in the first 10 moves." Teach a **goal-based setup** (not memorized lines): what to aim for, in what order, and why, for both White and Black, practiced against the bot with the coach guiding.

## Tasks

1. **Design the playbook content first and show it to me before coding.** For White and for Black, propose setup goals in priority order, each with a plain-language reason and a few candidate moves. For example: claim the center, develop knights toward the center, develop bishops to open diagonals, castle for king safety, connect the rooks. Include cautions (don't move the same piece twice without a reason, no early queen adventures, no edge-pawn moves). Wait for my OK.
2. **`content/playbook/`:** schema as data. A goal has an id, title, why, a declarative "done" condition (pieces on certain squares, king castled, and so on, not code strings), ordered candidate moves with conditions, and cautions. Tests: schema validity and that done-conditions evaluate correctly on fixed FENs.
3. **`features/opening/`:** given a position and my color, compute the checklist status and the **next step**: the first unmet goal that has a legal candidate which also passes the safety check (SEE from phase 8: the moved piece is not simply lost, and the move does not walk into an immediate loss). **Safety beats plan:** if the bot just created a threat or one of my pieces is attacked, the coach says handle that first, using the phase 8 detectors, then returns to the plan.
4. **Opening practice mode** (new game mode): a checklist panel (Center, Knights, Bishops, Castle, and so on, ticking off as I go), and the coach says the next goal with 1 to 2 candidate moves and why. Moves are never forced. If I deviate, comment gently on what the move does for or against the plan. After each move say which goal it advanced. The mode ends when the checklist is complete or after move 12, then offers "keep playing a normal guided game" from that position.
5. **Playing Black:** handle the bot's first move simply: after 1.e4 default to ...e5, after 1.d4 default to ...d5, otherwise "claim the center your own way" with safe candidates. Keep it simple.
6. **Lessons:** add 3 to 4 short lessons with exercises ("develop the right knight", "which move castles?", "spot the move that breaks the plan") using the existing exercise types.
7. **Progress:** record playbook completions in the diary. This changes the schema: ask first, bump the version, add a migration and tests.
8. **Verification script** `scripts/verify-playbook.mjs`: play the playbook's candidate sequences against several typical bot replies and flag any step where the engine evaluation drops by more than about 100 centipawns versus the best move. If running Stockfish in Node is not practical, say so and produce a manual check list instead. Report honestly what was and was not verified.

## Out of scope

Named opening theory beyond friendly nicknames, drills, think-first, annotated games, LLM.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] I approved the playbook content before it was coded
- [ ] In opening practice I can reach a sound setup (center, knights, bishops, castled) within about 10 moves against the bot, guided by the checklist
- [ ] When the bot threatens something, the coach puts safety before the plan
- [ ] Deviating from the plan never blocks me; it only gets a comment
- [ ] After the opening, play continues as a normal guided game from the same position
- [ ] Playbook data is declarative and lives in `content/`; no opening text in components
- [ ] The verification script ran (or the limits are stated) and its flags are listed for me

Finish with a short report and a suggested commit message.
