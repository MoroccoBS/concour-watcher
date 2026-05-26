import "dotenv/config";

import { upsertDiscoveredPdfs } from "@/server/documents";
import { processPendingDocuments } from "@/server/process-pending";
import {
  getLocalRunnerId,
  markWatcherError,
  markWatcherOk,
  markWatcherStarted,
} from "@/server/runner-heartbeat";
import { discoverSourceLinks } from "@/server/scraper";
import { watcherLog } from "@/server/watcher-log";
import { finishWatcherRun, startWatcherRun } from "@/server/watcher-runs";

function getProcessLimit() {
  const value = Number(
    process.env.LOCAL_PROCESS_LIMIT ??
      process.env.TRIGGER_PROCESS_LIMIT ??
      process.env.PROCESS_LIMIT ??
      2,
  );
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 2;
}

async function main() {
  const runnerId = getLocalRunnerId();
  const processLimit = getProcessLimit();
  watcherLog("watcher.run.start", { runnerId, processLimit });
  const run = await startWatcherRun({
    runnerId,
    metadata: { processLimit },
  });
  await markWatcherStarted(runnerId);

  try {
    const links = await discoverSourceLinks();
    const discovery = await upsertDiscoveredPdfs(links);
    const processing = await processPendingDocuments(processLimit, {
      priorityIds: discovery.insertedIds,
    });

    await markWatcherOk({
      runnerId,
      found: links.length,
      inserted: discovery.inserted,
      processed: processing.processed,
    });
    if (run) {
      await finishWatcherRun({
        id: run.id,
        status: "completed",
        found: links.length,
        inserted: discovery.inserted,
        processed: processing.processed,
        metadata: {
          processLimit,
          insertedIds: discovery.insertedIds,
          processing,
        },
      });
    }

    watcherLog("watcher.run.ok", {
      runnerId,
      found: links.length,
      inserted: discovery.inserted,
      insertedIds: discovery.insertedIds,
      processing,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    watcherLog("watcher.run.error", {
      runnerId,
      message,
    });
    if (run) {
      await finishWatcherRun({
        id: run.id,
        status: "failed",
        error: message,
        metadata: { processLimit },
      });
    }
    await markWatcherError({ runnerId, error });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
