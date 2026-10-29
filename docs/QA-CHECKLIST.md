# QA checklist

Tick these off on the **deployed address**, in **Chrome** on a computer. Anything that says "other browsers" is a smaller check. Write down anything odd.

Last run by the build assistant against a local copy of the production build (`out/`) in headless Chrome: see "What has and has not been checked" at the bottom.

## 1. Opening

- [ ] The secret-word screen shows Pip (the mascot).
- [ ] A wrong word says "Hmm, that is not it. Try again!" and does not let you in.
- [ ] The right word opens the home screen: "Hi, I'm Pip!".
- [ ] Pressing Tab once highlights "Skip to the main content".
- [ ] Closing the tab and opening the site again asks for the word again.

## 2. Your diary

- [ ] Before connecting, the lessons say to connect the diary (no blank screen).
- [ ] "Create a new diary file" lets you choose a place, and the top bar shows "Diary: chess-progress.json".
- [ ] After closing the browser and opening the site again, "Reconnect my diary" brings your progress back.
- [ ] Settings: "Save a copy" downloads a JSON file. "Restore from a copy" asks before replacing anything.
- [ ] Other browsers (Firefox or Safari): the app says it uses the browser and shows Export/Import.

## 3. Learning

- [ ] Home says "Start with lesson 1" for a new person, then "Continue lesson N" after each lesson.
- [ ] Lesson 1 can be finished with no outside help.
- [ ] A wrong answer is explained kindly (never "wrong!" or blame).
- [ ] Dragging a piece to an illegal square puts it back and says why.
- [ ] Typing a move ("e2 e4") in a board exercise works.
- [ ] Piece lessons (pawn, rook, bishop, queen, knight, king) start with the piece "speaking".
- [ ] Finishing a lesson shows Pip cheering and confetti, and +50 XP on the home screen.
- [ ] A lesson that is not unlocked yet says "Not yet!" instead of opening.

## 4. Playing

- [ ] "Play the bot" starts a game. Dragging a piece works.
- [ ] Typing "e2 e4" in "Or type your move", then Enter, plays the move. A mistyped square gets a friendly hint.
- [ ] The bot answers. Every move (yours and the bot's) has a comment in the coach drawer, with Pip at the top.
- [ ] "I'm stuck" gives three hints, one at a time.
- [ ] After a clear mistake, the coach offers "Undo my move".
- [ ] Resign, then "See how it went": the review page shows Pip and your biggest mistakes.
- [ ] A finished game appears in Progress, and the streak and XP on the home screen go up.
- [ ] Leaving a game and coming back shows "Continue your game" and it is one game in the history, not two.

## 5. Fun extras

- [ ] Settings: sound is **off** by default. Switching it on gives short tones on right/wrong answers and a win.
- [ ] Settings: "Confetti when you win" can be switched off.
- [ ] With the computer set to "reduce motion" (Windows: Settings, Accessibility, Visual effects, Animation effects off), there is **no confetti** and no sliding animations, and the confetti switch says why.
- [ ] The daily streak counts a second day in a row, and starts over after a missed day.

## 6. Keyboard only (no mouse)

- [ ] You can reach every link and button with Tab, and always see where the focus is.
- [ ] You can finish a lesson and play a whole game using only the keyboard (typing moves).
- [ ] When a pawn reaches the end, the "choose a piece" box takes the focus, Escape closes it, Tab stays inside it.
- [ ] The coach drawer opens with the keyboard, Escape closes it, and the focus returns to the button.

## 7. Screen sizes

- [ ] Phone width (about 375 px): nothing runs off the side, the board fits, buttons are easy to press.
- [ ] Tablet width: same.

## 8. Offline

- [ ] Open the deployed site once while online and wait a few seconds.
- [ ] Reload once (the offline helper takes over).
- [ ] Turn off Wi-Fi. Reload: the home screen opens. Open a lesson. Play a game: the bot still answers.
- [ ] Turn Wi-Fi back on. Nothing is lost.

## 9. Not-blank screens

- [ ] An address that does not exist shows "I can't find that page" with a way home.
- [ ] If the bot has a problem, a button says "Ask the bot to try again".

## What has and has not been checked

Checked by the build assistant (a local copy of `out/`, served like a static host, in headless Chrome): the lock screen, home screen, diary creation, lesson 1 (wrong answer, finishing, confetti, XP and streak written to the diary file), the pawn "personality" bubble, reduced motion (no confetti), settings switches, typing moves, the coach drawer, **playing a bot move with the network off**, Tab reaching the skip link with a visible focus ring, the not-found page, and no sideways scrolling at 375 px and 820 px on every page.

**Not** checked by the assistant, so please do them yourself:

- The **deployed** address (it can only be checked after you deploy).
- Your own real diary file in the real file dialog (the assistant used a stand-in).
- Firefox, Safari, Edge, and a real phone.
- Real sound (the assistant cannot hear; the tones are tested only as data).
- A screen reader.
- The "A new version is ready" notice (it needs two deployed versions).
- A whole game played to checkmate (the confetti on a win uses the same component as the lesson one, which was checked).
