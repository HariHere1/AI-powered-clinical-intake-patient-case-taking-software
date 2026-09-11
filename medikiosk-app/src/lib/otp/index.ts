import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

function generateOtp(): string {
  const max = 10 ** OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Generates and stores an OTP for a phone number. There is no SMS provider
 * wired up yet (see .env.example MOCK_OTP) -- the caller decides whether to
 * surface the plaintext code back to the client (dev only) or hand it to a
 * real SMS provider once one exists.
 */
export async function createOtp(phone: string): Promise<string> {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { patientPhone: phone, codeHash, expiresAt },
  });

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const candidates = await prisma.otpCode.findMany({
    where: { patientPhone: phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(code, candidate.codeHash)) {
      await prisma.otpCode.update({
        where: { id: candidate.id },
        data: { consumedAt: new Date() },
      });
      return true;
    }
  }

  return false;
}

export function isMockOtpEnabled(): boolean {
  return process.env.MOCK_OTP !== "false";
}
