"use client";

import { THINK_FIRST_TEXT } from "@/content";
import { THINK_FIRST_MODES } from "@/storage";
import { useReducedMotion } from "./useReducedMotion";
import { usePreferences } from "./usePreferences";

/** Switches for the playful extras. Sound starts off. */
export function PreferencesSettings() {
  const { prefs, update } = usePreferences();
  const reduced = useReducedMotion();

  return (
    <section aria-label="Fun extras" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
      <h2 className="text-xl font-extrabold">Fun extras</h2>
      <label className="flex items-center gap-3 text-lg">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand"
          checked={prefs.sound}
          onChange={(e) => update({ sound: e.target.checked })}
        />
        Sound effects
      </label>
      <label className="flex items-center gap-3 text-lg">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand"
          checked={prefs.confetti && !reduced}
          disabled={reduced}
          onChange={(e) => update({ confetti: e.target.checked })}
        />
        Confetti when you win
      </label>
      {reduced && (
        <p className="text-sm text-ink/70">
          Your device is set to reduce motion, so there is no confetti. Thank you for telling us!
        </p>
      )}
    </section>
  );
}

/** How often the game asks a quick question before the player's move. */
export function ThinkFirstSettings() {
  const { prefs, update } = usePreferences();
  return (
    <section aria-label={THINK_FIRST_TEXT.settingsTitle} className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
      <h2 className="text-xl font-extrabold">{THINK_FIRST_TEXT.settingsTitle}</h2>
      <p className="text-sm text-ink/70">{THINK_FIRST_TEXT.settingsBlurb}</p>
      <div role="radiogroup" aria-label={THINK_FIRST_TEXT.settingsTitle} className="space-y-2">
        {THINK_FIRST_MODES.map((mode) => (
          <label key={mode} className="flex items-start gap-3 text-lg">
            <input
              type="radio"
              name="think-first"
              className="mt-1.5 h-5 w-5 accent-brand"
              checked={prefs.thinkFirst === mode}
              onChange={() => update({ thinkFirst: mode })}
            />
            <span>
              <span className="font-bold">{THINK_FIRST_TEXT.modeLabel[mode]}</span>
              <span className="block text-sm text-ink/70">{THINK_FIRST_TEXT.modeBlurb[mode]}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
