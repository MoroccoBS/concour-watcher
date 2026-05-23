import { schedules } from "@trigger.dev/sdk";

import { notifyIfWatcherStale } from "@/server/runner-heartbeat";

export const concoursWatcherStaleMonitor = schedules.task({
  id: "concours-watcher-stale-monitor",
  cron: {
    pattern: "*/30 * * * *",
    timezone: "Africa/Casablanca",
    environments: ["PRODUCTION"],
  },
  ttl: "9m",
  run: async (payload) => {
    console.log("Trigger.dev stale monitor", {
      timestamp: payload.timestamp,
      lastTimestamp: payload.lastTimestamp,
      timezone: payload.timezone,
    });

    return notifyIfWatcherStale();
  },
});
