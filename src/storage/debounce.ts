export interface Timers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Turns many quick saves into one write. `schedule` remembers only the latest value and writes
 * it after `delayMs` of quiet; `writeNow` writes straight away; `flush` writes whatever is
 * waiting. Writes never overlap, and they happen in order.
 */
export class DebouncedWriter<T> {
  private pending: { value: T } | undefined;
  private timer: unknown;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly write: (value: T) => Promise<void>,
    private readonly delayMs: number,
    private readonly timers: Timers = realTimers,
  ) {}

  get hasPending(): boolean {
    return this.pending !== undefined;
  }

  /** Write `value` after a quiet moment, replacing any value still waiting. */
  schedule(value: T): void {
    this.pending = { value };
    this.clearTimer();
    this.timer = this.timers.set(() => {
      this.timer = undefined;
      // A failed background write is reported through the write function itself.
      void this.flush().catch(() => {});
    }, this.delayMs);
  }

  /** Write `value` now, and drop anything that was waiting (it is older). */
  writeNow(value: T): Promise<void> {
    this.pending = undefined;
    this.clearTimer();
    return this.enqueue(value);
  }

  /** Write the waiting value now, if there is one, and wait for all writes to finish. */
  flush(): Promise<void> {
    const waiting = this.pending;
    this.pending = undefined;
    this.clearTimer();
    if (!waiting) return this.chain.then(() => undefined);
    return this.enqueue(waiting.value);
  }

  /** Forget a waiting value without writing it. */
  cancel(): void {
    this.pending = undefined;
    this.clearTimer();
  }

  private enqueue(value: T): Promise<void> {
    const run = this.chain.then(() => this.write(value));
    this.chain = run.catch(() => {});
    return run;
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      this.timers.clear(this.timer);
      this.timer = undefined;
    }
  }
}
