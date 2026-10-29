"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BOT_LEVELS,
  GameSession,
  LEVELS,
  createAnalysisEngine,
  createBotEngine,
} from "@/features/play";
import type { BotLevel } from "@/features/play";
import { describeStatus } from "@/features/play/statusText";
import { useProgress } from "./useProgress";
import type { Color } from "@/rules";
import { Board } from "./Board";
import { CoachDrawer } from "./CoachDrawer";
import { PromotionPicker } from "./PromotionPicker";

const TONE_CLASS = {
  neutral: "bg-surface text-ink",
  warning: "bg-warn/20 text-ink",
  win: "bg-good/20 text-ink",
  lose: "bg-danger/15 text-ink",
  draw: "bg-info/15 text-ink",
} as const;

function useSession(): GameSession {
  const [session] = useState(
    () => new GameSession({ engine: createBotEngine(), analysisEngine: createAnalysisEngine() }),
  );
  useEffect(() => {
    session.start();
    return () => session.dispose();
  }, [session]);
  return session;
}

export function GameScreen() {
  const session = useSession();
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [nextColor, setNextColor] = useState<Color>("white");
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** How many comments the player has already seen, for the "new" badge. */
  const [seenCount, setSeenCount] = useState(0);
  const coachButtonRef = useRef<HTMLButtonElement>(null);

  // The bot level lives in the diary's settings. Apply the saved one once it has loaded.
  const { snapshot: progress, store: progressStore } = useProgress();
  const appliedSavedLevel = useRef(false);
  const savedLevel = progress.diary.settings.botLevel;
  useEffect(() => {
    if (!progress.ready || appliedSavedLevel.current) return;
    appliedSavedLevel.current = true;
    const level = BOT_LEVELS.find((l) => l === savedLevel);
    if (level) session.setLevel(level);
  }, [progress.ready, savedLevel, session]);

  const status = describeStatus(snap.status, snap.playerColor, snap.botThinking);
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
      <section className="relative w-full max-w-[640px] lg:flex-1">
        <Board
          fen={snap.fen}
          turn={snap.turn}
          orientation={snap.playerColor}
          movableColor={humanCanMove ? snap.playerColor : undefined}
          legalDests={snap.legalDests}
          lastMove={snap.lastMove}
          check={snap.status.inCheck ? snap.turn : undefined}
          onMove={(from, to) => session.attemptMove(from, to)}
        />
        {snap.pendingPromotion && (
          <PromotionPicker
            onChoose={(piece) => session.choosePromotion(piece)}
            onCancel={() => session.cancelPromotion()}
          />
        )}
      </section>

      <aside className="flex w-full flex-col gap-4 lg:w-80">
        <h1 className="text-3xl font-extrabold text-brand">Chess Coach</h1>

        <div
          role="status"
          aria-live="polite"
          className={`rounded-[var(--radius-card)] p-4 text-lg font-semibold shadow ${TONE_CLASS[status.tone]}`}
        >
          {status.text}
        </div>

        {snap.error && (
          <p role="alert" className="rounded-[var(--radius-card)] bg-danger/15 p-3 text-sm">
            Something went wrong: {snap.error}
          </p>
        )}

        {snap.takeBackOffer && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-warn/25 p-4 shadow"
          >
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            ref={coachButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="coach-drawer"
            className="relative rounded-[var(--radius-button)] bg-surface px-4 py-2 font-bold text-ink shadow transition hover:bg-brand hover:text-white"
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
            className="rounded-[var(--radius-button)] bg-info px-4 py-2 font-bold text-white shadow transition hover:brightness-110"
          >
            I&apos;m stuck
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => session.undo()}
            disabled={!snap.canUndo}
            className="rounded-[var(--radius-button)] bg-surface px-4 py-2 font-bold text-ink shadow transition hover:bg-brand hover:text-white disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-ink"
          >
            Undo my move
          </button>
          <button
            type="button"
            onClick={() => session.newGame(nextColor)}
            className="rounded-[var(--radius-button)] bg-brand px-4 py-2 font-bold text-white shadow transition hover:bg-brand-dark"
          >
            New game
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold">
            I play
            <select
              value={nextColor}
              onChange={(e) => setNextColor(e.target.value as Color)}
              className="rounded-[var(--radius-button)] bg-surface px-2 py-2 shadow"
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
        </div>

        <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Bot strength
            <select
              value={snap.level}
              onChange={(e) => {
                const level = Number(e.target.value) as BotLevel;
                session.setLevel(level);
                // Saved after a quiet moment, so changing it a few times writes the file once.
                void progressStore.updateSettings({ botLevel: level });
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
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/60">Moves</h2>
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

      <CoachDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        log={snap.coachLog}
        hints={snap.hints}
        canRequestHint={snap.canRequestHint}
        hintLoading={snap.hintLoading}
        onRequestHint={() => void session.requestHint()}
      />
    </main>
  );
}
