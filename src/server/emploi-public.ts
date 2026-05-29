import * as cheerio from "cheerio";
import { and, eq, like } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments, documentEvents } from "@/db/schema";
import { fetchMinistryResource } from "./ministry-fetch";
import type { DiscoveredPdf } from "./scraper";
import { emploiPublicSources } from "./sources";
import { watcherLog } from "./watcher-log";

const targetGrade = "ممرض من الدرجة الأولى - سُلمْ 10";
const baseUrl = "https://www.emploi-public.ma";

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

function normalizeArabic(value: string) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[إأآ]/g, "ا")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/\u0640/g, "")
    .toLowerCase();
}

function hasTargetGrade(value: string) {
  const normalized = normalizeArabic(value);
  return (
    normalized.includes("ممرض من الدرجة الاولى") &&
    normalized.includes("سلم 10")
  );
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
  const decodedHref = safeDecode(href);
  const haystack = `${text} ${decodedHref}`.toLowerCase();
  if (haystack.includes("list_attente") || text.includes("لائحة الانتظار")) {
    return "Liste d'attente";
  }
  if (
    haystack.includes("result") ||
    haystack.includes("résultat") ||
    text.includes("نتيجة")
  ) {
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
  return hasTargetGrade(text);
}

function isChuOrganizer(value: string | null | undefined) {
  const normalized = normalizeArabic(value ?? "");
  return (
    normalized.includes("chu") ||
    normalized.includes("centre hospitalier universitaire") ||
    (normalized.includes("المركز الاستشفا") &&
      normalized.includes("الجامعي"))
  );
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
  const isChu = isChuOrganizer(organizer);
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

  if (!isChu) {
    watcherLog("emploi-public.detail.primary-source-skipped", {
      detailUrl,
      title,
      organizer,
      reason: "sante.gov.ma is the primary source for non-CHU concours",
    });
    return [];
  }

  const links: DiscoveredPdf[] = [];
  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href) return;
    const decodedHref = safeDecode(href);
    if (
      !decodedHref.includes("/تحميل/المباريات/") &&
      !href.includes("/%D8%AA%D8%AD%D9%85%D9%8A%D9%84/")
    ) {
      return;
    }

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
    isChu,
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
    if (!href) return;
    const decodedHref = safeDecode(href);
    if (
      !decodedHref.includes("/تفاصيل/المباريات/") &&
      !href.includes("/%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84/")
    ) {
      return;
    }

    const cardText = cleanText(
      $(anchor).closest("article,li,tr,.item,.card,.box,div").text(),
    );
    const anchorText = cleanText($(anchor).text());
    if (hasTargetGrade(`${cardText} ${anchorText}`)) {
      detailUrls.add(absoluteEmploiUrl(href));
    }
  });

  watcherLog("emploi-public.listing.parsed", {
    detailUrls: detailUrls.size,
  });

  return [...detailUrls];
}

async function listSavedEmploiPublicDetailUrls() {
  if (!db) return [];

  const rows = await db
    .selectDistinct({ sourcePageUrl: concoursDocuments.sourcePageUrl })
    .from(concoursDocuments)
    .where(
      and(
        like(concoursDocuments.sourcePageUrl, `${baseUrl}/ar/%`),
        like(concoursDocuments.listingKey, "emploi-public:%"),
      ),
    );

  return rows.map((row) => row.sourcePageUrl);
}

async function retireNonChuEmploiPublicMirrors() {
  if (!db) return 0;

  const mirrors = await db.query.concoursDocuments.findMany({
    where: and(
      like(concoursDocuments.sourcePageUrl, `${baseUrl}/ar/%`),
      like(concoursDocuments.listingKey, "emploi-public:%"),
    ),
  });
  const nonChu = mirrors.filter(
    (item) => !isChuOrganizer(`${item.region ?? ""} ${item.center ?? ""}`),
  );

  for (const item of nonChu) {
    await db
      .update(concoursDocuments)
      .set({
        isImportant: false,
        applicationStatus: "closed",
        processingStatus: "processed",
        validationIssues: [
          "Retired duplicate: sante.gov.ma is primary for non-CHU concours.",
        ],
        updatedAt: new Date(),
      })
      .where(eq(concoursDocuments.id, item.id));
    await db.insert(documentEvents).values({
      documentId: item.id,
      type: "source_mirror_retired",
      message: "emploi-public mirror retired",
      metadata: {
        reason: "sante.gov.ma is primary for non-CHU concours",
      },
    });
  }

  if (nonChu.length) {
    watcherLog("emploi-public.mirrors.retired", {
      retired: nonChu.length,
      ids: nonChu.map((item) => item.id),
    });
  }

  return nonChu.length;
}

export async function discoverEmploiPublicLinks() {
  await retireNonChuEmploiPublicMirrors();
  const savedDetails = await listSavedEmploiPublicDetailUrls();
  const detailUrls = new Set(savedDetails);

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
    savedDetails: savedDetails.length,
    details: detailUrls.size,
    found: results.length,
  });

  return results;
}
