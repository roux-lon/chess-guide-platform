"use client";

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
