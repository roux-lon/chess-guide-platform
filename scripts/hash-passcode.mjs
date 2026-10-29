// Usage: node scripts/hash-passcode.mjs "your passcode"
// Prints the SHA-256 hex hash to put in NEXT_PUBLIC_PASSCODE_HASH (.env.local).
import { createHash } from "node:crypto";

const passcode = process.argv[2];
if (!passcode) {
  console.error('Usage: node scripts/hash-passcode.mjs "your passcode"');
  process.exit(1);
}
console.log(createHash("sha256").update(passcode, "utf8").digest("hex"));
