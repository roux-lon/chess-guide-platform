"use client";

import { useEffect, useRef } from "react";
import type { Prefs } from "@/storage";
import { usePreferences } from "./usePreferences";
import { useReducedMotion } from "./useReducedMotion";

/** Confetti only appears if it is switched on AND the person has not asked for less motion. */
export function canCelebrate(prefs: Pick<Prefs, "confetti">, reducedMotion: boolean): boolean {
  return prefs.confetti && !reducedMotion;
}

const COLORS = ["#6d4aff", "#2fb36b", "#f5a623", "#2563eb", "#ff7aa8", "#c62a30"];
const DURATION_MS = 2600;
const PIECES = 140;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  color: string;
}

/**
 * A short burst of confetti for something to celebrate. It is only decoration: hidden from screen
 * readers, never blocks clicks, ends by itself after a couple of seconds, and Escape stops it.
 * It draws nothing at all for people who prefer reduced motion.
 */
export function Confetti({ run }: { run: boolean }) {
  const { prefs } = usePreferences();
  const reducedMotion = useReducedMotion();
  const allowed = run && canCelebrate(prefs, reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!allowed || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const pieces: Piece[] = Array.from({ length: PIECES }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      size: 6 + Math.random() * 7,
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frame = 0;
    let stopped = false;
    const started = performance.now();

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);

    const tick = (time: number) => {
      if (stopped) return;
      const elapsed = time - started;
      ctx.clearRect(0, 0, width, height);
      const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.7) / (DURATION_MS * 0.3));
      for (const p of pieces) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, [allowed]);

  if (!allowed) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="confetti"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
