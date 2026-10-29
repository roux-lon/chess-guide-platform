"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { parseSquares } from "@/features/play";

interface Props {
  /** Tries the move. Returns nothing; the screen explains refusals the same way as a drag. */
  onMove: (from: string, to: string) => void;
  disabled?: boolean;
}

/**
 * A way to move without a mouse: type the two squares, press Enter. It is also the main way to
 * play with a keyboard or a screen reader, since dragging a piece needs a pointer.
 */
export function MoveInput({ onMove, disabled }: Props) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseSquares(text);
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    setMessage(undefined);
    setText("");
    onMove(parsed.from, parsed.to);
  }

  return (
    <form onSubmit={submit} className="space-y-2" aria-label="Type a move">
      <label htmlFor="move-input" className="block text-sm font-bold uppercase tracking-wide text-ink/70">
        Or type your move
      </label>
      <div className="flex gap-2">
        <input
          id="move-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="e2 e4"
          value={text}
          disabled={disabled}
          aria-describedby="move-input-help"
          onChange={(e) => {
            setText(e.target.value);
            setMessage(undefined);
          }}
          className="min-w-0 flex-1 rounded-[var(--radius-button)] border-2 border-brand/30 bg-surface px-3 py-2 text-lg outline-none focus:border-brand disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="rounded-[var(--radius-button)] bg-brand px-4 py-2 font-bold text-white shadow transition hover:bg-brand-dark disabled:opacity-50"
        >
          Move
        </button>
      </div>
      <p id="move-input-help" className="text-sm text-ink/70">
        Write where the piece is now, then where it goes. For example: e2 e4.
      </p>
      {message && (
        <p role="alert" className="rounded-[var(--radius-card)] bg-warn/25 p-2 text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
