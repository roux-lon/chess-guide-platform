// Runs the real lite single-threaded Stockfish as a child process, for manual checks.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import type { UciTransportFactory } from "@/engine";

const require = createRequire(import.meta.url);

export const createNodeTransport: UciTransportFactory = ({ onLine, onError }) => {
  const enginePath = (require("stockfish") as { findEngine(name: string): string }).findEngine(
    "lite-single",
  );
  const child = spawn(process.execPath, [enginePath], { stdio: "pipe" });
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(onLine);
  });
  child.on("error", onError);
  return {
    send: (command) => child.stdin.write(command + "\n"),
    terminate: () => void child.kill(),
  };
};
