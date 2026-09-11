import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/authz";
import { getDeploymentHospital, getActiveSurveyTemplate } from "@/lib/hospital";
import { LOCALE_COOKIE, DEFAULT_LOCALE } from "@/i18n/routing";
import { cookies } from "next/headers";
import { handleApiError } from "@/lib/apiError";

export async function POST() {
  try {
    const patientSession = await requirePatient();
    const cookieStore = await cookies();
    const languageCode = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE;

    const hospital = await getDeploymentHospital();
    const template = await getActiveSurveyTemplate(hospital.id);

    const consent = await prisma.consentRecord.findFirst({
      where: { patientId: patientSession.patientId, revokedAt: null, sessionId: null },
      orderBy: { grantedAt: "desc" },
    });
    if (!consent) {
      return NextResponse.json({ error: "Consent required before starting" }, { status: 403 });
    }

    const session = await prisma.intakeSession.create({
      data: {
        patientId: patientSession.patientId,
        hospitalId: hospital.id,
        surveyTemplateId: template.id,
        languageCode,
      },
    });

    await prisma.consentRecord.update({
      where: { id: consent.id },
      data: { sessionId: session.id },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    return handleApiError(error);
  }
}
