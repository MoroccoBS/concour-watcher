import "dotenv/config";

import { processPendingDocuments } from "@/server/process-pending";

const limit = Number(
  process.env.PROCESS_LIMIT ?? process.env.TRIGGER_PROCESS_LIMIT ?? 5,
);

const validLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;

processPendingDocuments(validLimit)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
