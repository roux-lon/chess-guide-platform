"use client";

import Link from "next/link";
import { PRINCIPLES_TEXT, principleById } from "@/content";

/** A small label naming the rule of thumb something is about. It links to the "Rules I've learned" page. */
export function PrincipleChip({ id }: { id: string | undefined }) {
  const principle = id ? principleById(id) : undefined;
  if (!principle) return null;
  return (
    <Link
      href={`/principles#${principle.id}`}
      className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-ink hover:bg-brand hover:text-white"
    >
      {PRINCIPLES_TEXT.chipLabel}: {principle.title}
    </Link>
  );
}
