type LogMetadata = Record<string, unknown>;
type Sink = (event: string, metadata: LogMetadata) => void | Promise<void>;

const sinks = new Set<Sink>();

export function addWatcherLogSink(sink: Sink) {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

function emitToSinks(event: string, metadata: LogMetadata) {
  for (const sink of sinks) {
    try {
      void sink(event, metadata);
    } catch {
      // Logging sinks must never break the watcher run.
    }
  }
}

export function watcherLog(event: string, metadata: LogMetadata = {}) {
  emitToSinks(event, metadata);
  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        event,
        ...metadata,
      },
      null,
      2,
    ),
  );
}

export function watcherWarn(event: string, metadata: LogMetadata = {}) {
  emitToSinks(event, { level: "warn", ...metadata });
  console.warn(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        level: "warn",
        event,
        ...metadata,
      },
      null,
      2,
    ),
  );
}
