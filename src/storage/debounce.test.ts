import { describe, expect, it } from "vitest";
import { DebouncedWriter } from "./debounce";
import { manualTimers } from "./testing";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup() {
  const written: string[] = [];
  const clock = manualTimers();
  const writer = new DebouncedWriter<string>(
    async (value) => {
      written.push(value);
    },
    2000,
    clock.timers,
  );
  return { writer, written, clock };
}

describe("DebouncedWriter", () => {
  it("does not write until things go quiet, then writes only the latest value", async () => {
    const { writer, written, clock } = setup();
    writer.schedule("a");
    writer.schedule("b");
    writer.schedule("c");
    expect(written).toEqual([]);
    expect(clock.pending).toBe(1);
    clock.fire();
    await tick();
    expect(written).toEqual(["c"]);
    expect(writer.hasPending).toBe(false);
  });

  it("writes straight away on writeNow and drops the older waiting value", async () => {
    const { writer, written, clock } = setup();
    writer.schedule("old");
    await writer.writeNow("new");
    expect(written).toEqual(["new"]);
    expect(clock.pending).toBe(0);
    expect(writer.hasPending).toBe(false);
  });

  it("flush writes what is waiting, and does nothing when nothing is", async () => {
    const { writer, written } = setup();
    await writer.flush();
    expect(written).toEqual([]);
    writer.schedule("x");
    await writer.flush();
    expect(written).toEqual(["x"]);
    await writer.flush();
    expect(written).toEqual(["x"]);
  });

  it("can forget a waiting value", async () => {
    const { writer, written, clock } = setup();
    writer.schedule("x");
    writer.cancel();
    expect(clock.pending).toBe(0);
    await writer.flush();
    expect(written).toEqual([]);
  });

  it("never overlaps writes and keeps them in order", async () => {
    const log: string[] = [];
    let release: () => void = () => {};
    const writer = new DebouncedWriter<string>(async (value) => {
      log.push(`start ${value}`);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      log.push(`end ${value}`);
    }, 10);

    const first = writer.writeNow("1");
    const second = writer.writeNow("2");
    await tick();
    expect(log).toEqual(["start 1"]);
    release();
    await first;
    await tick();
    expect(log).toEqual(["start 1", "end 1", "start 2"]);
    release();
    await second;
    expect(log).toEqual(["start 1", "end 1", "start 2", "end 2"]);
  });

  it("keeps writing after one write fails, and does not leak the failure from the timer", async () => {
    let attempts = 0;
    const written: string[] = [];
    const clock = manualTimers();
    const writer = new DebouncedWriter<string>(
      async (value) => {
        attempts++;
        if (attempts === 1) throw new Error("disk full");
        written.push(value);
      },
      10,
      clock.timers,
    );
    writer.schedule("a");
    clock.fire();
    await tick();
    expect(attempts).toBe(1);
    await writer.writeNow("b");
    expect(written).toEqual(["b"]);
  });

  it("reports a failed immediate write to the caller", async () => {
    const writer = new DebouncedWriter<string>(async () => {
      throw new Error("nope");
    }, 10);
    await expect(writer.writeNow("x")).rejects.toThrow("nope");
  });
});
