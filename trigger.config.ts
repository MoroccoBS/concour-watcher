import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 1800,
});
