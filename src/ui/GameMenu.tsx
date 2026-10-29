"use client";

import { useState } from "react";
import { COACHING_MODE_TEXT } from "@/content";
import { BOT_LEVELS, LEVELS } from "@/features/play";
import type { BotLevel } from "@/features/play";
import type { GameConfig, ResumeOffer } from "@/features/games";

const MODES = ["quiet", "full", "off"] as const;
const COLORS = [
  { value: "white", label: "White (you move first)" },
  { value: "black", label: "Black (the bot moves first)" },
] as const;

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-50";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;

interface Props {
  defaults: GameConfig;
  resume: ResumeOffer | null;
  diaryReady: boolean;
  busy?: boolean;
  onStart(config: GameConfig): void;
  onResume(): void;
  onDiscard(): void;
}

/** Before a game: pick the bot's strength, your colour and how much coaching you want. */
export function GameMenu({ defaults, resume, diaryReady, busy = false, onStart, onResume, onDiscard }: Props) {
  const [level, setLevel] = useState<BotLevel>(defaults.level);
  const [playerColor, setPlayerColor] = useState(defaults.playerColor);
  const [coachingMode, setCoachingMode] = useState(defaults.coachingMode);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <h1 className="text-3xl font-extrabold text-brand">Play the bot</h1>

      {resume && (
        <section
          aria-label="Continue your game"
          className="space-y-3 rounded-[var(--radius-card)] bg-info/15 p-5 shadow"
        >
          <h2 className="text-xl font-extrabold">Continue your game?</h2>
          <p className="text-lg">
            You left a game as {resume.active.playerColor === "white" ? "White" : "Black"} against level{" "}
            {resume.active.botLevel}, after {resume.moveCount} {resume.moveCount === 1 ? "move" : "moves"}.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={onResume} className={primary}>
              Continue your game
            </button>
            <button type="button" disabled={busy} onClick={onDiscard} className={secondary}>
              Give it up
            </button>
          </div>
        </section>
      )}

      {!diaryReady && (
        <p role="alert" className="rounded-[var(--radius-card)] bg-warn/25 p-4">
          Your diary is not connected yet, so a game played now is saved only once you connect it.
        </p>
      )}

      <form
        aria-label="Start a new game"
        className="space-y-5 rounded-[var(--radius-card)] bg-surface p-5 shadow"
        onSubmit={(event) => {
          event.preventDefault();
          onStart({ level, playerColor, coachingMode });
        }}
      >
        <h2 className="text-xl font-extrabold">{resume ? "Or start a new game" : "Start a new game"}</h2>
        {resume && (
          <p className="text-sm text-ink/70">Starting a new game gives up the one you left. It stays in your history.</p>
        )}

        <label className="flex flex-col gap-1 font-semibold">
          Bot strength
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as BotLevel)}
            className="rounded-[var(--radius-button)] bg-page px-3 py-2"
          >
            {BOT_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVELS[l].label}
              </option>
            ))}
          </select>
          <span className="text-sm font-normal text-ink/70">{LEVELS[level].blurb}</span>
        </label>

        <fieldset className="space-y-2">
          <legend className="font-semibold">You play</legend>
          {COLORS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="color"
                value={value}
                checked={playerColor === value}
                onChange={() => setPlayerColor(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-semibold">Coaching</legend>
          {MODES.map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer gap-3 rounded-[var(--radius-button)] p-3 ring-2 ${
                coachingMode === mode ? "bg-brand/10 ring-brand" : "ring-transparent hover:ring-brand/40"
              }`}
            >
              <input
                type="radio"
                name="coaching"
                value={mode}
                checked={coachingMode === mode}
                onChange={() => setCoachingMode(mode)}
                className="mt-1"
              />
              <span>
                <span className="block font-bold">{COACHING_MODE_TEXT[mode].label}</span>
                <span className="block text-sm text-ink/70">{COACHING_MODE_TEXT[mode].blurb}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={busy} className={primary}>
          Start the game
        </button>
      </form>
    </main>
  );
}
