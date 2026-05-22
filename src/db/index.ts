import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

function normalizePostgresJsUrl(value: string) {
  const url = new URL(value);
  url.searchParams.delete("channel_binding");
  return url.toString();
}

declare global {
  var cncrSql: postgres.Sql | undefined;
}

export function hasDatabase() {
  return Boolean(connectionString);
}

const client =
  globalThis.cncrSql ??
  (connectionString
    ? postgres(normalizePostgresJsUrl(connectionString), {
        max: 5,
        prepare: false,
        connect_timeout: 10,
        idle_timeout: 5,
      })
    : undefined);

if (process.env.NODE_ENV !== "production" && client) {
  globalThis.cncrSql = client;
}

export const db = client ? drizzle(client, { schema }) : undefined;
export { schema };
