"use client";

import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { DrawShape } from "chessground/draw";
import type { Key } from "chessground/types";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";
import type { ArrowColor, HighlightKind } from "./theme";

type Side = "white" | "black";

export interface BoardHighlight {
  square: string;
  kind: HighlightKind;
}

export interface BoardArrow {
  from: string;
  to: string;
  color?: ArrowColor;
}

export interface BoardProps {
  fen: string;
  orientation?: Side;
  /** Whose turn it is in `fen`. */
  turn: Side;
  /** Which side the user may move. Leave undefined for a read-only board. */
  movableColor?: Side;
  /** Legal destinations by origin square. Anything not listed cannot be moved. */
  legalDests?: Map<string, string[]>;
  onMove?: (from: string, to: string) => void;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  lastMove?: { from: string; to: string };
  /** Side whose king is in check, if any. */
  check?: Side;
}

/**
 * Our wrapper around chessground. The rest of the app only sees these props,
 * so lessons can add highlights and arrows without knowing about the library.
 */
export function Board({
  fen,
  orientation = "white",
  turn,
  movableColor,
  legalDests,
  onMove,
  highlights,
  arrows,
  lastMove,
  check,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const api = Chessground(el, {
      coordinates: true,
      autoCastle: true,
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 200 },
      draggable: { showGhost: true },
      premovable: { enabled: false },
      drawable: { enabled: false },
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  // Runs after every render on purpose: when the parent re-renders with the same
  // FEN (for example after a move was rejected) the board snaps back to it.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const custom = new Map<Key, string>();
    for (const h of highlights ?? []) custom.set(h.square as Key, `hl-${h.kind}`);

    const autoShapes: DrawShape[] = (arrows ?? []).map((a) => ({
      orig: a.from as Key,
      dest: a.to as Key,
      brush: a.color ?? "green",
    }));

    const config: Config = {
      fen,
      orientation,
      turnColor: turn,
      check,
      lastMove: lastMove ? [lastMove.from as Key, lastMove.to as Key] : undefined,
      selected: undefined,
      viewOnly: false,
      movable: {
        free: false,
        color: movableColor,
        dests: (legalDests ?? new Map()) as Map<Key, Key[]>,
        showDests: true,
        events: {
          after: (from, to) => onMoveRef.current?.(from, to),
        },
      },
      highlight: { lastMove: true, check: true, custom },
      drawable: { autoShapes },
    };
    api.set(config);
  });

  return (
    <div
      ref={containerRef}
      className="aspect-square w-full overflow-hidden rounded-[var(--radius-board)] shadow-lg"
      aria-label="Chess board"
    />
  );
}
