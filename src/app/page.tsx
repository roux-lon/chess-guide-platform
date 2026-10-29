import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <h1 className="text-4xl font-extrabold text-brand">Welcome!</h1>
      <p className="text-lg">
        This is your chess coach. Never played before? Start with the lessons. Already know the
        rules? Play the bot and the coach will talk you through every move.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/learn"
          className="rounded-[var(--radius-card)] bg-brand p-6 text-white shadow-lg transition hover:bg-brand-dark"
        >
          <span className="block text-3xl" aria-hidden="true">
            ♞
          </span>
          <span className="mt-2 block text-2xl font-extrabold">Learn chess</span>
          <span className="block">Short lessons that teach every rule, one step at a time.</span>
        </Link>
        <Link
          href="/play"
          className="rounded-[var(--radius-card)] bg-surface p-6 shadow-lg transition hover:ring-2 hover:ring-brand"
        >
          <span className="block text-3xl" aria-hidden="true">
            ♟
          </span>
          <span className="mt-2 block text-2xl font-extrabold text-brand">Play the bot</span>
          <span className="block">A friendly bot, with a coach who explains every move.</span>
        </Link>
      </div>
    </main>
  );
}
