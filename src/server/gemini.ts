import { GoogleGenAI, Type } from "@google/genai";

import { type AiExtraction, aiExtractionSchema } from "./validation";

const responseSchema = {
  type: Type.OBJECT,
  required: [
    "title",
    "documentType",
    "isRadiologyRelevant",
    "confidence",
    "specialtyRows",
  ],
  properties: {
    title: { type: Type.STRING },
    documentType: {
      type: Type.STRING,
      enum: [
        "notice",
        "convocation",
        "results",
        "assignment",
        "planning",
        "unknown",
      ],
    },
    region: { type: Type.STRING, nullable: true },
    center: { type: Type.STRING, nullable: true },
    examDate: { type: Type.STRING, nullable: true },
    applicationDeadline: { type: Type.STRING, nullable: true },
    totalSeats: { type: Type.NUMBER, nullable: true },
    radiologySeats: { type: Type.NUMBER, nullable: true },
    formUrl: { type: Type.STRING, nullable: true },
    isRadiologyRelevant: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    sourceNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          page: { type: Type.NUMBER, nullable: true },
          evidence: { type: Type.STRING },
        },
      },
    },
    specialtyRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["specialty", "seats", "isRadiology"],
        properties: {
          frame: { type: Type.STRING, nullable: true },
          specialty: { type: Type.STRING },
          seats: { type: Type.NUMBER },
          isRadiology: { type: Type.BOOLEAN },
        },
      },
    },
    rawTextSummary: { type: Type.STRING, nullable: true },
  },
};

export async function extractConcoursWithGemini(
  pdfBytes: ArrayBuffer,
  pdfUrl: string,
  secondPass = false,
): Promise<AiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for AI extraction.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const prompt = [
    "You are verifying Moroccan Ministry of Health concours PDFs.",
    "Extract only facts visible in the PDF. The notice can be Arabic, French, scanned, or mixed.",
    "Focus on radiology technologist opportunities: radiologie, تقني في الأشعة, الأشعة, rayon.",
    "Dates must be ISO 8601 with Africa/Casablanca offset when a date/time is visible.",
    "If the document is not a recruitment notice, classify it accurately and leave unavailable fields null.",
    "Return strict JSON only. Include sourceNotes with short evidence and page numbers.",
    secondPass
      ? "This is a verification pass. Be skeptical and call out uncertainty through confidence."
      : "This is the first extraction pass.",
    `PDF URL: ${pdfUrl}`,
  ].join("\n");

  const bytes = Buffer.from(pdfBytes).toString("base64");
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: bytes,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: secondPass ? 0 : 0.1,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Gemini returned an empty response.");

  return aiExtractionSchema.parse(JSON.parse(raw));
}

const candidateCheckSchema = {
  type: Type.OBJECT,
  required: ["found", "confidence", "evidence"],
  properties: {
    found: { type: Type.BOOLEAN },
    matchedName: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER },
    evidence: { type: Type.STRING },
  },
};

export type CandidateCheck = {
  found: boolean;
  matchedName?: string | null;
  confidence: number;
  evidence: string;
};

export async function checkCandidateWithGemini(
  pdfBytes: ArrayBuffer,
  pdfUrl: string,
  candidateName: string,
): Promise<CandidateCheck> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for candidate checks.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const prompt = [
    "You are checking whether a candidate name appears in a Moroccan Ministry of Health concours PDF.",
    "The PDF may be Arabic, French, scanned, or mixed. Check tables, annexes, lists, and all visible pages.",
    "Names can have accents, Arabic/French transliteration differences, uppercase/lowercase differences, FIRST NAME before SURNAME or vice versa, and spacing differences.",
    "Only mark found=true when the candidate is very likely the same person. If unsure, found=false with evidence explaining the uncertainty.",
    "Return strict JSON only.",
    `Candidate name: ${candidateName}`,
    `PDF URL: ${pdfUrl}`,
  ].join("\n");

  const bytes = Buffer.from(pdfBytes).toString("base64");
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: bytes,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: candidateCheckSchema,
      temperature: 0,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Gemini returned an empty candidate check.");

  const parsed = JSON.parse(raw) as CandidateCheck;
  const rawConfidence = Number(parsed.confidence ?? 0);
  const confidence =
    rawConfidence > 0 && rawConfidence <= 1
      ? rawConfidence * 100
      : rawConfidence;
  return {
    found: Boolean(parsed.found),
    matchedName: parsed.matchedName ?? null,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    evidence: parsed.evidence ?? "",
  };
}
