import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePatient, ForbiddenError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { keyId } = await params;

    const key = await prisma.accessKey.findUnique({ where: { id: keyId } });
    if (!key || key.patientId !== patient.patientId) {
      throw new ForbiddenError("Key does not belong to this patient");
    }

    const updated = await prisma.accessKey.update({
      where: { id: keyId },
      data: { isActive: true, activatedAt: new Date(), deactivatedAt: null },
    });

    await writeAuditLog({
      actorType: "PATIENT",
      actorId: patient.patientId,
      eventType: "access_key_activated",
      entityType: "AccessKey",
      entityId: keyId,
    });

    return NextResponse.json({ ok: true, isActive: updated.isActive });
  } catch (error) {
    return handleApiError(error);
  }
}
