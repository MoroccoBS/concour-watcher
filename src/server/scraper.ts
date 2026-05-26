import * as cheerio from "cheerio";

import { absoluteMinistryUrl } from "@/lib/utils";
import { fetchMinistryResource } from "./ministry-fetch";
import {
  importantLinkKeywords,
  ministrySources,
  targetFrameKeywords,
} from "./sources";
import { watcherLog } from "./watcher-log";

export type DiscoveredPdf = {
  sourcePageUrl: string;
  pdfUrl: string;
  listingKey: string;
  hasAttachment: boolean;
  updateLabel?: string;
  title: string;
  region?: string;
  isImportant: boolean;
};

function cleanText(value: string) {
  return value
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTargetConcoursDate(haystack: string) {
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
      keyword
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, ""),
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

  if (
    isParamedical &&
    isTargetFrame &&
    concoursDate !== null &&
    concoursDate >= startOfToday()
  ) {
    return { concoursDate, isNotice, isFollowUpDocument, normalized };
  }

  return null;
}

function classifyUpdateLabel(haystack: string, fallback: string) {
  const normalized = safeDecode(haystack).toLowerCase();
  const labels: Array<[string, string]> = [
    ["rslts def", "Résultats définitifs"],
    ["rslts", "Résultats"],
    ["result", "Résultats"],
    ["liste d'attente", "Avis d'affectation liste d'attente"],
    ["affcetation", "Avis d'affectation"],
    ["affectation", "Avis d'affectation"],
    ["liste définitive", "Liste définitive"],
    ["liste definitive", "Liste définitive"],
    ["listdef", "Liste définitive"],
    ["planning", "Planning"],
    ["programme", "Planning"],
    ["postes ouverts", "Postes ouverts"],
    ["prise de service", "Avis de prise de service"],
    ["conv", "Liste des convoqués"],
    ["avis", "Avis"],
  ];

  return (
    labels.find(([needle]) => normalized.includes(needle))?.[1] ?? fallback
  );
}

function buildListingKey(sourcePageUrl: string, date: Date, haystack: string) {
  const decoded = safeDecode(haystack).toLowerCase();
  const region =
    decoded.match(
      /(errachidia|draa|draâ|tafilalet|oriental|marrakech|laayoune|dakhla|rabat|fes|fès|casablanca|souss|tanger|beni mellal|béni mellal|central)/,
    )?.[1] ?? new URL(sourcePageUrl).pathname;

  return `${formatDateKey(date)}:${region
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export function parsePdfLinks(html: string, sourcePageUrl: string) {
  const $ = cheerio.load(html);
  const links = new Map<string, DiscoveredPdf>();
  const candidateRows = $("tr")
    .toArray()
    .filter((unit) => $(unit).find("tr").length === 0);

  for (const unit of candidateRows) {
    const unitText =
      $(unit)
        .find("td, th")
        .toArray()
        .map((cell) => cleanText($(cell).text()))
        .filter(Boolean)
        .join(" ") || cleanText($(unit).text());
    const anchors = $(unit).find("a[href]").toArray();
    const hrefs = anchors
      .map((anchor) => $(anchor).attr("href"))
      .filter((href): href is string => Boolean(href));
    const pdfHrefs = hrefs.filter((href) =>
      href.toLowerCase().includes(".pdf"),
    );
    const haystack = `${unitText} ${hrefs.join(" ")}`;
    const target = getTargetConcoursDate(haystack);
    if (!target) {
      continue;
    }

    const listingKey = buildListingKey(
      sourcePageUrl,
      target.concoursDate,
      haystack,
    );

    if (pdfHrefs.length === 0) {
      const key = `${sourcePageUrl}#no-attachment-${listingKey}`;
      links.set(key, {
        sourcePageUrl,
        pdfUrl: key,
        listingKey,
        hasAttachment: false,
        updateLabel: "No attachment yet",
        title: unitText || "New ITS concours without attachment",
        region: unitText || undefined,
        isImportant: true,
      });
      continue;
    }

    for (const href of pdfHrefs) {
      const pdfUrl = absoluteMinistryUrl(href);
      const pdfDate = parseConcoursDate(pdfUrl);
      if (pdfDate && !sameCalendarDay(pdfDate, target.concoursDate)) {
        continue;
      }

      const anchor = anchors.find(
        (candidate) => $(candidate).attr("href") === href,
      );
      const anchorText = anchor ? cleanText($(anchor).text()) : "";
      const fileTitle =
        safeDecode(pdfUrl)
          .split("/")
          .pop()
          ?.replace(/\.pdf$/i, "") || "Concours PDF";
      const title = anchorText || fileTitle;
      const linkHaystack = `${title} ${href} ${unitText}`;
      const updateLabel = classifyUpdateLabel(linkHaystack, title);

      links.set(pdfUrl, {
        sourcePageUrl,
        pdfUrl,
        listingKey,
        hasAttachment: true,
        updateLabel,
        title,
        region: unitText || title,
        isImportant:
          target.isNotice ||
          !target.isFollowUpDocument ||
          classifyImportance(linkHaystack),
      });
    }
  }

  const results = [...links.values()];
  watcherLog("scraper.parse.done", {
    sourcePageUrl,
    candidateRows: candidateRows.length,
    matchedDocuments: results.length,
    important: results.filter((item) => item.isImportant).length,
    noAttachment: results.filter((item) => !item.hasAttachment).length,
    labels: [...new Set(results.map((item) => item.updateLabel ?? "unknown"))],
  });

  return results;
}

export async function discoverSourceLinks(
  fetcher: typeof fetch = fetch,
  sources = ministrySources,
) {
  const results: DiscoveredPdf[] = [];

  for (const sourcePageUrl of sources) {
    watcherLog("scraper.source.fetch.start", { sourcePageUrl });
    const response =
      fetcher === fetch
        ? await fetchMinistryResource(sourcePageUrl)
        : await fetcher(sourcePageUrl);

    watcherLog("scraper.source.fetch.done", {
      sourcePageUrl,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourcePageUrl}: ${response.status}`);
    }

    const html = await response.text();
    watcherLog("scraper.source.html", {
      sourcePageUrl,
      bytes: html.length,
    });

    const parsed = parsePdfLinks(html, sourcePageUrl);
    watcherLog("scraper.source.documents", {
      sourcePageUrl,
      count: parsed.length,
      documents: parsed.map((item) => ({
        title: item.title,
        updateLabel: item.updateLabel,
        hasAttachment: item.hasAttachment,
        isImportant: item.isImportant,
        pdfUrl: item.pdfUrl,
      })),
    });

    results.push(...parsed);
  }

  watcherLog("scraper.discover.done", {
    sources: sources.length,
    found: results.length,
  });

  return results;
}
