import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePatient, assertPatientOwnsSession } from "@/lib/authz";
import { getLlmProvider } from "@/lib/llm";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ sessionId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const patient = await requirePatient();
    const { sessionId } = schema.parse(await req.json());
    const session = await assertPatientOwnsSession(patient.patientId, sessionId);

    const [turns, documents] = await Promise.all([
      prisma.conversationTurn.findMany({ where: { sessionId }, orderBy: { sequenceNo: "asc" } }),
      prisma.document.findMany({ where: { sessionId, ocrStatus: "DONE" } }),
    ]);

    const content = await getLlmProvider().summarizeSession({
      languageCode: session.languageCode,
      turns: turns
        .filter((t) => t.answerText)
        .map((t) => ({ questionText: t.questionTextShown, answerText: t.answerText!, isFollowUp: t.isFollowUp })),
      documentTexts: documents.map((d) => ({
        docType: d.docType,
        text: (d.ocrText as { text?: string } | null)?.text ?? "",
      })),
    });

    const report = await prisma.report.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, patientId: patient.patientId },
    });

    const version = await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        versionNo: report.currentVersion,
        content: content as unknown as object,
      },
    });

    await writeAuditLog({
      actorType: "SYSTEM",
      eventType: "report_generated",
      entityType: "Report",
      entityId: report.id,
    });

    return NextResponse.json({ reportId: report.id, versionNo: version.versionNo, content });
  } catch (error) {
    return handleApiError(error);
  }
}
