"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COACHING_MODE_TEXT, GAME_TEXT, OPENING_TEXT } from "@/content";
import { BOT_LEVELS, LEVELS } from "@/features/play";
import type { BotLevel, GameSession } from "@/features/play";
import { describeStatus } from "@/features/play/statusText";
import { Board } from "./Board";
import { ERROR_TEXT } from "@/content";
import { coachMood } from "@/features/mascot";
import { CoachDrawer } from "./CoachDrawer";
import { Confetti } from "./Confetti";
import { MoveInput } from "./MoveInput";
import { OpeningPanel } from "./OpeningPanel";
import { playSound } from "./sound";
import { usePreferences } from "./usePreferences";
import { PromotionPicker } from "./PromotionPicker";

const TONE_CLASS = {
  neutral: "bg-surface text-ink",
  warning: "bg-warn/20 text-ink",
  win: "bg-good/20 text-ink",
  lose: "bg-danger/15 text-ink",
  draw: "bg-info/15 text-ink",
} as const;

const small =
  "rounded-[var(--radius-button)] px-4 py-2 font-bold shadow transition disabled:opacity-40";
const light = `${small} bg-surface text-ink hover:bg-brand hover:text-white`;
const strong = `${small} bg-brand text-white hover:bg-brand-dark`;

export interface GameScreenProps {
  session: GameSession;
  /** A practice position: nothing is saved. */
  practice: boolean;
  /** Opening practice: the checklist panel is shown and the game is not saved. */
  opening: boolean;
  /** The game has been written down and its review is ready. */
  reviewReady: boolean;
  /** The diary is connected, so the game can be saved. */
  diaryReady: boolean;
  onResign(): void;
  /** Leave the game for the menu. A game in progress is kept so it can be continued. */
  onLeave(): void;
  onOpenReview(): void;
  onEndPractice(): void;
  /** Opening practice is over: carry on from this position as a normal guided game. */
  onContinueOpening(): void;
  onLevelChange(level: BotLevel): void;
}

