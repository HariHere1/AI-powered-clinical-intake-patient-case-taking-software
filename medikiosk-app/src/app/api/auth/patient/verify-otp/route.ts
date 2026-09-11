import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rateLimit";
import { setPatientSessionCookie } from "@/lib/auth/patientSession";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    if (!checkRateLimit(`otp-verify:${body.phone}:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    const valid = await verifyOtp(body.phone, body.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({ where: { phone: body.phone } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await setPatientSessionCookie({ patientId: patient.id, phone: patient.phone });
    await writeAuditLog({
      actorType: "PATIENT",
      actorId: patient.id,
      eventType: "otp_verified",
      entityType: "Patient",
      entityId: patient.id,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true, patientId: patient.id });
  } catch (error) {
    return handleApiError(error);
  }
}
