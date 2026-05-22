export interface Env {
  INGEST_ENDPOINT: string;
  INGEST_TOKEN: string;
}

const sources = [
  "https://drh.sante.gov.ma/Pages/Concours_Ex_D.aspx",
  "https://drh.sante.gov.ma/Pages/Accueil.aspx",
  "https://drh.sante.gov.ma/Pages/Concours_Ex_C.aspx",
  "https://drh.sante.gov.ma/Pages/Concours_.aspx",
  "https://drh.sante.gov.ma/Pages/ConcoursRegion/La%C3%A2youne-Saguia-al-Hamra.aspx",
];

function absoluteMinistryUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/&amp;/g, "&");
  }

  return new URL(
    value.replace(/&amp;/g, "&"),
    "https://drh.sante.gov.ma",
  ).toString();
}

function cleanText(value: string) {
  return value.replace(/\u200b/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parsePdfLinks(html: string, sourcePageUrl: string) {
  const links = new Map<
    string,
    {
      sourcePageUrl: string;
      pdfUrl: string;
      title: string;
      region?: string;
      isImportant: boolean;
    }
  >();

  const anchorPattern = /<a\b[^>]*href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const pdfUrl = absoluteMinistryUrl(href);
    const fileName =
      decodeURIComponent(pdfUrl).split("/").pop()?.replace(/\.pdf$/i, "") ??
      "Concours PDF";
    const title = cleanText(match[2]) || fileName;
    const haystack = `${title} ${href}`.toLowerCase();
    links.set(pdfUrl, {
      sourcePageUrl,
      pdfUrl,
      title,
      region: title.length > 2 ? title : undefined,
      isImportant: ["param", "its", "avis", "cr-its", "technicien", "تقني"].some(
        (keyword) => haystack.includes(keyword),
      ),
    });
  }

  return [...links.values()];
}

async function discoverSourceLinks() {
  const links = [];
  for (const source of sources) {
    const response = await fetch(source, {
      headers: {
        "user-agent":
          "cncr-watcher/1.0 (+personal concours notification utility)",
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${source}`);
    links.push(...parsePdfLinks(await response.text(), source));
  }
  return links;
}

async function run(env: Env) {
  const links = await discoverSourceLinks();
  const response = await fetch(env.INGEST_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ingest-token": env.INGEST_TOKEN,
    },
    body: JSON.stringify({ links }),
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
    const result = await run(env);
    return Response.json(result);
  },
};

export default worker;
/// <reference types="@cloudflare/workers-types" />
