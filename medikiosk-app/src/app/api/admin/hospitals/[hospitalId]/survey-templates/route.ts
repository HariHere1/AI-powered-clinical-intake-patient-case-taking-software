import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertAdminOwnsHospital, requireStaff } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hospitalId: string }> }
) {
  try {
    const staff = await requireStaff("ADMIN");
    const { hospitalId } = await params;
    assertAdminOwnsHospital(staff.hospitalId, hospitalId);

    const templates = await prisma.surveyTemplate.findMany({
      where: { hospitalId },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

const schema = z.object({ name: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hospitalId: string }> }
) {
  try {
    const staff = await requireStaff("ADMIN");
    const { hospitalId } = await params;
    assertAdminOwnsHospital(staff.hospitalId, hospitalId);
    const { name } = schema.parse(await req.json());

    const template = await prisma.surveyTemplate.create({
      data: { hospitalId, name, createdByStaffId: staff.staffId, isActive: false },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return handleApiError(error);
  }
}
