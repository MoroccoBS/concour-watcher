import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments, documentEvents, specialtyRows } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import type { DiscoveredPdf } from "./scraper";
import { sendTelegramMessage } from "./telegram";
import { watcherLog, watcherWarn } from "./watcher-log";

export async function listDocuments() {
  if (!db) return [];

  const documents = await db.query.concoursDocuments.findMany({
    orderBy: [
      desc(concoursDocuments.examDate),
      desc(concoursDocuments.discoveredAt),
    ],
    with: {
      specialtyRows: true,
      events: {
        orderBy: [desc(documentEvents.createdAt)],
      },
    },
  });

  return documents.filter((item) => !isRetiredEmploiPublicMirror(item));
}

function isRetiredEmploiPublicMirror(
  item: typeof concoursDocuments.$inferSelect,
) {
  if (!item.sourcePageUrl.includes("emploi-public.ma")) return false;
  if (!item.listingKey?.startsWith("emploi-public:")) return false;
  const text = `${item.region ?? ""} ${item.center ?? ""} ${item.title ?? ""}`
    .normalize("NFD")
    .replace(/[إأآ]/g, "ا")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/\u0640/g, "")
    .toLowerCase();
  const isChu =
    text.includes("chu") ||
    text.includes("centre hospitalier universitaire") ||
    (text.includes("المركز الاستشفا") && text.includes("الجامعي"));

  return !isChu;
}

export async function upsertDiscoveredPdfs(items: DiscoveredPdf[]) {
  if (!db || items.length === 0) return { inserted: 0, insertedIds: [] };

  watcherLog("documents.upsert.start", {
    discovered: items.length,
    important: items.filter((item) => item.isImportant).length,
    withAttachment: items.filter((item) => item.hasAttachment).length,
    withoutAttachment: items.filter((item) => !item.hasAttachment).length,
  });

  const listingKeys = [
    ...new Set(items.map((item) => item.listingKey).filter(Boolean)),
  ] as string[];
  const existingForListings = listingKeys.length
    ? await db.query.concoursDocuments.findMany({
        where: inArray(concoursDocuments.listingKey, listingKeys),
      })
    : [];

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
    const event = getDiscoveryEvent(item, existingForListings);
    await createDocumentEvent({
      documentId: item.id,
      type: event.type,
      message: event.message,
      metadata: {
        updateLabel: item.updateLabel,
        hasAttachment: item.hasAttachment,
        pdfUrl: item.pdfUrl,
      },
    });
    watcherLog("telegram.discovery.send", {
      id: item.id,
      title: item.title,
      updateLabel: item.updateLabel,
      hasAttachment: item.hasAttachment,
    });
    const result = await sendTelegramMessage(
      formatDiscoveryMessage(item, event),
    );
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

function getDiscoveryEvent(
  item: typeof concoursDocuments.$inferSelect,
  existingForListings: Array<typeof concoursDocuments.$inferSelect>,
) {
  const label = item.updateLabel?.toLowerCase() ?? "";
  const hadNoAttachment = existingForListings.some(
    (existing) =>
      existing.listingKey === item.listingKey && !existing.hasAttachment,
  );

  if (item.hasAttachment && hadNoAttachment) {
    return {
      type: "attachment_appeared",
      message: "Attachment appeared",
      headline: "📎 <b>Pièce jointe ajoutée</b>",
    };
  }

  if (label.includes("planning") || label.includes("programme")) {
    return {
      type: "planning_added",
      message: "Planning added",
      headline: "🗓️ <b>Planning ajouté</b>",
    };
  }

  if (label.includes("résultat") || label.includes("result")) {
    return {
      type: "results_added",
      message: "Results added",
      headline: "🏁 <b>Résultats ajoutés</b>",
    };
  }

  if (label.includes("liste")) {
    return {
      type: "list_added",
      message: "List document added",
      headline: "📋 <b>Liste ajoutée</b>",
    };
  }

  return {
    type: item.hasAttachment ? "document_added" : "concours_without_attachment",
    message: item.hasAttachment
      ? "Document added"
      : "Concours without attachment",
    headline: item.hasAttachment
      ? "🆕 <b>Nouveau document ITS</b>"
      : "🆕 <b>Nouveau concours ITS sans pièce jointe</b>",
  };
}

function formatDiscoveryMessage(
  item: typeof concoursDocuments.$inferSelect,
  event: ReturnType<typeof getDiscoveryEvent>,
) {
  const lines = [
    event.headline,
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

export async function queueDocumentReprocess(documentId: string) {
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const [updated] = await db
    .update(concoursDocuments)
    .set({
      processingStatus: "pending",
      processedAt: null,
      validationIssues: ["Manual reprocess requested."],
      updatedAt: new Date(),
    })
    .where(eq(concoursDocuments.id, documentId))
    .returning();

  if (!updated) throw new Error("Document not found.");

  await createDocumentEvent({
    documentId,
    type: "reprocess_queued",
    message: "Manual reprocess queued",
  });

  return updated;
}

export async function createDocumentEvent(input: {
  documentId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  if (!db) return null;

  const [event] = await db
    .insert(documentEvents)
    .values({
      documentId: input.documentId,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
    })
    .returning();

  return event;
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
