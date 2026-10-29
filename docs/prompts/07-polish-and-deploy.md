# Phase 7: Polish and deploy

Read `CLAUDE.md` and `PLAN.md` (sections 5, 7 and 9) first. This is phase 7 of 7. Phases 1 to 6 are committed.

## Goal

Make it playful and pleasant, then put it online at a URL behind the passcode.

## Tasks

1. **Design tokens:** finalize the shared token file (colors, radii, shadows, fonts). Bright, rounded, friendly, large board, chunky buttons. Check contrast ratios for text and board squares.
2. **Original mascot:** create an original friendly character as inline SVG (not a copy or lookalike of any existing character or brand). Give it a few expressions (happy, thinking, oops, cheering) used by the coach drawer, lessons, and game results. Name it something fun.
3. **Playful touches,** kept tasteful and skippable:
   - confetti on checkmate wins and lesson completion
   - daily streak and XP shown on the home screen, stored in the diary (extend the schema carefully: ask first, bump the version, add a migration and tests)
   - small piece "personality" lines in lessons
   - optional sound effects with a mute toggle, off by default
4. **Home screen:** clear next step ("Continue lesson 7", "Play a guided game"), streak, and the "Ready" milestone from phase 6.
5. **Responsive and accessible:** works well on a laptop and a tablet, usable on a phone; keyboard navigation for the drawer, dialogs and buttons; visible focus; respect `prefers-reduced-motion` for confetti and animations; label controls for screen readers.
6. **Offline-friendly:** after first load the app should work offline (engine files included). If a service worker is the right tool, explain the trade-offs and ask before adding one.
7. **Error and empty states:** friendly messages for engine failure, diary problems and a locked state. Never a blank screen.
8. **Deploy:**
   - confirm `npm run build` produces a static export
   - recommend one host from Vercel, Netlify or Cloudflare Pages in a sentence or two, then write step-by-step instructions for me in `docs/DEPLOY.md` (connect repo, build command, output directory, set `NEXT_PUBLIC_PASSCODE_HASH`)
   - mention the optional Cloudflare Access route for real protection, and keep the polite-lock caveat visible
9. **Final QA:** write `docs/QA-CHECKLIST.md` covering the full flow (unlock, learn, play, save, reconnect, export/import, offline, other browsers). Run what you can and say what you could not verify.
10. **Update `CLAUDE.md`** so it reflects the finished project, and add a short "Ideas for v1.x and v2" section (LLM post-game summaries behind a server route, forks and pins, openings, accounts) as notes only.

## Out of scope

New features beyond the list above.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] The mascot is original and appears in the drawer, lessons and results
- [ ] Reduced-motion users get no confetti or flashy animation
- [ ] Keyboard-only use works for the main flows
- [ ] App still plays and teaches with the network off after first load
- [ ] `docs/DEPLOY.md` is clear enough that I can deploy without more help
- [ ] Deployed URL works on Chrome, asks for the passcode, and the diary reconnect flow works there

Finish with a short report and a suggested commit message.
