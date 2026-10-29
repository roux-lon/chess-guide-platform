/** A run of text, optionally in bold. */
export interface InlineSpan {
  text: string;
  bold: boolean;
}

/**
 * Splits text on **double asterisks** into plain and bold spans. An unmatched marker is
 * kept as ordinary text so a typo in lesson data never swallows a sentence.
 */
export function parseInline(text: string): InlineSpan[] {
  const parts = text.split("**");
  // An even number of parts means an odd number of markers: the last one has no partner.
  const unmatched = parts.length % 2 === 0;
  const spans: InlineSpan[] = [];

  parts.forEach((part, index) => {
    const bold = index % 2 === 1;
    if (unmatched && index === parts.length - 1) {
      // Put the lone marker back in front of the leftover text.
      const last = spans[spans.length - 1];
      if (last && !last.bold) last.text += `**${part}`;
      else spans.push({ text: `**${part}`, bold: false });
      return;
    }
    if (part.length > 0) spans.push({ text: part, bold });
  });
  return spans;
}

/** The text with the markers removed, for places that cannot show bold. */
export function stripEmphasis(text: string): string {
  return parseInline(text)
    .map((span) => span.text)
    .join("");
}
