import "dotenv/config";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  parseEmploiPublicDetail,
  parseEmploiPublicListing,
} from "@/server/emploi-public";
import { checkCandidateWithGemini } from "@/server/gemini";
import { fetchMinistryResource } from "@/server/ministry-fetch";
import { getWatcherHealth } from "@/server/runner-heartbeat";
import { parsePdfLinks } from "@/server/scraper";

type CheckResult = {
  name: string;
  ok: boolean;
  details?: unknown;
};

const results: CheckResult[] = [];

function record(name: string, ok: boolean, details?: unknown) {
  results.push({ name, ok, details });
}

function assertCheck(name: string, condition: boolean, details?: unknown) {
  record(name, condition, details);
  if (!condition) {
    throw new Error(`${name} failed`);
  }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

function futureDateParts() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return {
    dd: String(date.getDate()).padStart(2, "0"),
    mm: String(date.getMonth() + 1).padStart(2, "0"),
    yyyy: String(date.getFullYear()),
  };
}

function syntheticMinistryHtml() {
  const { dd, mm, yyyy } = futureDateParts();
  const dateText = `${dd} ${mm} ${yyyy}`;
  const compactDate = `${dd}%20${mm}%20${yyyy}`;

  return `
    <table>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia ${dateText}</td>
        <td><a href="/Docs_Concours/Param%C3%A9dical/${yyyy}/errachidia/CR%20${compactDate}/Errachidia-avis%20CR-ITS-${compactDate}.pdf">Avis</a></td>
      </tr>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia ${dateText}</td>
        <td><a href="/Docs_Concours/Param%C3%A9dical/${yyyy}/errachidia/CR%20${compactDate}/Errachidia-planning%20CR-ITS-${compactDate}.pdf">Planning</a></td>
      </tr>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia ${dateText}</td>
        <td><a href="/Docs_Concours/Param%C3%A9dical/${yyyy}/errachidia/CR%20${compactDate}/Errachidia-listdef%20CR-ITS-${compactDate}.pdf">Liste définitive</a></td>
      </tr>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia ${dateText}</td>
        <td><a href="/Docs_Concours/Param%C3%A9dical/${yyyy}/central/CR-${compactDate}/rslts/rslts%20def-ITS-${compactDate}.pdf"><img src="/PublishingImages/pdf_jpeg.jpg" alt="" /></a></td>
      </tr>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia ${dateText}</td>
        <td>Pièce jointe pas encore publiée</td>
      </tr>
      <tr>
        <td>Concours Paramédical Infirmier(e) et Technicien de Santé Errachidia 28 06 2025</td>
        <td><a href="/Docs_Concours/Param%C3%A9dical/2025/errachidia/old/Errachidia-avis%20CR-ITS-28%2006%202025.pdf">Old avis</a></td>
      </tr>
    </table>
  `;
}