/** One game on screen. It draws what the session says and reports what the player does. */
export function GameScreen({
  session,
  practice,
  opening,
  reviewReady,
  diaryReady,
  onResign,
  onLeave,
  onOpenReview,
  onEndPractice,
  onContinueOpening,
  onLevelChange,
}: GameScreenProps) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** How many comments the player has already seen, for the "new" badge. */
  const [seenCount, setSeenCount] = useState(0);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const coachButtonRef = useRef<HTMLButtonElement>(null);
  const { prefs } = usePreferences();
  const playerWon = snap.gameOver && snap.status.outcome === "checkmate" && snap.status.winner === snap.playerColor;
  useEffect(() => {
    if (playerWon) playSound("win", prefs.sound);
  }, [playerWon, prefs.sound]);

  const coaching = snap.coachingMode !== "off";
  const status = describeStatus(snap.status, snap.playerColor, snap.botThinking, snap.resigned);
  const humanCanMove = snap.legalDests.size > 0;
  const logLength = snap.coachLog.length;
  const unread = drawerOpen ? 0 : Math.max(0, logLength - seenCount);

  const closeDrawer = useCallback(() => {
    setSeenCount(logLength);
    setDrawerOpen(false);
    coachButtonRef.current?.focus();
  }, [logLength]);

  const askForHint = () => {
    setDrawerOpen(true);
    if (snap.canRequestHint) void session.requestHint();
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:flex-row lg:items-start">
      <Confetti run={playerWon} />
      <section className="relative w-full max-w-[640px] lg:flex-1">
        <Board
          fen={snap.fen}
          turn={snap.turn}
          orientation={snap.playerColor}
          movableColor={humanCanMove ? snap.playerColor : undefined}
          legalDests={snap.legalDests}
          lastMove={snap.lastMove}
          check={snap.status.inCheck ? snap.turn : undefined}
          highlights={snap.dangers}
          onMove={(from, to) => session.attemptMove(from, to)}
        />
        {snap.pendingPromotion && (
          <PromotionPicker
            onChoose={(piece) => session.choosePromotion(piece)}
            onCancel={() => session.cancelPromotion()}
          />
        )}
        <div className="mt-4">
          <MoveInput onMove={(from, to) => session.attemptMove(from, to)} disabled={!humanCanMove} />
        </div>
      </section>

      <aside className="flex w-full flex-col gap-4 lg:w-80">
        <div>
          <h1 className="text-3xl font-extrabold text-brand">{practice ? "Practice" : opening ? OPENING_TEXT.pageTitle : "Your game"}</h1>
          <p className="text-sm font-semibold text-ink/70">
            Coaching: {COACHING_MODE_TEXT[snap.coachingMode].label}
          </p>
        </div>

        {practice && (
          <p className="rounded-[var(--radius-card)] bg-info/15 p-3 text-sm">{GAME_TEXT.practiceNote}</p>
        )}
        {opening && snap.opening && (
          <OpeningPanel view={snap.opening} onContinue={onContinueOpening} onLeave={onLeave} />
        )}
        {!practice && !opening && !diaryReady && (
          <p role="alert" className="rounded-[var(--radius-card)] bg-warn/25 p-3 text-sm">
            {GAME_TEXT.unsavedNote}
          </p>
        )}

        <div
          role="status"
          aria-live="polite"
          className={`rounded-[var(--radius-card)] p-4 text-lg font-semibold shadow ${TONE_CLASS[status.tone]}`}
        >
          {status.text}
        </div>

        {snap.latestComment && !snap.gameOver && (
          <p className="rounded-[var(--radius-card)] bg-brand/10 p-4 text-sm" aria-label="Latest comment from the coach">
            <span className="font-bold">Coach: </span>
            {snap.latestComment}
          </p>
        )}

        {snap.error && (
          <p role="alert" className="rounded-[var(--radius-card)] bg-danger/15 p-3 text-sm">
            {ERROR_TEXT.engineFailed}
            <button
              type="button"
              onClick={() => session.retryBot()}
              className="mt-2 block rounded-[var(--radius-button)] bg-danger px-3 py-1 font-bold text-white shadow"
            >
              {ERROR_TEXT.engineRetry}
            </button>
          </p>
        )}

        {snap.takeBackOffer && (
          <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-warn/25 p-4 shadow">
            <p className="font-semibold">{snap.takeBackOffer.message}</p>
            <button
              type="button"
              onClick={() => session.undo()}
              className="self-start rounded-[var(--radius-button)] bg-warn px-4 py-2 font-bold text-ink shadow transition hover:brightness-95"
            >
              Undo my move
            </button>
          </div>
        )}

        {snap.gameOver && !practice && !opening && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow">
            {reviewReady ? (
              <button type="button" onClick={onOpenReview} className={strong}>
                See how it went
              </button>
            ) : (
              <p role="status" className="text-sm text-ink/70">
                Saving your game...
              </p>
            )}
          </div>
        )}
        {practice && (
          <button type="button" onClick={onEndPractice} className={strong}>
            Back to my review
          </button>
        )}

        {coaching && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={coachButtonRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-controls="coach-drawer"
              className={`relative ${light}`}
            >
              Coach
              {unread > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-danger px-2 text-xs font-bold text-white">
                  {unread}
                  <span className="sr-only"> new comments</span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={askForHint}
              disabled={snap.gameOver}
              className={`${small} bg-info text-white hover:brightness-110`}
            >
              I&apos;m stuck
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {coaching && (
            <button type="button" onClick={() => session.undo()} disabled={!snap.canUndo} className={light}>
              Undo my move
            </button>
          )}
          {!practice && !opening && snap.canResign && !confirmingResign && (
            <button type="button" onClick={() => setConfirmingResign(true)} className={light}>
              Resign
            </button>
          )}
          <button type="button" onClick={onLeave} className={light}>
            {practice || opening || snap.gameOver ? "Back to the menu" : "Leave game"}
          </button>
        </div>

        {confirmingResign && snap.canResign && (
          <div role="alert" className="space-y-2 rounded-[var(--radius-card)] bg-warn/25 p-4 shadow">
            <p className="font-semibold">Give up this game? It will be saved as unfinished.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingResign(false);
                  onResign();
                }}
                className={`${small} bg-danger text-white hover:brightness-110`}
              >
                Yes, resign
              </button>
              <button type="button" onClick={() => setConfirmingResign(false)} className={light}>
                Keep playing
              </button>
            </div>
          </div>
        )}
        {!practice && !opening && !snap.gameOver && (
          <p className="text-xs text-ink/70">
            Leaving a game keeps it, so you can continue it later from the menu.
          </p>
        )}

        <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Bot strength
            <select
              value={snap.level}
              onChange={(e) => {
                const level = Number(e.target.value) as BotLevel;
                session.setLevel(level);
                onLevelChange(level);
              }}
              className="rounded-[var(--radius-button)] bg-page px-2 py-2"
            >
              {BOT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVELS[level].label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-sm text-ink/70">{LEVELS[snap.level].blurb}</p>
        </div>

        <section aria-label="Moves so far" className="rounded-[var(--radius-card)] bg-surface p-4 shadow">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/70">Moves</h2>
          {snap.moves.length === 0 ? (
            <p className="text-sm text-ink/70">No moves yet. White always goes first.</p>
          ) : (
            <ol className="grid max-h-48 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-sm font-mono">
              {snap.moves.map((m, i) => (
                <li key={i}>
                  {i % 2 === 0 ? `${i / 2 + 1}. ` : ""}
                  {m.san}
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>

      {coaching && (
        <CoachDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          log={snap.coachLog}
          hints={snap.hints}
          canRequestHint={snap.canRequestHint}
          hintLoading={snap.hintLoading}
          onRequestHint={() => void session.requestHint()}
          mood={coachMood({ hintLoading: snap.hintLoading, hasTakeBackOffer: snap.takeBackOffer !== undefined })}
        />
      )}
    </main>
  );
}
