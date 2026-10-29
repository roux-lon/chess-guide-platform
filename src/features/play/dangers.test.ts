import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { dangerHighlights } from "./dangers";

describe("dangerHighlights", () => {
  it("lights up the player's pieces that could be taken, and the bot's loose pieces", () => {
    // White's knight on c3 is attacked by the bishop on a5 and unprotected; black's queen on d8 is loose too.
    const fen = "3qk3/8/8/b7/8/2N5/8/3RK3 w - - 0 1";
    const lit = dangerHighlights(fen, "white");
    expect(lit).toContainEqual({ square: "c3", kind: "danger" });
    expect(lit).toContainEqual({ square: "d8", kind: "good" });
  });

  it("swaps the meaning when the player is Black", () => {
    const fen = "3qk3/8/8/b7/8/2N5/8/3RK3 w - - 0 1";
    const lit = dangerHighlights(fen, "black");
    expect(lit).toContainEqual({ square: "c3", kind: "good" });
    expect(lit).toContainEqual({ square: "d8", kind: "danger" });
  });

  it("shows nothing when nothing is in danger", () => {
    expect(dangerHighlights(START_FEN, "white")).toEqual([]);
  });
});
