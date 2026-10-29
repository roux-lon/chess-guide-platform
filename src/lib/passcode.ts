/** SHA-256 of `text` as lowercase hex. Uses Web Crypto, available in browsers and Node. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when the typed passcode hashes to `expectedHash` (hex, case-insensitive). */
export async function passcodeMatches(typed: string, expectedHash: string): Promise<boolean> {
  const expected = expectedHash.trim().toLowerCase();
  if (!expected) return false;
  return (await sha256Hex(typed)) === expected;
}
