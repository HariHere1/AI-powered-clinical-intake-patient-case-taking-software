import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "patient_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export interface PatientSessionPayload {
  patientId: string;
  phone: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export function signPatientSession(payload: PatientSessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: MAX_AGE_SECONDS });
}

export async function setPatientSessionCookie(payload: PatientSessionPayload) {
  const token = signPatientSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getPatientSession(): Promise<PatientSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret()) as PatientSessionPayload;
  } catch {
    return null;
  }
}

export async function clearPatientSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
