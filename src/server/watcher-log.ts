type LogMetadata = Record<string, unknown>;

export function watcherLog(event: string, metadata: LogMetadata = {}) {
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
