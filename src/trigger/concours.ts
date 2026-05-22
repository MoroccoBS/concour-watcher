import { schedules } from "@trigger.dev/sdk";

import { upsertDiscoveredPdfs } from "@/server/documents";
import { processPendingDocuments } from "@/server/process-pending";
import { discoverSourceLinks } from "@/server/scraper";

export const concoursWatcherEveryTenMinutes = schedules.task({
	id: "concours-watcher-every-10-minutes",
	cron: {
		pattern: "*/10 * * * *",
		timezone: "Africa/Casablanca",
		environments: ["PRODUCTION"],
	},
	ttl: "9m",
	run: async (payload) => {
		console.log("Trigger.dev concours watcher", {
			timestamp: payload.timestamp,
			lastTimestamp: payload.lastTimestamp,
			timezone: payload.timezone,
		});

		const links = await discoverSourceLinks();
		const discovery = await upsertDiscoveredPdfs(links);
		const processing = await processPendingDocuments(
			Number(process.env.TRIGGER_PROCESS_LIMIT ?? 1),
		);

		return {
			found: links.length,
			inserted: discovery.inserted,
			processing,
		};
	},
});
