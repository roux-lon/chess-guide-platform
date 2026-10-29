import Link from "next/link";
import { ERROR_TEXT } from "@/content";
import { Mascot } from "./Mascot";

interface Props {
  kind: "error" | "not-found";
  /** Shown for "error": tries to draw the page again. */
  onRetry?: () => void;
}

/** A friendly full-page message, so a problem is never a blank screen. */
export function ErrorScreen({ kind, onRetry }: Props) {
  const notFound = kind === "not-found";
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <Mascot mood={notFound ? "thinking" : "oops"} size={120} />
      <h1 className="text-3xl font-extrabold text-brand">
        {notFound ? ERROR_TEXT.notFoundHeading : ERROR_TEXT.heading}
      </h1>
      <p className="text-lg">{notFound ? ERROR_TEXT.notFoundBody : ERROR_TEXT.body}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {!notFound && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[var(--radius-button)] bg-brand px-5 py-3 text-lg font-bold text-white shadow transition hover:bg-brand-dark"
          >
            {ERROR_TEXT.retry}
          </button>
        )}
        <Link
          href="/"
          className="rounded-[var(--radius-button)] bg-surface px-5 py-3 text-lg font-bold text-ink shadow transition hover:bg-brand hover:text-white"
        >
          {ERROR_TEXT.home}
        </Link>
      </div>
    </main>
  );
}
