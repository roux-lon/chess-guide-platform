/** The person's own calendar day, like "2026-03-09". Uses local time, so midnight is their midnight. */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The day before a YYYY-MM-DD day. Pure calendar maths, so daylight saving cannot upset it. */
export function dayBefore(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const earlier = new Date(Date.UTC(y, m - 1, d - 1));
  return earlier.toISOString().slice(0, 10);
}
