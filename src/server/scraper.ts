import * as cheerio from "cheerio";

import { absoluteMinistryUrl } from "@/lib/utils";
import { importantLinkKeywords, ministrySources } from "./sources";

export type DiscoveredPdf = {
  sourcePageUrl: string;
  pdfUrl: string;
  title: string;
  region?: string;
  isImportant: boolean;
};

async function fetchSource(fetcher: typeof fetch, sourcePageUrl: string) {
  const headers = {
    "user-agent": "cncr-watcher/1.0 (+personal concours notification utility)",
  };

  try {
    return await fetcher(sourcePageUrl, { headers });
  } catch (error) {
    if (typeof process !== "undefined" && sourcePageUrl.startsWith("https://drh.sante.gov.ma")) {
      const { Agent } = await import("undici");
      return fetcher(sourcePageUrl, {
        headers,
        dispatcher: new Agent({
          connect: { rejectUnauthorized: false },
        }),
      } as RequestInit);
    }

    throw error;
  }
}

function cleanText(value: string) {
  return value.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function classifyImportance(haystack: string) {
  const lower = haystack.toLowerCase();
  return importantLinkKeywords.some((keyword) =>
    lower.includes(keyword.toLowerCase()),
  );
}

export function parsePdfLinks(html: string, sourcePageUrl: string) {
  const $ = cheerio.load(html);
  const links = new Map<string, DiscoveredPdf>();

  $("a[href]").each((_, node) => {
    const href = $(node).attr("href");
    if (!href || !href.toLowerCase().includes(".pdf")) return;

    const pdfUrl = absoluteMinistryUrl(href);
    const title = cleanText($(node).text()) || decodeURIComponent(pdfUrl)
      .split("/")
      .pop()
      ?.replace(/\.pdf$/i, "") || "Concours PDF";
    const rowText = cleanText($(node).closest("tr, li, div").text());
    const haystack = `${title} ${href} ${rowText}`;

    links.set(pdfUrl, {
      sourcePageUrl,
      pdfUrl,
      title,
      region: title.length > 2 ? title : undefined,
      isImportant: classifyImportance(haystack),
    });
  });

  return [...links.values()];
}

export async function discoverSourceLinks(
  fetcher: typeof fetch = fetch,
  sources = ministrySources,
) {
  const results: DiscoveredPdf[] = [];

  for (const sourcePageUrl of sources) {
    const response = await fetchSource(fetcher, sourcePageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourcePageUrl}: ${response.status}`);
    }

    results.push(...parsePdfLinks(await response.text(), sourcePageUrl));
  }

  return results;
}
