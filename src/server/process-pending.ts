import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments } from "@/db/schema";
import { detectSameDayConflicts, replaceSpecialtyRows } from "./documents";
import { checkCandidateWithGemini, extractConcoursWithGemini } from "./gemini";
import { fetchMinistryResource } from "./ministry-fetch";
import { sendTelegramMessage } from "./telegram";
import { validateExtraction } from "./validation";

export async function processPendingDocuments(limit = 5) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const statuses: Array<"pending" | "failed"> = ["pending"];
  if (process.env.PROCESS_RETRY_FAILED === "true") {
    statuses.push("failed");
  }

  const pending = await db.query.concoursDocuments.findMany({
    where: inArray(concoursDocuments.processingStatus, statuses),
    orderBy: [
      desc(concoursDocuments.isImportant),
      asc(concoursDocuments.discoveredAt),
    ],
    limit,
  });

  let processed = 0;

  for (const document of pending) {
    await db
      .update(concoursDocuments)
      .set({ processingStatus: "processing", updatedAt: new Date() })
      .where(eq(concoursDocuments.id, document.id));

    try {
      if (!document.hasAttachment) {
        await db
          .update(concoursDocuments)
          .set({
            processingStatus: "needs_review",
            validationIssues: ["No attachment is available yet."],
            updatedAt: new Date(),
          })
          .where(eq(concoursDocuments.id, document.id));
        continue;
      }

      const response = await fetchMinistryResource(document.pdfUrl);
      if (!response.ok) {
        throw new Error(`PDF download failed: ${response.status}`);
      }

      const pdfBytes = await response.arrayBuffer();
      const firstPass = await extractConcoursWithGemini(
        pdfBytes,
        document.pdfUrl,
      );
      let finalExtraction = firstPass;
      let validation = validateExtraction(firstPass);

      if (validation.needsSecondPass) {
        finalExtraction = await extractConcoursWithGemini(
          pdfBytes,
          document.pdfUrl,
          true,
        );
        validation = validateExtraction(finalExtraction);
      }

      const status = validation.issues.length ? "needs_review" : "processed";

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
          validationIssues: validation.issues,
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

      if (
        document.isImportant ||
        validation.isRadiologyRelevant ||
        validation.issues.length
      ) {
        await sendTelegramMessage(
          formatProcessedMessage({
            title: buildDisplayTitle(finalExtraction),
            pdfUrl: document.pdfUrl,
            examDate: validation.examDate,
            deadline: validation.applicationDeadline,
            totalSeats: finalExtraction.totalSeats ?? null,
            radiologySeats: validation.radiologySeats,
            confidence: finalExtraction.confidence,
            issues: validation.issues,
            candidateMatched: candidateCheck?.found ?? null,
          }),
        );
      }

      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing failure";

      await db
        .update(concoursDocuments)
        .set({
          processingStatus: "failed",
          validationIssues: [message],
          updatedAt: new Date(),
        })
        .where(eq(concoursDocuments.id, document.id));

      await sendTelegramMessage(
        ["<b>Concours processing failed</b>", document.title, message].join(
          "\n",
        ),
      );
    }
  }

  return { processed, found: pending.length };
}

function shouldCheckCandidate(
  documentType: string,
  updateLabel?: string | null,
) {
  const label = updateLabel?.toLowerCase() ?? "";
  return (
    documentType !== "notice" ||
    [
      "liste",
      "result",
      "résultat",
      "convo",
      "affectation",
      "planning",
      "prise de service",
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
