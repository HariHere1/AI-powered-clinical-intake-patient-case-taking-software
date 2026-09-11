import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createOtp, isMockOtpEnabled } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  phone: z.string().min(8).max(20),
  fullName: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    if (!checkRateLimit(`otp:${body.phone}:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    await prisma.patient.upsert({
      where: { phone: body.phone },
      update: { fullName: body.fullName },
      create: { phone: body.phone, fullName: body.fullName },
    });

    const code = await createOtp(body.phone);

    await writeAuditLog({
      actorType: "PATIENT",
      eventType: "otp_requested",
      entityType: "Patient",
      entityId: body.phone,
      ipAddress: ip,
    });

    const mock = isMockOtpEnabled();
    return NextResponse.json({
      ok: true,
      mockOtp: mock,
      // Only surfaced when there is no real SMS provider wired up (dev/demo).
      code: mock ? code : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
