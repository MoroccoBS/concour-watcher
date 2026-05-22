import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

declare global {
  var cncrSql: postgres.Sql | undefined;
}

export function hasDatabase() {
  return Boolean(connectionString);
}

const client =
  globalThis.cncrSql ??
  (connectionString
    ? postgres(connectionString, {
        max: 5,
        prepare: false,
      })
    : undefined);

if (process.env.NODE_ENV !== "production" && client) {
  globalThis.cncrSql = client;
}

export const db = client ? drizzle(client, { schema }) : undefined;
export { schema };
