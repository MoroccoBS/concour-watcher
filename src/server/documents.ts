import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { concoursDocuments, specialtyRows } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import type { DiscoveredPdf } from "./scraper";
import { sendTelegramMessage } from "./telegram";

export async function listDocuments() {
  if (!db) return [];

  return db.query.concoursDocuments.findMany({
    orderBy: [desc(concoursDocuments.examDate), desc(concoursDocuments.discoveredAt)],
    with: {
      specialtyRows: true,
    },
  });
}

export async function upsertDiscoveredPdfs(items: DiscoveredPdf[]) {
  if (!db || items.length === 0) return { inserted: 0 };

  const inserted = await db
    .insert(concoursDocuments)
    .values(
      items.map((item) => ({
        sourcePageUrl: item.sourcePageUrl,
        pdfUrl: item.pdfUrl,
        title: item.title,
        region: item.region,
        isImportant: item.isImportant,
      })),
    )
    .onConflictDoNothing({ target: concoursDocuments.pdfUrl })
    .returning();

  for (const item of inserted) {
    await sendTelegramMessage(
      [
        "<b>New concours PDF found</b>",
        item.title,
        item.isImportant ? "Likely relevant: yes" : "Likely relevant: maybe",
        item.pdfUrl,
      ].join("\n"),
    );
  }

  return { inserted: inserted.length };
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
        sql`${concoursDocuments.examDate} >= ${start}`,
        sql`${concoursDocuments.examDate} <= ${end}`,
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

  await db.delete(specialtyRows).where(eq(specialtyRows.documentId, documentId));

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
