import * as cheerio from "cheerio";

import { fetchMinistryResource } from "./ministry-fetch";
import type { DiscoveredPdf } from "./scraper";
import { emploiPublicSeedDetails, emploiPublicSources } from "./sources";
import { watcherLog } from "./watcher-log";

const targetGrade = "ممرض من الدرجة الأولى - سُلمْ 10";
const baseUrl = "https://www.emploi-public.ma";

function cleanText(value: string) {
  return value
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteEmploiUrl(value: string) {
  return new URL(value, baseUrl).toString();
}

function extractConcoursId(url: string) {
  return new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseArabicFrenchDate(value: string) {
  const normalized = cleanText(value);
  const match = normalized.match(
    /(\d{1,2})\s+([^\s]+)\s+(20\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/,
  );
  if (!match) return null;

  const months: Record<string, number> = {
    يناير: 0,
    فبراير: 1,
    مارس: 2,
    أبريل: 3,
    ابريل: 3,
    ماي: 4,
    يونيو: 5,
    يوليوز: 6,
    غشت: 7,
    شتنبر: 8,
    أكتوبر: 9,
    اكتوبر: 9,
    نونبر: 10,
    دجنبر: 11,
    janvier: 0,
    fevrier: 1,
    février: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    aout: 7,
    août: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    decembre: 11,
    décembre: 11,
  };

  const month = months[match[2].toLowerCase()];
  if (month === undefined) return null;

  return new Date(
    Number(match[3]),
    month,
    Number(match[1]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
  );
}

function readHeadValue($: cheerio.CheerioAPI, label: string) {
  const heading = $("h1,h2,h3,h4")
    .toArray()
    .find((element) => cleanText($(element).text()).startsWith(label));
  if (!heading) return null;

  return cleanText($(heading).text()).replace(label, "").trim();
}

function classifyDownloadLabel(text: string, href: string) {
  const haystack = `${text} ${href}`.toLowerCase();
  if (haystack.includes("list_attente") || text.includes("لائحة الانتظار")) {
    return "Liste d'attente";
  }
  if (haystack.includes("result") || text.includes("نتيجة")) {
    return "Résultats";
  }
  if (haystack.includes("list_convoques") || text.includes("المدعوين")) {
    return "Liste des convoqués";
  }
  if (haystack.includes("arrete") || text.includes("قرار")) {
    return "Avis";
  }
  return text || "Document emploi-public";
}

function isInterestingDetailPage($: cheerio.CheerioAPI) {
  const text = cleanText($("body").text());
  return text.includes(targetGrade);
}

function readBodyField(bodyText: string, label: string) {
  const match = bodyText.match(
    new RegExp(`${label}\\s*:\\s*([^:]+?)(?=\\s+[\\p{L} ]+\\s*:|$)`, "u"),
  );
  return match?.[1]?.trim() ?? null;
}

export function parseEmploiPublicDetail(html: string, detailUrl: string) {
  const $ = cheerio.load(html);
  if (!isInterestingDetailPage($)) {
    return [];
  }

  const bodyText = cleanText($("body").text());
  const concoursId = extractConcoursId(detailUrl);
  const title =
    cleanText($("h1").first().text()).replace(/^مباريات التوظيف\s*:\s*/, "") ||
    targetGrade;
  const organizer =
    readHeadValue($, "الإدارة المنظمة") ??
    readBodyField(bodyText, "الإدارة المنظمة");
  const deadline = parseArabicFrenchDate(
    readHeadValue($, "آخر أجل لإيداع الترشيحات") ?? "",
  );
  const examDate = parseArabicFrenchDate(
    readHeadValue($, "تاريخ إجراء المباراة") ?? "",
  );
  const totalSeats = readBodyField(bodyText, "عدد المناصب");
  const specialty = readBodyField(bodyText, "تخصص");

  if (examDate && examDate < startOfToday()) {
    watcherLog("emploi-public.detail.ignored-past", {
      detailUrl,
      examDate,
      title,
    });
    return [];
  }

  const links: DiscoveredPdf[] = [];
  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href?.includes("/تحميل/المباريات/")) return;

    const text = cleanText($(anchor).text());
    const downloadUrl = absoluteEmploiUrl(href);
    const updateLabel = classifyDownloadLabel(text, href);
    const titleParts = [
      organizer ?? "emploi-public",
      title,
      totalSeats ? `${totalSeats} postes` : null,
      specialty ? specialty.replace(/^-/, "").trim() : null,
    ].filter(Boolean);

    links.push({
      sourcePageUrl: detailUrl,
      pdfUrl: downloadUrl,
      listingKey: `emploi-public:${concoursId}`,
      hasAttachment: true,
      updateLabel,
      title: text || updateLabel,
      region: titleParts.join(" · "),
      isImportant: true,
    });
  });

  if (links.length === 0) {
    links.push({
      sourcePageUrl: detailUrl,
      pdfUrl: `${detailUrl}#no-attachment-emploi-public-${concoursId}`,
      listingKey: `emploi-public:${concoursId}`,
      hasAttachment: false,
      updateLabel: "No attachment yet",
      title,
      region: [organizer, title].filter(Boolean).join(" · ") || title,
      isImportant: true,
    });
  }

  watcherLog("emploi-public.detail.parsed", {
    detailUrl,
    title,
    organizer,
    deadline,
    examDate,
    links: links.length,
    labels: links.map((link) => link.updateLabel),
  });

  return links;
}

export function parseEmploiPublicListing(html: string) {
  const $ = cheerio.load(html);
  const detailUrls = new Set<string>();

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href?.includes("/تفاصيل/المباريات/")) return;

    const cardText = cleanText(
      $(anchor).closest("article,li,tr,.item,.card,.box,div").text(),
    );
    const anchorText = cleanText($(anchor).text());
    if (`${cardText} ${anchorText}`.includes(targetGrade)) {
      detailUrls.add(absoluteEmploiUrl(href));
    }
  });

  watcherLog("emploi-public.listing.parsed", {
    detailUrls: detailUrls.size,
  });

  return [...detailUrls];
}

export async function discoverEmploiPublicLinks() {
  const detailUrls = new Set(emploiPublicSeedDetails);

  for (const sourceUrl of emploiPublicSources) {
    watcherLog("emploi-public.source.fetch.start", { sourceUrl });
    const response = await fetchMinistryResource(sourceUrl);
    watcherLog("emploi-public.source.fetch.done", {
      sourceUrl,
      status: response.status,
      ok: response.ok,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
    }

    for (const detailUrl of parseEmploiPublicListing(await response.text())) {
      detailUrls.add(detailUrl);
    }
  }

  const results: DiscoveredPdf[] = [];
  for (const detailUrl of detailUrls) {
    watcherLog("emploi-public.detail.fetch.start", { detailUrl });
    const response = await fetchMinistryResource(detailUrl);
    watcherLog("emploi-public.detail.fetch.done", {
      detailUrl,
      status: response.status,
      ok: response.ok,
    });
    if (!response.ok) continue;
    results.push(...parseEmploiPublicDetail(await response.text(), detailUrl));
  }

  watcherLog("emploi-public.discover.done", {
    details: detailUrls.size,
    found: results.length,
  });

  return results;
}
