import { describe, expect, it } from "vitest";
import { createGame } from "@/rules";
import { describeStatus } from "./statusText";

describe("describeStatus", () => {
  it("tells the player it is their turn", () => {
    const line = describeStatus(createGame().status(), "white", false);
    expect(line.text).toMatch(/your turn/i);
  });

  it("explains check", () => {
    const status = createGame("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1").status();
    expect(describeStatus(status, "black", false)).toMatchObject({ tone: "warning" });
  });

  it("reports a win and a loss by checkmate", () => {
    const status = createGame("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1").status();
    expect(describeStatus(status, "white", false).tone).toBe("win");
    expect(describeStatus(status, "black", false).tone).toBe("lose");
  });

  it("says so when the player resigned", () => {
    const line = describeStatus(createGame().status(), "white", false, true);
    expect(line.tone).toBe("lose");
    expect(line.text).toMatch(/resigned/i);
  });

  it("reports stalemate as a draw", () => {
    const status = createGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").status();
    const line = describeStatus(status, "white", false);
    expect(line.tone).toBe("draw");
    expect(line.text).toMatch(/stalemate/i);
  });
});
