// Words around the coach drawer: labels and headings. The coach's own sentences live in
// coach/templates; these are the small bits of interface text.

export type CommentKindKey = "threat" | "opportunity" | "trade" | "info";

/** The small label on a comment: what kind of thing it is about. */
export const COMMENT_KIND_LABEL: Record<CommentKindKey, string> = {
  threat: "Threat",
  opportunity: "Chance",
  trade: "Trade",
  info: "Tip",
};

export const COACH_DRAWER_TEXT = {
  yourTurn: "Your turn",
  botTurn: "Bot's turn",
  whyLabel: "Why:",
  watchLabel: "Watch:",
  moreLabel: (count: number) => (count === 1 ? "1 more thing" : `${count} more things`),
  hintLabel: (tier: number, total: number) => `Hint ${tier} of ${total}`,
} as const;
