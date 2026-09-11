import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.hospital.upsert({
    where: { code: "DEMO" },
    update: {},
    create: { code: "DEMO", name: "MediKiosk Demo Hospital", address: "Demo Address" },
  });

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.staffUser.upsert({
    where: { email: "admin@demo-hospital.org" },
    update: {},
    create: {
      hospitalId: hospital.id,
      role: "ADMIN",
      email: "admin@demo-hospital.org",
      passwordHash: adminPasswordHash,
      fullName: "Demo Admin",
    },
  });

  const doctorPasswordHash = await bcrypt.hash("doctor123", 10);
  await prisma.staffUser.upsert({
    where: { email: "doctor@demo-hospital.org" },
    update: {},
    create: {
      hospitalId: hospital.id,
      role: "DOCTOR",
      email: "doctor@demo-hospital.org",
      passwordHash: doctorPasswordHash,
      fullName: "Dr. Demo",
    },
  });

  const existingActive = await prisma.surveyTemplate.findFirst({
    where: { hospitalId: hospital.id, isActive: true },
  });

  if (!existingActive) {
    const template = await prisma.surveyTemplate.create({
      data: {
        hospitalId: hospital.id,
        name: "General OPD Intake",
        isActive: true,
        questions: {
          create: [
            {
              orderIndex: 1,
              code: "chief_complaint",
              promptText: "What is the main problem that brought you here today?",
              inputType: "VOICE_TEXT",
              followUpStrategy: "SOCRATES",
              translations: {
                create: [{ languageCode: "hi", text: "आज आप यहाँ किस मुख्य समस्या के लिए आए हैं?" }],
              },
            },
            {
              orderIndex: 2,
              code: "past_medical_history",
              promptText: "Do you have any ongoing illnesses, such as diabetes, high blood pressure, or heart disease?",
              inputType: "VOICE_TEXT",
              followUpStrategy: "LLM_ADAPTIVE",
              translations: {
                create: [
                  {
                    languageCode: "hi",
                    text: "क्या आपको कोई चल रही बीमारी है, जैसे मधुमेह, उच्च रक्तचाप, या हृदय रोग?",
                  },
                ],
              },
            },
            {
              orderIndex: 3,
              code: "drug_allergy_history",
              promptText: "Are you currently taking any medicines, and do you have any known allergies?",
              inputType: "VOICE_TEXT",
              followUpStrategy: "NONE",
              translations: {
                create: [
                  {
                    languageCode: "hi",
                    text: "क्या आप वर्तमान में कोई दवा ले रहे हैं, और क्या आपको कोई ज्ञात एलर्जी है?",
                  },
                ],
              },
            },
            {
              orderIndex: 4,
              code: "family_history",
              promptText: "Does anyone in your immediate family have a major illness?",
              inputType: "VOICE_TEXT",
              followUpStrategy: "NONE",
              translations: {
                create: [
                  { languageCode: "hi", text: "क्या आपके निकटतम परिवार में किसी को कोई बड़ी बीमारी है?" },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`Created default survey template ${template.id}`);
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@demo-hospital.org / admin123");
  console.log("Doctor login: doctor@demo-hospital.org / doctor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
