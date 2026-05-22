import type { ConcoursDocument, SpecialtyRow } from "@/db/schema";

type DocumentWithRows = ConcoursDocument & { specialtyRows: SpecialtyRow[] };

export const demoDocuments: DocumentWithRows[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    sourcePageUrl: "https://drh.sante.gov.ma/Pages/Concours_Ex_D.aspx",
    pdfUrl:
      "https://drh.sante.gov.ma/Docs_Concours/Param%C3%A9dical/2026/errachidia/CR%2028%2006%202026/Errachidia-avis%20CR-ITS-28%2006%202026.pdf",
    listingKey: "2026-06-28:errachidia",
    hasAttachment: true,
    updateLabel: "Avis",
    title: "Draa-Tafilalet ITS concours notice",
    region: "Draa-Tafilalet",
    documentType: "notice",
    processingStatus: "needs_review",
    applicationStatus: "new",
    isRadiologyRelevant: true,
    isImportant: true,
    needsSecondPass: true,
    sameDayConflict: false,
    confidence: 82,
    examDate: new Date("2026-06-28T09:00:00+01:00"),
    applicationDeadline: new Date("2026-06-23T16:30:00+01:00"),
    center: "Errachidia",
    totalSeats: 600,
    radiologySeats: 30,
    formUrl: "https://application.sante.gov.ma/concours",
    extractedJson: null,
    validationIssues: ["Demo mode: connect Neon and run processing to verify."],
    ocrText: null,
    adminNotes: "Sample from the provided Errachidia notice.",
    discoveredAt: new Date("2026-05-22T18:01:59+01:00"),
    processedAt: null,
    createdAt: new Date("2026-05-22T18:01:59+01:00"),
    updatedAt: new Date("2026-05-22T18:01:59+01:00"),
    specialtyRows: [
      {
        id: "00000000-0000-4000-8000-000000000101",
        documentId: "00000000-0000-4000-8000-000000000001",
        frame: "Health technician",
        specialty: "Technicien en radiologie / تقني في الأشعة",
        seats: 30,
        isRadiology: true,
        createdAt: new Date("2026-05-22T18:01:59+01:00"),
      },
    ],
  },
];
