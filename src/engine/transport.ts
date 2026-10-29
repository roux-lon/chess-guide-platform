/** What the engine sends back. Called once per line of UCI output. */
export interface UciTransportHandlers {
  onLine(line: string): void;
  /** The worker died or failed to load. */
  onError(error: Error): void;
}

/** A two-way pipe to a UCI engine. The real one is a Web Worker; tests use a fake. */
export interface UciTransport {
  send(command: string): void;
  terminate(): void;
}

export type UciTransportFactory = (handlers: UciTransportHandlers) => UciTransport;
