import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments } from "@/db/schema";
import { extractConcoursWithGemini } from "./gemini";
import {
  detectSameDayConflicts,
  replaceSpecialtyRows,
} from "./documents";
import { sendTelegramMessage } from "./telegram";
import { validateExtraction } from "./validation";

export async function processPendingDocuments(limit = 5) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const pending = await db.query.concoursDocuments.findMany({
    where: inArray(concoursDocuments.processingStatus, [
      "pending",
      "needs_review",
      "failed",
    ]),
    orderBy: [asc(concoursDocuments.discoveredAt)],
    limit,
  });

  let processed = 0;

  for (const document of pending) {
    await db
      .update(concoursDocuments)
      .set({ processingStatus: "processing", updatedAt: new Date() })
      .where(eq(concoursDocuments.id, document.id));

    try {
      const response = await fetch(document.pdfUrl);
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
          title: finalExtraction.title,
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

      if (validation.isRadiologyRelevant || validation.issues.length) {
        await sendTelegramMessage(
          [
            validation.issues.length
              ? "<b>Concours needs review</b>"
              : "<b>Radiology concours detected</b>",
            finalExtraction.title,
            `Exam: ${finalExtraction.examDate ?? "unknown"}`,
            `Deadline: ${finalExtraction.applicationDeadline ?? "unknown"}`,
            `Radiology seats: ${validation.radiologySeats ?? "unknown"}`,
            `Confidence: ${finalExtraction.confidence}%`,
            document.pdfUrl,
          ].join("\n"),
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
