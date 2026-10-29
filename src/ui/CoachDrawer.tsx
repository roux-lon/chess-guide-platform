"use client";

import { useEffect, useRef } from "react";
import type { CoachLogEntry, HintView } from "@/features/play";

interface Props {
  open: boolean;
  onClose: () => void;
  log: readonly CoachLogEntry[];
  hints: HintView[];
  canRequestHint: boolean;
  hintLoading: boolean;
  onRequestHint: () => void;
}

/** Slide-out panel with the coach's comments and hints. It only displays what it is given. */
export function CoachDrawer({
  open,
  onClose,
  log,
  hints,
  canRequestHint,
  hintLoading,
  onRequestHint,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const newestRef = useRef<HTMLLIElement>(null);

  // Esc closes the drawer while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move keyboard focus into the drawer when it opens.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Keep the newest comment in view.
  useEffect(() => {
    if (open) newestRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [open, log.length]);

  return (
    <aside
      id="coach-drawer"
      aria-label="Your coach"
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col bg-surface shadow-2xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <header className="flex items-center justify-between border-b border-ink/10 p-4">
        <h2 className="text-xl font-extrabold text-brand">Your coach</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-button)] bg-page px-3 py-1 font-bold text-ink shadow transition hover:bg-brand hover:text-white"
        >
          Close
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section aria-label="Hints">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/60">Hints</h3>
          {hints.length === 0 && !hintLoading && (
            <p className="text-sm text-ink/70">
              Not sure what to do? Press the button and I will give you a small nudge. Each press
              tells you a bit more.
            </p>
          )}
          <ol className="space-y-2">
            {hints.map((hint) => (
              <li key={hint.tier} className="rounded-[var(--radius-card)] bg-info/15 p-3 text-sm">
                <span className="font-bold">Hint {hint.tier} of 3: </span>
                {hint.text}
              </li>
            ))}
          </ol>
          {hintLoading && (
            <p role="status" className="mt-2 text-sm text-ink/70">
              Let me think about this position...
            </p>
          )}
          {canRequestHint && (
            <button
              type="button"
              onClick={onRequestHint}
              className="mt-3 rounded-[var(--radius-button)] bg-brand px-4 py-2 font-bold text-white shadow transition hover:bg-brand-dark"
            >
              {hints.length === 0 ? "I'm stuck: give me a hint" : "Show the next hint"}
            </button>
          )}
        </section>

        <section aria-label="Move comments">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/60">
            What happened
          </h3>
          {log.length === 0 ? (
            <p className="text-sm text-ink/70">Make a move and I will tell you what I think.</p>
          ) : (
            <ol className="space-y-2">
              {log.map((entry, i) => {
                const newest = i === log.length - 1;
                return (
                  <li
                    key={`${entry.ply}-${entry.moveSan}`}
                    ref={newest ? newestRef : undefined}
                    aria-current={newest ? "true" : undefined}
                    className={`rounded-[var(--radius-card)] p-3 text-sm ${
                      newest ? "bg-brand/15 ring-2 ring-brand" : "bg-page"
                    }`}
                  >
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/60">
                      Move {Math.ceil(entry.ply / 2)} · {entry.side === "you" ? "You" : "Bot"} ·{" "}
                      <span className="font-mono normal-case">{entry.moveSan}</span>
                    </p>
                    <p>{entry.text}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}
