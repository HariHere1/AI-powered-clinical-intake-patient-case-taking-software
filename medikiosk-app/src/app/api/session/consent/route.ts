import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const CONSENT_VERSION = "v1";
const CONSENT_TEXT =
  "I consent to MediKiosk recording my medical history (spoken, typed, and uploaded documents) and sharing it with the hospital and any doctor I explicitly grant access to.";

const schema = z.object({ agree: z.boolean() });

export async function POST(req: NextRequest) {
  try {
    const patient = await requirePatient();
    const { agree } = schema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    if (!agree) {
      return NextResponse.json({ error: "Consent is required to continue" }, { status: 403 });
    }

    const consent = await prisma.consentRecord.create({
      data: {
        patientId: patient.patientId,
        consentText: CONSENT_TEXT,
        consentVersion: CONSENT_VERSION,
        ipAddress: ip,
      },
    });

    await writeAuditLog({
      actorType: "PATIENT",
      actorId: patient.patientId,
      eventType: "consent_granted",
      entityType: "ConsentRecord",
      entityId: consent.id,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true, consentId: consent.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const patient = await requirePatient();
    const latest = await prisma.consentRecord.findFirst({
      where: { patientId: patient.patientId, revokedAt: null },
      orderBy: { grantedAt: "desc" },
    });
    if (latest) {
      await prisma.consentRecord.update({
        where: { id: latest.id },
        data: { revokedAt: new Date() },
      });
      await writeAuditLog({
        actorType: "PATIENT",
        actorId: patient.patientId,
        eventType: "consent_revoked",
        entityType: "ConsentRecord",
        entityId: latest.id,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
