import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { runnerHeartbeats } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";
import { sendTelegramMessage } from "./telegram";

const defaultRunnerId = "windows-home";
const defaultStaleMinutes = 45;

export type WatcherHealth = {
  runnerId: string;
  status: "missing" | "healthy" | "stale" | "failing";
  staleMinutes: number;
  heartbeat: typeof runnerHeartbeats.$inferSelect | null;
};

export function getLocalRunnerId() {
  return process.env.LOCAL_WATCHER_ID?.trim() || defaultRunnerId;
}

export function getWatcherStaleMinutes() {
  const value = Number(
    process.env.WATCHER_STALE_MINUTES ?? defaultStaleMinutes,
  );
  return Number.isFinite(value) && value > 0 ? value : defaultStaleMinutes;
}

export async function markWatcherStarted(runnerId = getLocalRunnerId()) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const now = new Date();
  await db
    .insert(runnerHeartbeats)
    .values({
      runnerId,
      lastStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: runnerHeartbeats.runnerId,
      set: {
        lastStartedAt: now,
        updatedAt: now,
      },
    });
}

export async function markWatcherOk(input: {
  runnerId?: string;
  found: number;
  inserted: number;
  processed: number;
}) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const now = new Date();
  await db
    .insert(runnerHeartbeats)
    .values({
      runnerId: input.runnerId ?? getLocalRunnerId(),
      lastOkAt: now,
      lastError: null,
      lastFound: input.found,
      lastInserted: input.inserted,
      lastProcessed: input.processed,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: runnerHeartbeats.runnerId,
      set: {
        lastOkAt: now,
        lastError: null,
        lastFound: input.found,
        lastInserted: input.inserted,
        lastProcessed: input.processed,
        updatedAt: now,
      },
    });
}

export async function markWatcherError(input: {
  runnerId?: string;
  error: unknown;
}) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const message =
    input.error instanceof Error
      ? input.error.message
      : String(input.error ?? "Unknown watcher error");
  const now = new Date();

  await db
    .insert(runnerHeartbeats)
    .values({
      runnerId: input.runnerId ?? getLocalRunnerId(),
      lastErrorAt: now,
      lastError: message,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: runnerHeartbeats.runnerId,
      set: {
        lastErrorAt: now,
        lastError: message,
        updatedAt: now,
      },
    });

  await sendTelegramMessage(
    [
      "⚠️ <b>Local concours watcher failed</b>",
      `🖥️ Runner: ${input.runnerId ?? getLocalRunnerId()}`,
      `🕒 ${formatDateTime(now)}`,
      `🧾 ${message}`,
    ].join("\n"),
  );
}

export async function getWatcherHealth(
  runnerId = getLocalRunnerId(),
): Promise<WatcherHealth> {
  if (!db) {
    return {
      runnerId,
      status: "missing",
      staleMinutes: getWatcherStaleMinutes(),
      heartbeat: null,
    };
  }

  const heartbeat = await db.query.runnerHeartbeats.findFirst({
    where: eq(runnerHeartbeats.runnerId, runnerId),
  });
  const staleMinutes = getWatcherStaleMinutes();

  if (!heartbeat?.lastOkAt) {
    return { runnerId, status: "missing", staleMinutes, heartbeat: null };
  }

  const cutoff = Date.now() - staleMinutes * 60 * 1000;
  const isStale = heartbeat.lastOkAt.getTime() < cutoff;
  const isFailing = heartbeat.lastErrorAt
    ? heartbeat.lastErrorAt.getTime() > heartbeat.lastOkAt.getTime()
    : false;

  return {
    runnerId,
    status: isFailing ? "failing" : isStale ? "stale" : "healthy",
    staleMinutes,
    heartbeat,
  };
}

export async function notifyIfWatcherStale(runnerId = getLocalRunnerId()) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const health = await getWatcherHealth(runnerId);
  if (!health.heartbeat || health.status === "healthy") {
    return { alerted: false, status: health.status };
  }

  const now = new Date();
  const lastAlert = health.heartbeat.lastStaleAlertAt;
  if (lastAlert && now.getTime() - lastAlert.getTime() < 60 * 60 * 1000) {
    return { alerted: false, status: health.status };
  }

  await sendTelegramMessage(
    [
      "🚨 <b>Local concours watcher is not fresh</b>",
      `🖥️ Runner: ${runnerId}`,
      `📡 Status: ${health.status}`,
      `✅ Last OK: ${formatDateTime(health.heartbeat.lastOkAt)}`,
      health.heartbeat.lastError
        ? `🧾 Last error: ${health.heartbeat.lastError}`
        : null,
      `⏱️ Threshold: ${health.staleMinutes} minutes`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  await db
    .update(runnerHeartbeats)
    .set({
      lastStaleAlertAt: now,
      updatedAt: sql`now()`,
    })
    .where(eq(runnerHeartbeats.runnerId, runnerId));

  return { alerted: true, status: health.status };
}
