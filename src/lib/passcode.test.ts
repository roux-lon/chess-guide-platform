import { describe, expect, it } from "vitest";
import { passcodeMatches, sha256Hex } from "./passcode";

// Well-known SHA-256 of "abc".
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("passcode", () => {
  it("hashes to the known SHA-256 value", async () => {
    expect(await sha256Hex("abc")).toBe(ABC);
  });

  it("accepts the right passcode and rejects the wrong one", async () => {
    expect(await passcodeMatches("abc", ABC)).toBe(true);
    expect(await passcodeMatches("abd", ABC)).toBe(false);
  });

  it("ignores case and whitespace in the stored hash", async () => {
    expect(await passcodeMatches("abc", ` ${ABC.toUpperCase()}\n`)).toBe(true);
  });

  it("never matches when no hash is configured", async () => {
    expect(await passcodeMatches("", "")).toBe(false);
  });
});
