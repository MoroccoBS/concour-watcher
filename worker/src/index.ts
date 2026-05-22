/// <reference types="@cloudflare/workers-types" />

export interface Env {
  INGEST_ENDPOINT: string;
  INGEST_TOKEN: string;
}

async function run(env: Env) {
  if (!env.INGEST_ENDPOINT) {
    throw new Error("Missing INGEST_ENDPOINT Worker secret/variable.");
  }

  if (!env.INGEST_TOKEN) {
    throw new Error("Missing INGEST_TOKEN Worker secret.");
  }

  const response = await fetch(env.INGEST_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ingest-token": env.INGEST_TOKEN,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

const worker = {
  async scheduled(
    _controller: unknown,
    env: Env,
    ctx: unknown,
  ) {
    void ctx;
    await run(env);
  },
  async fetch(_request: Request, env: Env) {
    if (_request.method === "GET") {
      return Response.json({
        ok: true,
        role: "health-and-optional-trigger",
        hasIngestEndpoint: Boolean(env.INGEST_ENDPOINT),
        hasIngestToken: Boolean(env.INGEST_TOKEN),
      });
    }

    try {
      const result = await run(env);
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Worker failed" },
        { status: 500 },
      );
    }
  },
};

export default worker;
