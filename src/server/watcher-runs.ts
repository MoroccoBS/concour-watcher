import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { watcherRuns } from "@/db/schema";

type FinishInput = {
  id: string;
  status: "completed" | "failed";
  durationMs?: number;
  found?: number;
  inserted?: number;
  processed?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

export async function startWatcherRun(input: {
  runnerId: string;
  metadata?: Record<string, unknown>;
}) {
  if (!db) return null;

  const [run] = await db
    .insert(watcherRuns)
    .values({
      runnerId: input.runnerId,
      status: "running",
      metadata: input.metadata,
    })
    .returning();

  return run;
}

export async function finishWatcherRun(input: FinishInput) {
  if (!db) return null;

  const finishedAt = new Date();
  const existing = await db.query.watcherRuns.findFirst({
    where: eq(watcherRuns.id, input.id),
  });

  if (!existing) {
    return null;
  }
  const durationMs =
    typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
      ? Math.max(0, Math.round(input.durationMs))
      : Math.max(0, finishedAt.getTime() - existing.startedAt.getTime());

  const [run] = await db
    .update(watcherRuns)
    .set({
      status: input.status,
      finishedAt,
      durationMs,
      found: input.found,
      inserted: input.inserted,
      processed: input.processed,
      error: input.error,
      metadata: input.metadata,
    })
    .where(eq(watcherRuns.id, input.id))
    .returning();

  return run ?? null;
}

export async function listWatcherRuns(limit = 12) {
  if (!db) return [];

  return db.query.watcherRuns.findMany({
    orderBy: [desc(watcherRuns.startedAt)],
    limit,
  });
}
