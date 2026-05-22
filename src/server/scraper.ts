import * as cheerio from "cheerio";

import { absoluteMinistryUrl } from "@/lib/utils";
import {
  importantLinkKeywords,
  ministrySources,
  targetFrameKeywords,
} from "./sources";
import { fetchMinistryResource } from "./ministry-fetch";

export type DiscoveredPdf = {
  sourcePageUrl: string;
  pdfUrl: string;
  title: string;
  region?: string;
  isImportant: boolean;
};

function cleanText(value: string) {
  return value.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function classifyImportance(haystack: string) {
  const lower = haystack.toLowerCase();
  return importantLinkKeywords.some((keyword) =>
    lower.includes(keyword.toLowerCase()),
  );
}

function parseConcoursDate(value: string) {
  const decoded = safeDecode(value);
  const spaced = decoded.match(/\b(\d{1,2})[ -](\d{1,2})[ -](20\d{2})\b/);
  if (spaced) {
    return new Date(
      Number(spaced[3]),
      Number(spaced[2]) - 1,
      Number(spaced[1]),
    );
  }

  const compact = decoded.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
  if (compact) {
    return new Date(
      Number(compact[1]),
      Number(compact[2]) - 1,
      Number(compact[3]),
    );
  }

  return null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isTargetParamedicalConcours(haystack: string) {
  const normalized = safeDecode(haystack)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  const isParamedical =
    normalized.includes("paramedical") ||
    normalized.includes("paramédical") ||
    normalized.includes("/paramedical/") ||
    normalized.includes("/paramedical");
  const isTargetFrame = targetFrameKeywords.some((keyword) =>
    normalized.includes(
      keyword.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""),
    ),
  );
  const isNotice =
    normalized.includes("avis") ||
    normalized.includes("اعلان") ||
    normalized.includes("إعلان");
  const isFollowUpDocument = [
    "list",
    "conv",
    "rslts",
    "result",
    "affectation",
    "prise de service",
    "planning",
    "reclamation",
    "réclamation",
  ].some((keyword) => normalized.includes(keyword));
  const concoursDate = parseConcoursDate(normalized);

  return (
    isParamedical &&
    isTargetFrame &&
    isNotice &&
    !isFollowUpDocument &&
    concoursDate !== null &&
    concoursDate >= startOfToday()
  );
}

export function parsePdfLinks(html: string, sourcePageUrl: string) {
  const $ = cheerio.load(html);
  const links = new Map<string, DiscoveredPdf>();

  $("a[href]").each((_, node) => {
    const href = $(node).attr("href");
    if (!href || !href.toLowerCase().includes(".pdf")) return;

    const pdfUrl = absoluteMinistryUrl(href);
    const title = cleanText($(node).text()) || safeDecode(pdfUrl)
      .split("/")
      .pop()
      ?.replace(/\.pdf$/i, "") || "Concours PDF";
    const rowText = cleanText($(node).closest("tr, li, div").text());
    const haystack = `${title} ${href} ${rowText}`;
    if (!isTargetParamedicalConcours(`${pdfUrl} ${haystack}`)) return;

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
    const response =
      fetcher === fetch
        ? await fetchMinistryResource(sourcePageUrl)
        : await fetcher(sourcePageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourcePageUrl}: ${response.status}`);
    }

    results.push(...parsePdfLinks(await response.text(), sourcePageUrl));
  }

  return results;
}
