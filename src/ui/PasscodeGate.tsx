"use client";

import { useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import { passcodeMatches } from "@/lib/passcode";
import { Mascot } from "./Mascot";

/*
 * This is a polite lock, not real security. The check runs in the browser and
 * the hash ships with the page, so anyone determined can get past it. That is
 * fine because the app holds no secrets. See PLAN.md section 5.
 */

const UNLOCKED_KEY = "chess-coach-unlocked";
const PASSCODE_HASH = process.env.NEXT_PUBLIC_PASSCODE_HASH ?? "";

const listeners = new Set<() => void>();


function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

function setUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  } catch {
    // Storage blocked: the unlock just will not survive a reload.
  }
  listeners.forEach((l) => l());
}

export function PasscodeGate({ children }: { children: ReactNode }) {
  // null on the server and during hydration, so server and client markup match.
  const unlocked = useSyncExternalStore<boolean | null>(subscribe, readUnlocked, () => null);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  if (unlocked === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <Mascot mood="thinking" size={96} />
        <p role="status" className="text-lg text-ink/70">
          Getting things ready...
        </p>
      </main>
    );
  }
  if (unlocked) return <>{children}</>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await passcodeMatches(typed, PASSCODE_HASH);
    setBusy(false);
    if (ok) {
      setUnlocked();
    } else {
      setWrong(true);
      setTyped("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-xl"
      >
        <Mascot mood="happy" size={96} label="Pip, your chess coach" className="mx-auto" />
        <h1 className="text-3xl font-extrabold text-brand">Chess Coach</h1>
        <p className="mt-2 text-ink/70">Type your secret word to come in.</p>
        <label className="sr-only" htmlFor="passcode">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          autoComplete="off"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setWrong(false);
          }}
          className="mt-6 w-full rounded-[var(--radius-button)] border-2 border-brand/30 px-4 py-3 text-lg outline-none focus:border-brand"
        />
        {wrong && (
          <p role="alert" className="mt-3 text-danger">
            Hmm, that is not it. Try again!
          </p>
        )}
        {!PASSCODE_HASH && (
          <p role="alert" className="mt-3 text-sm text-ink">
            No passcode is set up yet. Run <code>node scripts/hash-passcode.mjs &quot;word&quot;</code>{" "}
            and put the result in <code>.env.local</code> as NEXT_PUBLIC_PASSCODE_HASH.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || typed.length === 0}
          className="mt-6 w-full rounded-[var(--radius-button)] bg-brand px-4 py-3 text-lg font-bold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-50"
        >
          Let me in
        </button>
      </form>
    </main>
  );
}
