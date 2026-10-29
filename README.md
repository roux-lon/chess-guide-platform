# Chess Coach: project kit

Everything you need to start building with Claude Code.

## What's inside

```
CLAUDE.md                  Project rules Claude Code reads automatically
PLAN.md                    Full v1 spec (referenced from CLAUDE.md)
.env.example               Passcode hash variable
docs/prompts/
  01-skeleton-and-board.md
  02-engine-adapter.md
  03-coach-and-drawer.md
  04-lessons-and-exercises.md
  05-diary-storage.md
  06-guided-games-and-progress.md
  07-polish-and-deploy.md
  99-utility-prompts.md    Review, bugfix, add-a-detector, add-a-lesson
```

## How to use

1. Create a new folder for the project, unzip this kit into it, and run `git init`.
2. Open Claude Code in that folder (`claude`).
3. Give it one phase at a time. You can paste the whole prompt file, or just say:
   `Do the task in docs/prompts/01-skeleton-and-board.md`
4. When the phase finishes, check the report, try the app yourself, then commit.
5. Start a fresh Claude Code session for the next phase. `CLAUDE.md` and `PLAN.md` carry the context, so nothing is lost.

## Tips

- For each phase, plan mode (Shift+Tab to cycle modes) is a good way to review the approach before it writes code.
- If a phase goes sideways, don't patch endlessly. Use the bugfix prompt in `99-utility-prompts.md`, or revert to your last commit and retry with a sharper instruction.
- Each prompt ends with an acceptance checklist. If an item fails, ask Claude to fix that item before moving on.
- The passcode: run the hash script from phase 1, put the result in `.env.local` as `NEXT_PUBLIC_PASSCODE_HASH`, and set the same variable on your hosting provider.
