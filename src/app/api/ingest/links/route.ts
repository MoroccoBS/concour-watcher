import { upsertDiscoveredPdfs } from "@/server/documents";
import { discoverSourceLinks } from "@/server/scraper";

export const runtime = "nodejs";

function assertIngestToken(request: Request) {
  const configured = process.env.INGEST_TOKEN;
  if (!configured) return;

  const provided = request.headers.get("x-ingest-token");
  if (provided !== configured) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    assertIngestToken(request);
    const body = await request.json().catch(() => ({}));
    const links =
      Array.isArray(body.links) && body.links.length > 0
        ? body.links
        : await discoverSourceLinks();

    const result = await upsertDiscoveredPdfs(links);
    return Response.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 },
    );
  }
}
