import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { type ConcoursDocument, concoursDocuments } from "@/db/schema";
import {
  createDocumentEvent,
  detectSameDayConflicts,
  replaceSpecialtyRows,
} from "./documents";
import { checkCandidateWithGemini, extractConcoursWithGemini } from "./gemini";
import { fetchMinistryResource } from "./ministry-fetch";
import { sendTelegramMessage } from "./telegram";
import { validateExtraction } from "./validation";
import { watcherLog, watcherWarn } from "./watcher-log";

export async function processPendingDocuments(
  limit = 5,
  options: { priorityIds?: string[] } = {},
) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const statuses: Array<ConcoursDocument["processingStatus"]> = ["pending"];
  if (process.env.PROCESS_RETRY_FAILED === "true") {
    statuses.push("failed");
  }

  const priorityIds = [...new Set(options.priorityIds ?? [])];
  const priorityPending = priorityIds.length
    ? await db.query.concoursDocuments.findMany({
        where: inArray(concoursDocuments.id, priorityIds),
      })
    : [];
  const eligiblePriority = priorityPending.filter((document) =>
    statuses.includes(document.processingStatus),
  );
  const remainingLimit = Math.max(0, limit - eligiblePriority.length);

  const backlog =
    remainingLimit > 0
      ? await db.query.concoursDocuments.findMany({
          where: inArray(concoursDocuments.processingStatus, statuses),
          orderBy: [
            desc(concoursDocuments.isImportant),
            desc(concoursDocuments.updatedAt),
          ],
          limit: remainingLimit + priorityIds.length,
        })
      : [];

  const pending = [...eligiblePriority, ...backlog]
    .filter(
      (document, index, documents) =>
        documents.findIndex((item) => item.id === document.id) === index,
    )
    .slice(0, limit);

  watcherLog("processing.queue.selected", {
    limit,
    statuses,
    priorityIds,
    priorityEligible: eligiblePriority.length,
    selected: pending.map((document) => ({
      id: document.id,
      title: document.title,
      updateLabel: document.updateLabel,
      status: document.processingStatus,
      isImportant: document.isImportant,
      discoveredAt: document.discoveredAt,
    })),
  });

  let processed = 0;

  for (const document of pending) {
    watcherLog("processing.document.start", {
      id: document.id,
      title: document.title,
      updateLabel: document.updateLabel,
      pdfUrl: document.pdfUrl,
      hasAttachment: document.hasAttachment,
      isImportant: document.isImportant,
    });

    await db
      .update(concoursDocuments)
      .set({ processingStatus: "processing", updatedAt: new Date() })
      .where(eq(concoursDocuments.id, document.id));

    try {
      if (!document.hasAttachment) {
        watcherLog("processing.document.no-attachment", {
          id: document.id,
          sourcePageUrl: document.sourcePageUrl,
        });
        await db
          .update(concoursDocuments)
          .set({
            processingStatus: "needs_review",
            validationIssues: ["No attachment is available yet."],
            updatedAt: new Date(),
          })
          .where(eq(concoursDocuments.id, document.id));
        processed += 1;
        watcherLog("processing.document.done", {
          id: document.id,
          processed,
          status: "needs_review",
        });
        continue;
      }

      watcherLog("processing.pdf.fetch.start", {
        id: document.id,
        pdfUrl: document.pdfUrl,
      });
      const response = await fetchMinistryResource(document.pdfUrl);
      watcherLog("processing.pdf.fetch.done", {
        id: document.id,
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        throw new Error(`PDF download failed: ${response.status}`);
      }

      const pdfBytes = await response.arrayBuffer();
      watcherLog("processing.pdf.bytes", {
        id: document.id,
        bytes: pdfBytes.byteLength,
      });
      const firstPass = await extractConcoursWithGemini(
        pdfBytes,
        document.pdfUrl,
      );
      let finalExtraction = firstPass;
      let validation = validateExtraction(firstPass);
      watcherLog("processing.validation.first-pass", {
        id: document.id,
        issues: validation.issues,
        needsSecondPass: validation.needsSecondPass,
        isRadiologyRelevant: validation.isRadiologyRelevant,
        radiologySeats: validation.radiologySeats,
      });

      if (validation.needsSecondPass) {
        watcherLog("processing.second-pass.start", { id: document.id });
        finalExtraction = await extractConcoursWithGemini(
          pdfBytes,
          document.pdfUrl,
          true,
        );
        validation = validateExtraction(finalExtraction);
        watcherLog("processing.validation.second-pass", {
          id: document.id,
          issues: validation.issues,
          needsSecondPass: validation.needsSecondPass,
          isRadiologyRelevant: validation.isRadiologyRelevant,
          radiologySeats: validation.radiologySeats,
        });
      }

      const sourceIssues = await findSourceVerificationIssues({
        document,
        extraction: finalExtraction,
        examDate: validation.examDate,
      });
      const issues = [...validation.issues, ...sourceIssues];
      const status = issues.length ? "needs_review" : "processed";
      watcherLog("processing.document.extracted", {
        id: document.id,
        status,
        title: buildDisplayTitle(finalExtraction),
        documentType: finalExtraction.documentType,
        region: finalExtraction.region,
        examDate: validation.examDate,
        deadline: validation.applicationDeadline,
        totalSeats: finalExtraction.totalSeats,
        radiologySeats: validation.radiologySeats,
        confidence: finalExtraction.confidence,
        specialtyRows: finalExtraction.specialtyRows,
        issues,
        sourceIssues,
      });

      await db
        .update(concoursDocuments)
        .set({
          title: buildDisplayTitle(finalExtraction),
          documentType: finalExtraction.documentType,
          region: finalExtraction.region,
          center: finalExtraction.center,
          examDate: validation.examDate,
          applicationDeadline: validation.applicationDeadline,
          totalSeats: finalExtraction.totalSeats,
          radiologySeats: validation.radiologySeats,
          formUrl: finalExtraction.formUrl,
          isRadiologyRelevant: validation.isRadiologyRelevant,
          confidence: finalExtraction.confidence,
          needsSecondPass: validation.needsSecondPass,
          validationIssues: issues,
          extractedJson: finalExtraction,
          ocrText: finalExtraction.rawTextSummary,
          processingStatus: status,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(concoursDocuments.id, document.id));

      const candidateCheck = shouldCheckCandidate(
        finalExtraction.documentType,
        document.updateLabel,
      )
        ? await runCandidateCheckSafely({
            documentId: document.id,
            pdfBytes,
            pdfUrl: document.pdfUrl,
            title: buildDisplayTitle(finalExtraction),
          })
        : null;
      watcherLog("processing.candidate-check.done", {
        id: document.id,
        checked: candidateCheck !== null,
        result: candidateCheck,
        documentType: finalExtraction.documentType,
        updateLabel: document.updateLabel,
      });

      await replaceSpecialtyRows(
        document.id,
        finalExtraction.specialtyRows.map((row) => ({
          frame: row.frame,
          specialty: row.specialty,
          seats: row.seats,
          isRadiology: row.isRadiology,
        })),
      );

      await detectSameDayConflicts(document.id);
      await createDocumentEvent({
        documentId: document.id,
        type: status === "processed" ? "processed" : "needs_review",
        message:
          status === "processed"
            ? "AI extraction completed"
            : "AI extraction needs review",
        metadata: {
          confidence: finalExtraction.confidence,
          issues,
          documentType: finalExtraction.documentType,
        },
      });
      if (sourceIssues.length) {
        await createDocumentEvent({
          documentId: document.id,
          type: "source_conflict",
          message: "Source conflict needs admin review",
          metadata: {
            issues: sourceIssues,
            sourcePageUrl: document.sourcePageUrl,
          },
        });
      }
      watcherLog("processing.document.persisted", {
        id: document.id,
        status,
      });

      if (
        document.isImportant ||
        validation.isRadiologyRelevant ||
        validation.issues.length
      ) {
        watcherLog("telegram.processed.send", {
          id: document.id,
          title: buildDisplayTitle(finalExtraction),
          status,
          validationIssues: issues,
        });
        await sendTelegramMessage(
          formatProcessedMessage({
            title: buildDisplayTitle(finalExtraction),
            pdfUrl: document.pdfUrl,
            examDate: validation.examDate,
            deadline: validation.applicationDeadline,
            totalSeats: finalExtraction.totalSeats ?? null,
            radiologySeats: validation.radiologySeats,
            confidence: finalExtraction.confidence,
            issues,
            candidateMatched: candidateCheck?.found ?? null,
          }),
        );
      }

      processed += 1;
      watcherLog("processing.document.done", {
        id: document.id,
        processed,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing failure";
      watcherWarn("processing.document.failed", {
        id: document.id,
        title: document.title,
        message,
      });

      await db
        .update(concoursDocuments)
        .set({
          processingStatus: "failed",
          validationIssues: [message],
          updatedAt: new Date(),
        })
        .where(eq(concoursDocuments.id, document.id));

      await createDocumentEvent({
        documentId: document.id,
        type: "processing_failed",
        message,
      });

      await sendTelegramMessage(
        ["<b>Concours processing failed</b>", document.title, message].join(
          "\n",
        ),
      );
    }
  }

  return { processed, found: pending.length };
}

async function findSourceVerificationIssues(input: {
  document: ConcoursDocument;
  extraction: {
    region?: string | null;
    center?: string | null;
    totalSeats?: number | null;
  };
  examDate: Date | null;
}) {
  const isEmploiPublic =
    input.document.sourcePageUrl.includes("emploi-public.ma");
  if (!db || !isEmploiPublic || !input.examDate) return [];

  const text = [
    input.extraction.region,
    input.extraction.center,
    input.document.region,
    input.document.title,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[إأآ]/g, "ا")
    .toLowerCase();
  const isChu =
    text.includes("chu") ||
    text.includes("centre hospitalier universitaire") ||
    (text.includes("المركز الاستشفا") && text.includes("الجامعي"));

  if (isChu) {
    watcherLog("source-verification.skipped-chu", {
      id: input.document.id,
      title: input.document.title,
    });
    return [];
  }

  const start = new Date(input.examDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(input.examDate);
  end.setHours(23, 59, 59, 999);

  const santeMatches = await db.query.concoursDocuments.findMany({
    where: and(
      ne(concoursDocuments.id, input.document.id),
      gte(concoursDocuments.examDate, start),
      lte(concoursDocuments.examDate, end),
    ),
  });
  const primaryMatches = santeMatches.filter((item) =>
    item.sourcePageUrl.includes("drh.sante.gov.ma"),
  );

  watcherLog("source-verification.compared", {
    id: input.document.id,
    examDate: input.examDate,
    primaryMatches: primaryMatches.length,
    emploiTotalSeats: input.extraction.totalSeats,
    primaryTotals: primaryMatches.map((item) => item.totalSeats),
  });

  if (primaryMatches.length === 0) return [];

  const knownPrimaryTotals = primaryMatches
    .map((item) => item.totalSeats)
    .filter((value): value is number => typeof value === "number");
  if (
    typeof input.extraction.totalSeats === "number" &&
    knownPrimaryTotals.length > 0 &&
    !knownPrimaryTotals.includes(input.extraction.totalSeats)
  ) {
    return [
      `emploi-public total seats (${input.extraction.totalSeats}) conflicts with sante.gov.ma (${knownPrimaryTotals.join(", ")}).`,
    ];
  }

  return [];
}

function shouldCheckCandidate(
  documentType: string,
  updateLabel?: string | null,
) {
  const label = updateLabel?.toLowerCase() ?? "";
  if (
    label.includes("liste définitive") ||
    label.includes("liste definitive")
  ) {
    return false;
  }

  return (
    documentType === "results" ||
    documentType === "assignment" ||
    [
      "résultat",
      "result",
      "rslts",
      "affectation",
      "prise de service",
      "liste d'attente",
    ].some((keyword) => label.includes(keyword))
  );
}

async function runCandidateCheck(input: {
  documentId: string;
  pdfBytes: ArrayBuffer;
  pdfUrl: string;
  title: string;
}) {
  const candidateName = process.env.CANDIDATE_FULL_NAME?.trim();
  if (!candidateName || !db) return null;

  const check = await checkCandidateWithGemini(
    input.pdfBytes,
    input.pdfUrl,
    candidateName,
  );

  await db
    .update(concoursDocuments)
    .set({
      candidateMatched: check.found,
      candidateMatchedName: check.matchedName,
      candidateCheckConfidence: check.confidence,
      candidateEvidence: check.evidence,
      updatedAt: new Date(),
    })
    .where(eq(concoursDocuments.id, input.documentId));

  await sendTelegramMessage(
    [
      check.found
        ? "🎯 <b>Ton nom semble être dans la liste</b>"
        : "🔎 <b>Nom vérifié dans un nouveau document</b>",
      `📍 <b>${input.title}</b>`,
      `👤 Cherché: ${candidateName}`,
      check.matchedName ? `✅ Trouvé comme: ${check.matchedName}` : null,
      `🤖 Confiance: ${check.confidence}%`,
      check.evidence ? `🧾 ${check.evidence}` : null,
      `📎 <a href="${input.pdfUrl}">Ouvrir le PDF</a>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return check;
}

async function runCandidateCheckSafely(input: {
  documentId: string;
  pdfBytes: ArrayBuffer;
  pdfUrl: string;
  title: string;
}) {
  try {
    return await runCandidateCheck(input);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown candidate check failure";
    await sendTelegramMessage(
      [
        "⚠️ <b>Candidate name check failed</b>",
        input.title,
        message,
        `📎 <a href="${input.pdfUrl}">Ouvrir le PDF</a>`,
      ].join("\n"),
    );
    return null;
  }
}

function buildDisplayTitle(extraction: {
  region?: string | null;
  totalSeats?: number | null;
  radiologySeats?: number | null;
}) {
  const parts = [
    extraction.region?.replace(/^direction régionale\s*/i, "").trim(),
    typeof extraction.totalSeats === "number"
      ? `${extraction.totalSeats} postes`
      : null,
    typeof extraction.radiologySeats === "number"
      ? `${extraction.radiologySeats} radiologie`
      : null,
  ].filter(Boolean);

  return parts.join(" · ") || "Concours ITS";
}

function shortDate(value: Date | null) {
  if (!value) return "Inconnu";
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(value);
}

function formatProcessedMessage(input: {
  title: string;
  pdfUrl: string;
  examDate: Date | null;
  deadline: Date | null;
  totalSeats: number | null;
  radiologySeats: number | null;
  confidence: number;
  issues: string[];
  candidateMatched: boolean | null;
}) {
  return [
    input.issues.length
      ? "⚠️ <b>Concours ITS à vérifier</b>"
      : "✅ <b>Concours ITS analysé</b>",
    `📍 <b>${input.title}</b>`,
    `🗓️ Examen: ${shortDate(input.examDate)}`,
    `⏳ Deadline: ${shortDate(input.deadline)}`,
    `💺 Total: ${input.totalSeats ?? "?"}`,
    `🩻 Radiologie: ${input.radiologySeats ?? "?"}`,
    input.candidateMatched === true
      ? "🎯 Ton nom est détecté dans ce document"
      : null,
    `🤖 Confiance: ${input.confidence}%`,
    input.issues.length ? `⚠️ ${input.issues.join(" ")}` : null,
    `📎 <a href="${input.pdfUrl}">Ouvrir le PDF</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}
