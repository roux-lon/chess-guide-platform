// Words for the friendly "something went wrong" screens. Never blame the person.

export const ERROR_TEXT = {
  heading: "Oops, something went wrong",
  body: "That was not your fault. Your saved progress is safe. Press the button to try again.",
  retry: "Try again",
  home: "Back to the start",
  notFoundHeading: "I can't find that page",
  notFoundBody: "Maybe the link is old. Let's go back to somewhere I know.",
  engineFailed: "The bot had a problem thinking about its move.",
  engineRetry: "Ask the bot to try again",
} as const;
