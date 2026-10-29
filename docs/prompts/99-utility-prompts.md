# Utility prompts

Copy, fill in the brackets, and paste into Claude Code any time.

## Review the last phase

```
Review the work from the last phase against CLAUDE.md and the phase's acceptance checklist.
1. Check that layer boundaries are respected (no upward imports, no chess.js or Stockfish outside their layers, no React in coach/rules/content).
2. Run typecheck, lint, test and build and report the real results.
3. List anything untested, any shortcuts or TODOs, and any place the code does not match PLAN.md.
Do not change code yet. Give me a prioritized list of issues.
```

## Fix a bug

```
Bug: [what I did, what I expected, what happened, browser].
First reproduce it or find the cause by reading the code; tell me the likely root cause in 3 bullets or fewer.
Then write a failing test if the logic is testable, fix the cause (not the symptom), and confirm the test passes.
Keep the change small and follow CLAUDE.md. If the fix needs a layer or schema change, ask first.
```

## Add a coach detector

```
Add a coach detector for [idea, e.g. "fork available"] in coach/detectors/.
- Add the event type to coach/events.ts.
- Write it as a pure function with tests on at least 3 fixed FENs where it should fire and 2 where it should not.
- Add 2 to 3 narration template variants in beginner voice, explaining the term the first time.
- Wire it into the analyze pipeline.
- Use the same thresholds-in-config approach as the other detectors.
Report the tests and anything you were unsure about.
```

## Add a lesson

```
Add a lesson to content/ in stage [N]: "[title]".
- Short, playful explanation for a beginner.
- 3 to 6 exercises using the existing exercise types (add a new type only if truly needed, and ask first).
- Make sure the content-validation tests pass: legal FENs, solvable exercises, unique ids.
- Place it in the right spot in the unlock order.
Show me the lesson text before you write the exercises.
```

## Tune the bot

```
The bot at level [N] feels [too strong / too weak / too random].
Look at the level presets config and the evaluation of recent behavior. Propose a change with reasoning, apply it, and tell me what to look for when I play-test.
```

## Explain the codebase to me

```
Give me a guided tour of this codebase for someone who built it by prompting. For each layer: its job, its key files, and one example of how a single move flows from the UI to the coach and back. Keep it under one page.
```

## Prepare a new phase (v1.x / v2)

```
I want to add [feature]. Do not write code yet.
Read CLAUDE.md and PLAN.md, then write a short plan: which layers change, new interfaces, schema changes (if any), risks, and a small phase breakdown with acceptance checks, in the same style as docs/prompts/.
Save it as docs/prompts/NN-[name].md and wait for my approval.
```