async function runParserChecks() {
  const links = parsePdfLinks(
    syntheticMinistryHtml(),
    "https://drh.sante.gov.ma/Pages/Concours_Ex_D.aspx",
  );
  const labels = links.map((item) => item.updateLabel).sort();
  const listingKeys = new Set(links.map((item) => item.listingKey));

  assertCheck("synthetic current/update discovery count", links.length === 5, {
    links,
  });
  assertCheck(
    "old concours ignored",
    links.every((item) => !item.pdfUrl.includes("/2025/")),
    {
      links,
    },
  );
  assertCheck("same concours grouped by listingKey", listingKeys.size === 1, {
    listingKeys: [...listingKeys],
  });
  assertCheck("planning detected", labels.includes("Planning"), { labels });
  assertCheck(
    "liste definitive detected",
    labels.includes("Liste définitive"),
    {
      labels,
    },
  );
  assertCheck(
    "icon-only accepted results detected",
    labels.includes("Résultats définitifs"),
    {
      labels,
    },
  );
  assertCheck(
    "no attachment fallback detected",
    links.some((item) => item.hasAttachment === false),
    { links },
  );

  const emploiPublicLinks = parseEmploiPublicDetail(
    `
      <body>
        <h1>مباريات التوظيف : ممرض من الدرجة الأولى - سُلمْ 10</h1>
        <h3>الإدارة المنظمة المركز الاستشفائي الجامعي سوس ماسة</h3>
        <h3>آخر أجل لإيداع الترشيحات 31 أكتوبر 2026 - 16:30</h3>
        <h3>تاريخ إجراء المباراة 30 نونبر 2026</h3>
        <h3>تحميل الملفات</h3>
        <a href="/ar/تحميل/المباريات/arrete/future-chu">قرار فتح المباراة</a>
        <a href="/ar/تحميل/المباريات/list_convoques/future-chu">لائحة المترشحين المدعوين لاجتياز المباراة</a>
        <a href="/ar/تحميل/المباريات/resultats/future-chu">نتيجة المباراة</a>
        <a href="/ar/تحميل/المباريات/list_attente/future-chu">لائحة الانتظار</a>
        <p>تخصص : - ممرض متعدد التخصصات الدرجة : ممرض من الدرجة الأولى - سُلمْ 10 عدد المناصب : 15</p>
      </body>
    `,
    "https://www.emploi-public.ma/ar/تفاصيل/المباريات/future-chu",
  );
  const emploiPublicLabels = emploiPublicLinks.map((item) => item.updateLabel);

  assertCheck(
    "emploi-public target grade detected",
    emploiPublicLinks.length === 4,
    { emploiPublicLinks },
  );
  assertCheck(
    "emploi-public results/list labels detected",
    emploiPublicLabels.includes("Résultats") &&
      emploiPublicLabels.includes("Liste d'attente") &&
      emploiPublicLabels.includes("Liste des convoqués"),
    { emploiPublicLabels },
  );

  const nonChuEmploiPublicLinks = parseEmploiPublicDetail(
    `
      <body>
        <h1>مباريات التوظيف : ممرض من الدرجة الأولى - سُلمْ 10</h1>
        <h3>الإدارة المنظمة وزارة الصحة والحماية الاجتماعية</h3>
        <h3>آخر أجل لإيداع الترشيحات 22 يونيو 2026 - 16:30</h3>
        <h3>تاريخ إجراء المباراة 28 يونيو 2026</h3>
        <a href="/ar/تحميل/المباريات/arrete/ministry-duplicate">قرار فتح المباراة</a>
      </body>
    `,
    "https://www.emploi-public.ma/ar/تفاصيل/المباريات/ministry-duplicate",
  );

  assertCheck(
    "emploi-public non-CHU mirror skipped",
    nonChuEmploiPublicLinks.length === 0,
    { nonChuEmploiPublicLinks },
  );

  const emploiPublicListingLinks = parseEmploiPublicListing(`
    <div class="s-item">
      <a href="/ar/%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84/%D8%A7%D9%84%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA/live-2026" class="card">
        <h2 class="card-title">مباراة لتوظيف ممرض من الدرجة الأولى - سلم 10</h2>
        <div>تاريخ إجراء المباراة : 28 يونيو 2026</div>
      </a>
    </div>
    <div class="s-item">
      <a href="/ar/%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84/%D8%A7%D9%84%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA/other-grade" class="card">
        <h2 class="card-title">مباراة لتوظيف تقني من الدرجة الثالثة - سلم 9</h2>
      </a>
    </div>
  `);

  assertCheck(
    "emploi-public listing tolerant grade scan",
    emploiPublicListingLinks.length === 1 &&
      emploiPublicListingLinks[0]?.includes("live-2026"),
    { emploiPublicListingLinks },
  );
}

async function loadCandidatePdf(value: string) {
  if (existsSync(value)) {
    return toArrayBuffer(await readFile(value));
  }

  const response = value.includes("drh.sante.gov.ma")
    ? await fetchMinistryResource(value)
    : await fetch(value);
  if (!response.ok) {
    throw new Error(`Candidate test PDF fetch failed: ${response.status}`);
  }
  return response.arrayBuffer();
}

async function runCandidateCheck() {
  const pdf = process.env.TEST_CANDIDATE_PDF?.trim();
  const name =
    process.env.TEST_CANDIDATE_FULL_NAME?.trim() ||
    process.env.CANDIDATE_FULL_NAME?.trim();

  if (!pdf || !name) {
    record("candidate name check", true, {
      skipped: "Set TEST_CANDIDATE_PDF and TEST_CANDIDATE_FULL_NAME to run it.",
    });
    return;
  }

  const bytes = await loadCandidatePdf(pdf);
  const result = await checkCandidateWithGemini(bytes, pdf, name);
  record("candidate name check", true, result);
}

async function runHeartbeatCheck() {
  const health = await getWatcherHealth();
  assertCheck(
    "watcher heartbeat reachable",
    ["healthy", "stale", "failing", "missing"].includes(health.status),
    health,
  );
}

async function main() {
  await runParserChecks();
  await runHeartbeatCheck();
  await runCandidateCheck();

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, results }, null, 2));
  console.error(error);
  process.exitCode = 1;
});
