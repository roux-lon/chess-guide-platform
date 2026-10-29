"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BOT_LEVELS, GameSession, LEVELS, createBotEngine } from "@/features/play";
import type { BotLevel } from "@/features/play";
import { describeStatus } from "@/features/play/statusText";
import type { Color } from "@/rules";
import { Board } from "./Board";
import { PromotionPicker } from "./PromotionPicker";

const TONE_CLASS = {
  neutral: "bg-surface text-ink",
  warning: "bg-warn/20 text-ink",
  win: "bg-good/20 text-ink",
  lose: "bg-danger/15 text-ink",
  draw: "bg-info/15 text-ink",
} as const;

function useSession(): GameSession {
  const [session] = useState(() => new GameSession({ engine: createBotEngine() }));
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

  const status = describeStatus(snap.status, snap.playerColor, snap.botThinking);
  const humanCanMove = snap.legalDests.size > 0;

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
              onChange={(e) => session.setLevel(Number(e.target.value) as BotLevel)}
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
    </main>
  );
}
