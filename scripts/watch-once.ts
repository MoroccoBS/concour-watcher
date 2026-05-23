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

async function main() {
  const runnerId = getLocalRunnerId();
  await markWatcherStarted(runnerId);

  try {
    const links = await discoverSourceLinks();
    const discovery = await upsertDiscoveredPdfs(links);
    const processing = await processPendingDocuments(
      Number(process.env.LOCAL_PROCESS_LIMIT ?? 1),
    );

    await markWatcherOk({
      runnerId,
      found: links.length,
      inserted: discovery.inserted,
      processed: processing.processed,
    });

    console.log(
      JSON.stringify(
        {
          runnerId,
          found: links.length,
          inserted: discovery.inserted,
          processing,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await markWatcherError({ runnerId, error });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
