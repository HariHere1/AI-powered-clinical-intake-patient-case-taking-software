import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertAdminOwnsHospital, requireStaff } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ isActive: z.boolean() });

/** Activating a template deactivates any other template for the same hospital. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const staff = await requireStaff("ADMIN");
    const { templateId } = await params;
    const template = await prisma.surveyTemplate.findUniqueOrThrow({ where: { id: templateId } });
    assertAdminOwnsHospital(staff.hospitalId, template.hospitalId);

    const { isActive } = schema.parse(await req.json());

    await prisma.$transaction([
      ...(isActive
        ? [
            prisma.surveyTemplate.updateMany({
              where: { hospitalId: template.hospitalId, id: { not: templateId } },
              data: { isActive: false },
            }),
          ]
        : []),
      prisma.surveyTemplate.update({ where: { id: templateId }, data: { isActive } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
