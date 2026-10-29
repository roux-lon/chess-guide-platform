// Shared design tokens for values used from TypeScript. The matching CSS variables live in
// src/app/globals.css (@theme) so Tailwind classes use them too; theme.test.ts keeps the two in
// step and checks that every text and board colour pairing is readable (WCAG AA).

export const colors = {
  brand: "#6d4aff",
  brandDark: "#4b2fd1",
  surface: "#ffffff",
  page: "#f4f1ff",
  ink: "#1e1b3a",
  /** Fill colour for "good" things. For TEXT on a light background use goodDark. */
  good: "#2fb36b",
  goodDark: "#17703f",
  /** Fill colour. Put dark ink on it, never white. */
  warn: "#f5a623",
  danger: "#c62a30",
  info: "#2563eb",
} as const;

/** The board's two square colours (our own, so the board matches the rest of the app). */
export const board = {
  light: "#f6ecd2",
  dark: "#8f74e0",
} as const;

export const radii = {
  card: "1.25rem",
  button: "0.9rem",
  board: "0.75rem",
} as const;

export const shadows = {
  soft: "0 4px 14px rgba(30, 27, 58, 0.12)",
  chunky: "0 4px 0 rgba(30, 27, 58, 0.18)",
} as const;

export const fonts = {
  /** Rounded system fonts first, so nothing has to be downloaded (the app works offline). */
  display: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

/** Square highlight kinds the board understands. Styled in globals.css (.hl-*). */
export type HighlightKind = "good" | "warn" | "danger" | "info";

/** Arrow colours the board understands. */
export type ArrowColor = "green" | "red" | "blue" | "yellow";
