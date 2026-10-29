import type { UciTransportFactory } from "./transport";

/**
 * Runs a stockfish.js build as a classic Web Worker. The worker takes UCI commands
 * as strings through postMessage and answers the same way, so the page never blocks.
 * Browser only: do not call this during server rendering.
 */
export function createWorkerTransport(scriptUrl: string): UciTransportFactory {
  return ({ onLine, onError }) => {
    const worker = new Worker(scriptUrl);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data === "string") onLine(event.data);
    };
    worker.onerror = (event) => {
      onError(new Error(event.message || "The engine worker failed"));
    };
    return {
      send: (command) => worker.postMessage(command),
      terminate: () => worker.terminate(),
    };
  };
}
