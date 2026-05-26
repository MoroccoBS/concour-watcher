import "dotenv/config";

import { processPendingDocuments } from "@/server/process-pending";

const limit = Number(
  process.env.PROCESS_LIMIT ?? process.env.TRIGGER_PROCESS_LIMIT ?? 5,
);

processPendingDocuments(limit)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
