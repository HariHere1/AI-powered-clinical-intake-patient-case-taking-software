import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertAdminOwnsHospital, requireStaff } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  code: z.string().min(1),
  promptText: z.string().min(1),
  inputType: z.enum(["VOICE_TEXT", "CHOICE", "SCALE"]).default("VOICE_TEXT"),
  isRequired: z.boolean().default(true),
  followUpStrategy: z.enum(["NONE", "LLM_ADAPTIVE", "SOCRATES"]).default("NONE"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const staff = await requireStaff("ADMIN");
    const { templateId } = await params;
    const template = await prisma.surveyTemplate.findUniqueOrThrow({ where: { id: templateId } });
    assertAdminOwnsHospital(staff.hospitalId, template.hospitalId);

    const body = schema.parse(await req.json());
    const lastQuestion = await prisma.surveyQuestion.findFirst({
      where: { templateId },
      orderBy: { orderIndex: "desc" },
    });

    const question = await prisma.surveyQuestion.create({
      data: {
        templateId,
        orderIndex: (lastQuestion?.orderIndex ?? 0) + 1,
        code: body.code,
        promptText: body.promptText,
        inputType: body.inputType,
        isRequired: body.isRequired,
        followUpStrategy: body.followUpStrategy,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    return handleApiError(error);
  }
}
