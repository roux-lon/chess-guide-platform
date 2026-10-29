"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/play", label: "Play the bot" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-2 p-4">
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
    </nav>
  );
}
