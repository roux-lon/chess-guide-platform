# Phase 8: Coach rewrite (turn-aware, teaches the "why")

Read `CLAUDE.md` and `PLAN.md` (section 6 and its teaching rules) first. This is phase 8 of 11. Phases 1 to 7 are committed and the app runs.

## Why this phase exists

Real play showed the coach describes instead of teaches:

- After my move Bf6 it said "the bot's rook on e5 is hanging. Can you take it?" But it was the **bot's** turn, so the rook just moved away (Re8). A threat was narrated as an opportunity, which teaches hope-chess.
- "The bot moved its rook from e8 to e5" restates the board and teaches nothing.
- A queen trade (Qg5+ Qxg5 Bxg5) came out as unrelated facts, and the recapture was described as the bot "leaving its queen unprotected".
- One comment piled up several facts (pawn unprotected, check, queen attacking king) with no ranking.
- Hints named a move (Nc3) but gave no reason, and "the bot is not threatening anything" gave no thinking to copy.

The goal: comments and hints that show **how to think**, not just what happened.

## Tasks

0. **Docs first.** Append the "Coach teaching rules" block from `PLAN.md` (section 6) to `CLAUDE.md` as its own section, keeping my existing Commands and other content untouched. If `CLAUDE.md` already has it, skip.
1. **Side-to-move model.** Every coach analysis input carries who just moved and who is to move. Every event carries `perspective` (`user` or `bot`) and `kind`: `threat` (a piece is attacked and the opponent gets to respond), `opportunity` (it is my turn and I can win something right now), `trade`, or `info`.
2. **`rules/` additions** (chess.js stays hidden): static exchange evaluation (SEE) for a capture or square, which gives the real material result of a capture sequence; a helper to say whether a piece is truly safe after a move; list of enemy pieces attacked by a move (including discovered attacks); detection of moves that create two or more separate winnable threats. Unit tests on fixed FENs.
3. **Detector rework**, each pure, each with tests (including cases where it must NOT fire):
   - `threatCreated`: my move attacks something worth winning (by SEE). Narration: the bot must respond. Never "can you take it".
   - `opportunity`: only when the side to move can win material now. For me, only after the bot's move.
   - `hangingPiece` for MY pieces after my move: "the bot can take it", with the take-back offer.
   - `tradeSequence`: capture followed by recapture is ONE story ("Queen trade"), judged by material, with a short remark on whether the trade was good, equal or bad.
   - `doubleAttack` (fork): first-class, with the idea "two threats at once can't both be answered".
   - `responseToThreat` for bot moves: it moved the attacked piece, defended it, or counter-attacked.
   - `movePurpose` classifier: develop, controlCenter, castle, attack, defend, retreat, capture, trade, pawnAdvance, kingSafety, improvePiece, other.
   - Keep `checkGiven`, `inCheckWarning`, `moveQuality`.
4. **Comment structure.** Replace flat text with `CoachComment { headline, why, watch, more[], events }`. Rank events by a priority table in config. The top event becomes the headline; one main idea per comment; the rest go in `more`. `why` is the purpose of the move; `watch` is the opponent's best reply or the main danger. Templates live in template files with several variants each.
5. **No empty comments.** A comment may never just restate a move. If nothing teachable happened, say a short `why` from `movePurpose`. Add a test that runs a few full sample games and fails on restatement-only comments.
6. **Hints as the thinking routine.** Tier 1 "Safety check": name any of my pieces in danger, or say plainly that nothing is. Tier 2 "Plan check": the biggest thing still undone (undeveloped pieces, not castled, center) or the bot's main threat. Tier 3: the engine's move with its purpose and reason. If `movePurpose` is `other`, say honestly that it is an engine pick and give the simplest reason you can verify. Hints reset after each move.
7. **Take-back offer** only for real problems (hanging per SEE, or a blunder), never for noise.
8. **Drawer UI.** Show the headline prominently, `why` and `watch` smaller, `more` collapsed. A small chip for the kind (Threat, Chance, Trade, Tip) and whose turn it is.
9. **Regression tests from real play:** (a) my move attacks an undefended bot rook while the bot is to move: kind is `threat`, text has no "can you take", and says the bot must respond; (b) the bot's move leaves a piece en prise with me to move: kind is `opportunity`; (c) a queen trade sequence yields one trade comment; (d) fork cases, positive and negative.

## Out of scope

New lessons, openings, drills, LLM, visual polish beyond the drawer.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] The Bf6 scenario produces a threat comment, not an opportunity
- [ ] A capture and recapture is narrated as one trade
- [ ] No generated comment is a bare restatement of a move
- [ ] Each comment shows one headline with why and watch; extra facts are collapsed
- [ ] The three hint tiers follow the safety-check, plan-check, move-with-reason order
- [ ] No coach logic lives in React components; `coach/` and `rules/` stay free of React and browser APIs
- [ ] `CLAUDE.md` contains the teaching rules

Finish with a short report and a suggested commit message.
