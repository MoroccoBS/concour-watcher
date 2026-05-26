import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments, specialtyRows } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import type { DiscoveredPdf } from "./scraper";
import { sendTelegramMessage } from "./telegram";
import { watcherLog, watcherWarn } from "./watcher-log";

export async function listDocuments() {
  if (!db) return [];

  return db.query.concoursDocuments.findMany({
    orderBy: [
      desc(concoursDocuments.examDate),
      desc(concoursDocuments.discoveredAt),
    ],
    with: {
      specialtyRows: true,
    },
  });
}

export async function upsertDiscoveredPdfs(items: DiscoveredPdf[]) {
  if (!db || items.length === 0) return { inserted: 0, insertedIds: [] };

  watcherLog("documents.upsert.start", {
    discovered: items.length,
    important: items.filter((item) => item.isImportant).length,
    withAttachment: items.filter((item) => item.hasAttachment).length,
    withoutAttachment: items.filter((item) => !item.hasAttachment).length,
  });

  const inserted = await db
    .insert(concoursDocuments)
    .values(
      items.map((item) => ({
        sourcePageUrl: item.sourcePageUrl,
        pdfUrl: item.pdfUrl,
        listingKey: item.listingKey,
        hasAttachment: item.hasAttachment,
        updateLabel: item.updateLabel,
        title: item.title,
        region: item.region,
        isImportant: item.isImportant,
      })),
    )
    .onConflictDoNothing({ target: concoursDocuments.pdfUrl })
    .returning();

  watcherLog("documents.upsert.done", {
    inserted: inserted.length,
    insertedIds: inserted.map((item) => item.id),
    skippedAsExisting: items.length - inserted.length,
  });

  const important = inserted.filter((item) => item.isImportant).slice(0, 5);
  for (const item of important) {
    watcherLog("telegram.discovery.send", {
      id: item.id,
      title: item.title,
      updateLabel: item.updateLabel,
      hasAttachment: item.hasAttachment,
    });
    const result = await sendTelegramMessage(formatDiscoveryMessage(item));
    if ("error" in result && result.error) {
      watcherWarn("telegram.discovery.failed", {
        id: item.id,
        error: result.error,
      });
    }
  }

  if (inserted.length > important.length) {
    const result = await sendTelegramMessage(
      [
        "<b>Concours discovery summary</b>",
        `${inserted.length} new PDFs inserted.`,
        `${important.length} likely-relevant PDFs alerted individually.`,
      ].join("\n"),
    );
    if ("error" in result && result.error) {
      watcherWarn("telegram.discovery-summary.failed", {
        error: result.error,
      });
    }
  }

  return {
    inserted: inserted.length,
    insertedIds: inserted.map((item) => item.id),
  };
}

function compactTitle(value: string) {
  return value
    .replace(/concours de recrutement de/gi, "")
    .replace(/infirmiers? et techniciens? de santé/gi, "ITS")
    .replace(/direction régionale/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDiscoveryMessage(item: typeof concoursDocuments.$inferSelect) {
  const lines = [
    item.hasAttachment
      ? "🆕 <b>Nouveau document ITS</b>"
      : "🆕 <b>Nouveau concours ITS sans pièce jointe</b>",
    `📍 <b>${compactTitle(item.region ?? item.title)}</b>`,
    item.updateLabel ? `📌 ${item.updateLabel}` : null,
    `🕒 Détecté: ${formatDateTime(item.discoveredAt)}`,
    item.hasAttachment
      ? `📎 <a href="${item.pdfUrl}">Ouvrir le PDF</a>`
      : `🔗 <a href="${item.sourcePageUrl}">Page source</a>`,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function updateDocumentAdmin(input: {
  id: string;
  applicationStatus: ApplicationStatus;
  adminNotes: string;
}) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const [updated] = await db
    .update(concoursDocuments)
    .set({
      applicationStatus: input.applicationStatus,
      adminNotes: input.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(concoursDocuments.id, input.id))
    .returning();

  return updated;
}

export async function detectSameDayConflicts(documentId: string) {
  if (!db) return;

  const current = await db.query.concoursDocuments.findFirst({
    where: eq(concoursDocuments.id, documentId),
  });
  if (!current?.examDate) return;

  const start = new Date(current.examDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(current.examDate);
  end.setHours(23, 59, 59, 999);

  const conflicts = await db
    .select({ id: concoursDocuments.id })
    .from(concoursDocuments)
    .where(
      and(
        ne(concoursDocuments.id, documentId),
        gte(concoursDocuments.examDate, start),
        lte(concoursDocuments.examDate, end),
      ),
    );

  const ids = [documentId, ...conflicts.map((item) => item.id)];
  await db
    .update(concoursDocuments)
    .set({ sameDayConflict: conflicts.length > 0 })
    .where(inArray(concoursDocuments.id, ids));
}

export async function replaceSpecialtyRows(
  documentId: string,
  rows: Array<{
    frame?: string | null;
    specialty: string;
    seats: number;
    isRadiology: boolean;
  }>,
) {
  if (!db) return;

  await db
    .delete(specialtyRows)
    .where(eq(specialtyRows.documentId, documentId));

  if (rows.length > 0) {
    await db.insert(specialtyRows).values(
      rows.map((row) => ({
        documentId,
        frame: row.frame,
        specialty: row.specialty,
        seats: row.seats,
        isRadiology: row.isRadiology,
      })),
    );
  }
}
