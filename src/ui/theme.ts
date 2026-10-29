// Shared design tokens for values used from TypeScript. The matching CSS
// variables live in src/app/globals.css (@theme) so Tailwind classes use them too.

export const colors = {
  brand: "#6d4aff",
  brandDark: "#4b2fd1",
  surface: "#ffffff",
  page: "#f4f1ff",
  ink: "#1e1b3a",
  good: "#2fb36b",
  warn: "#f5a623",
  danger: "#e5484d",
  info: "#3b82f6",
} as const;

export const radii = {
  card: "1.25rem",
  button: "0.9rem",
  board: "0.75rem",
} as const;

/** Square highlight kinds the board understands. Styled in globals.css (.hl-*). */
export type HighlightKind = "good" | "warn" | "danger" | "info";

/** Arrow colours the board understands. */
export type ArrowColor = "green" | "red" | "blue" | "yellow";
