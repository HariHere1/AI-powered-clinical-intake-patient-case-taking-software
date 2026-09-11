import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { setStaffSessionCookie } from "@/lib/auth/staffSession";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    if (!checkRateLimit(`staff-login:${body.email}:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    const staff = await prisma.staffUser.findUnique({ where: { email: body.email } });
    if (!staff || !staff.isActive || !(await bcrypt.compare(body.password, staff.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setStaffSessionCookie({
      staffId: staff.id,
      role: staff.role,
      hospitalId: staff.hospitalId,
    });

    await writeAuditLog({
      actorType: staff.role,
      actorId: staff.id,
      eventType: "staff_login",
      entityType: "StaffUser",
      entityId: staff.id,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true, role: staff.role, fullName: staff.fullName });
  } catch (error) {
    return handleApiError(error);
  }
}
