import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePatient, assertPatientOwnsSession } from "@/lib/authz";
import { extractDocumentText } from "@/lib/services/ocrClient";
import { handleApiError } from "@/lib/apiError";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");
const VALID_DOC_TYPES = ["PRESCRIPTION", "PHARMACY_BILL", "CONSULTATION_RECORD", "LAB_REPORT", "OTHER"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { sessionId } = await params;
    await assertPatientOwnsSession(patient.patientId, sessionId);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const docType = String(form.get("docType") ?? "OTHER");

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: "invalid docType" }, { status: 400 });
    }

    const sessionDir = path.join(STORAGE_ROOT, sessionId);
    await mkdir(sessionDir, { recursive: true });
    const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = path.join(sessionDir, safeName);
    await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));

    const document = await prisma.document.create({
      data: {
        sessionId,
        patientId: patient.patientId,
        docType: docType as never,
        storagePath,
        ocrStatus: "PROCESSING",
      },
    });

    try {
      const ocrResult = await extractDocumentText(file, file.name);
      const updated = await prisma.document.update({
        where: { id: document.id },
        data: {
          ocrStatus: "DONE",
          ocrText: {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            structuredFields: ocrResult.structuredFields,
          } as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ documentId: updated.id, ocrStatus: updated.ocrStatus, ocrText: updated.ocrText });
    } catch (ocrError) {
      console.error("OCR failed", ocrError);
      await prisma.document.update({ where: { id: document.id }, data: { ocrStatus: "FAILED" } });
      return NextResponse.json({ documentId: document.id, ocrStatus: "FAILED" });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
