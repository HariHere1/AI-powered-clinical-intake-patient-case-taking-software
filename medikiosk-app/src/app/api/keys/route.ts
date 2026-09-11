import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPatientOwnsReport, requirePatient } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  reportId: z.string(),
  doctorEmail: z.string().email(),
});

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function generateKeyCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `PT-${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function POST(req: NextRequest) {
  try {
    const patient = await requirePatient();
    const { reportId, doctorEmail } = schema.parse(await req.json());
    await assertPatientOwnsReport(patient.patientId, reportId);

    const doctor = await prisma.staffUser.findUnique({ where: { email: doctorEmail } });
    if (!doctor || doctor.role !== "DOCTOR" || !doctor.isActive) {
      return NextResponse.json({ error: "No matching doctor found" }, { status: 404 });
    }

    const key = await prisma.accessKey.create({
      data: {
        code: generateKeyCode(),
        reportId,
        patientId: patient.patientId,
        doctorId: doctor.id,
      },
    });

    await writeAuditLog({
      actorType: "PATIENT",
      actorId: patient.patientId,
      eventType: "access_key_created",
      entityType: "AccessKey",
      entityId: key.id,
      metadata: { doctorId: doctor.id },
    });

    return NextResponse.json({ keyId: key.id, code: key.code, isActive: key.isActive });
  } catch (error) {
    return handleApiError(error);
  }
}
