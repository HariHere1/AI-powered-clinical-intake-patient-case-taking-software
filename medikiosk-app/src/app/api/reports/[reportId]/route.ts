import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertDoctorHasActiveKey,
  assertPatientOwnsReport,
  requireStaff,
} from "@/lib/authz";
import { getPatientSession } from "@/lib/auth/patientSession";
import { getStaffSession } from "@/lib/auth/staffSession";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

async function loadReportWithLatestVersion(reportId: string) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  return report;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    const patientSession = await getPatientSession();
    const staffSession = await getStaffSession();

    if (patientSession) {
      await assertPatientOwnsReport(patientSession.patientId, reportId);
    } else if (staffSession?.role === "DOCTOR") {
      await assertDoctorHasActiveKey(staffSession.staffId, reportId);
      await writeAuditLog({
        actorType: "DOCTOR",
        actorId: staffSession.staffId,
        eventType: "report_viewed",
        entityType: "Report",
        entityId: reportId,
      });
    } else {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const report = await loadReportWithLatestVersion(reportId);
    return NextResponse.json({
      reportId: report.id,
      status: report.status,
      currentVersion: report.currentVersion,
      content: report.versions[0]?.content ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  content: z.record(z.string(), z.string()),
  changeNote: z.string().optional(),
});

/** Only a doctor holding an active key may edit the report (physician review/edit). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const staff = await requireStaff("DOCTOR");
    const { reportId } = await params;
    await assertDoctorHasActiveKey(staff.staffId, reportId);

    const { content, changeNote } = patchSchema.parse(await req.json());
    const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } });
    const nextVersionNo = report.currentVersion + 1;

    await prisma.$transaction([
      prisma.reportVersion.create({
        data: {
          reportId,
          versionNo: nextVersionNo,
          content,
          editedByStaffId: staff.staffId,
          changeNote,
        },
      }),
      prisma.report.update({
        where: { id: reportId },
        data: { currentVersion: nextVersionNo, status: "PHYSICIAN_REVIEWED" },
      }),
    ]);

    await writeAuditLog({
      actorType: "DOCTOR",
      actorId: staff.staffId,
      eventType: "report_edited",
      entityType: "Report",
      entityId: reportId,
      metadata: { versionNo: nextVersionNo, changeNote },
    });

    return NextResponse.json({ ok: true, versionNo: nextVersionNo });
  } catch (error) {
    return handleApiError(error);
  }
}
