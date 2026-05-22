import { processPendingDocuments } from "@/server/process-pending";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configured = process.env.JOB_TOKEN;
  if (configured && request.headers.get("x-job-token") !== configured) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await processPendingDocuments();
  return Response.json(result);
}
