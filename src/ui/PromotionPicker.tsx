"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { PromotionPiece } from "@/rules";

const CHOICES: { piece: PromotionPiece; label: string; glyph: string }[] = [
  { piece: "queen", label: "Queen", glyph: "♛" },
  { piece: "rook", label: "Rook", glyph: "♜" },
  { piece: "bishop", label: "Bishop", glyph: "♝" },
  { piece: "knight", label: "Knight", glyph: "♞" },
];

interface Props {
  onChoose: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export function PromotionPicker({ onChoose, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard users land on the first choice (the queen), and Tab stays inside until they decide.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={dialogRef}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a piece for your pawn"
      className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-board)] bg-ink/60 p-4"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-surface p-5 text-center shadow-xl">
        <h2 className="text-xl font-extrabold text-brand">Your pawn made it across!</h2>
        <p className="mt-1 text-sm text-ink/70">
          It turns into a new piece. Pick one (the queen is the strongest).
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {CHOICES.map(({ piece, label, glyph }) => (
            <button
              key={piece}
              type="button"
              onClick={() => onChoose(piece)}
              className="flex flex-col items-center rounded-[var(--radius-button)] bg-page px-1 py-3 font-bold text-ink shadow transition hover:bg-brand hover:text-white"
            >
              <span className="text-4xl leading-none" aria-hidden="true">
                {glyph}
              </span>
              <span className="mt-1 text-xs">{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-sm font-semibold text-ink/70 underline"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
