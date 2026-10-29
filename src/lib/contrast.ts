// WCAG colour contrast, for checking the design tokens. Pure maths, no dependencies.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

/** Lays a colour with some opacity over a solid background, like a translucent tint does. */
export function blend(foreground: string, background: string, alpha: number): string {
  const f = hexToRgb(foreground);
  const b = hexToRgb(background);
  const mixed = f.map((channel, i) => Math.round(channel * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio from 1 to 21. WCAG AA wants 4.5 for normal text and 3 for large text. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
