import type { UciTransport, UciTransportFactory, UciTransportHandlers } from "./transport";

/** One fake worker. Created each time the engine (re)starts its transport. */
export class FakeUciInstance {
  readonly sent: string[] = [];
  terminated = false;

  constructor(
    private readonly handlers: UciTransportHandlers,
    private readonly host: FakeUciHost,
  ) {}

  /** Pretend the engine printed this line. Arrives asynchronously, like a real worker. */
  emit(line: string): void {
    queueMicrotask(() => {
      if (!this.terminated) this.handlers.onLine(line);
    });
  }

  crash(message = "worker crashed"): void {
    queueMicrotask(() => this.handlers.onError(new Error(message)));
  }

  /** Commands that start a search. */
  get goCommands(): string[] {
    return this.sent.filter((c) => c.startsWith("go "));
  }

  receive(command: string): void {
    this.sent.push(command);
    if (command === "uci" && this.host.autoHandshake) this.emit("uciok");
    else if (command === "isready" && this.host.autoHandshake) this.emit("readyok");
    else if (command.startsWith("go ")) this.host.onGo(this, command);
  }
}

/**
 * A scriptable stand-in for the Stockfish worker, for unit tests. By default it
 * completes the UCI handshake and answers every search with `bestmove e2e4`;
 * set `onGo` to script something else.
 */
export class FakeUciHost {
  readonly instances: FakeUciInstance[] = [];
  autoHandshake = true;
  onGo: (instance: FakeUciInstance, command: string) => void = (instance) =>
    instance.emit("bestmove e2e4");

  get latest(): FakeUciInstance {
    return this.instances[this.instances.length - 1];
  }

  readonly createTransport: UciTransportFactory = (handlers) => {
    const instance = new FakeUciInstance(handlers, this);
    this.instances.push(instance);
    const transport: UciTransport = {
      send: (command) => instance.receive(command),
      terminate: () => {
        instance.terminated = true;
      },
    };
    return transport;
  };
}

/** Lets pending microtasks and zero-delay timers run. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
