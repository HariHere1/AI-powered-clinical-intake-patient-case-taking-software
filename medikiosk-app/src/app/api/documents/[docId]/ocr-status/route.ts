import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { docId } = await params;
    const document = await prisma.document.findUnique({ where: { id: docId } });
    if (!document || document.patientId !== patient.patientId) {
      throw new ForbiddenError("Document does not belong to this patient");
    }
    return NextResponse.json({
      ocrStatus: document.ocrStatus,
      ocrText: document.ocrText,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
