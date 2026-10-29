"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { chipFor } from "@/features/progress";
import { useProgress } from "./useProgress";

const CHIP_STYLE = {
  good: "bg-good/25 text-ink",
  warn: "bg-warn/30 text-ink",
  bad: "bg-danger/20 text-ink",
  info: "bg-info/20 text-ink",
} as const;

const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/play", label: "Play the bot" },
  { href: "/progress", label: "Progress" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { snapshot, settled } = useProgress();
  // Until the diary has been read there is nothing true to say about it yet.
  const chip = settled ? chipFor(snapshot.status) : { label: "Diary", tone: "info" as const };
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-2 p-4">
      <Link href="/" className="mr-2 text-2xl font-extrabold text-brand">
        Chess Coach
      </Link>
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--radius-button)] px-4 py-2 font-bold shadow transition ${
              active ? "bg-brand text-white" : "bg-surface text-ink hover:bg-brand hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href="/settings"
        aria-label={`${chip.label}. Open diary settings`}
        className={`ml-auto rounded-full px-4 py-2 text-sm font-bold shadow ${CHIP_STYLE[chip.tone]}`}
      >
        {chip.label}
      </Link>
    </nav>
  );
}
