import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const staff = await requireStaff("DOCTOR");

    const keys = await prisma.accessKey.findMany({
      where: { doctorId: staff.staffId, isActive: true },
      include: { patient: true, report: true },
      orderBy: { activatedAt: "desc" },
    });

    return NextResponse.json({
      patients: keys.map((k) => ({
        keyId: k.id,
        patientId: k.patientId,
        fullName: k.patient.fullName,
        reportId: k.reportId,
        reportStatus: k.report.status,
        activatedAt: k.activatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
