import { prisma } from "@/lib/db";

/**
 * A kiosk is physically deployed at one hospital. Rather than asking a
 * walk-in patient to pick their hospital, the deployment is configured via
 * DEFAULT_HOSPITAL_CODE and every patient session uses that hospital's
 * active, hospital-configured survey template.
 */
export async function getDeploymentHospital() {
  const code = process.env.DEFAULT_HOSPITAL_CODE ?? "DEMO";
  const hospital = await prisma.hospital.findUnique({ where: { code } });
  if (!hospital) {
    throw new Error(`No hospital found with code "${code}" -- run the seed script`);
  }
  return hospital;
}

export async function getActiveSurveyTemplate(hospitalId: string) {
  const template = await prisma.surveyTemplate.findFirst({
    where: { hospitalId, isActive: true },
    include: { questions: { orderBy: { orderIndex: "asc" }, include: { translations: true } } },
  });
  if (!template) {
    throw new Error(`Hospital ${hospitalId} has no active survey template`);
  }
  return template;
}

export function resolveQuestionText(
  question: { promptText: string; translations: { languageCode: string; text: string }[] },
  languageCode: string
): string {
  return (
    question.translations.find((t) => t.languageCode === languageCode)?.text ?? question.promptText
  );
}
