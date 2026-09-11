import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "staff_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export interface StaffSessionPayload {
  staffId: string;
  role: "DOCTOR" | "ADMIN";
  hospitalId: string;
}

function getSecret(): string {
  const secret = process.env.STAFF_JWT_SECRET;
  if (!secret) throw new Error("STAFF_JWT_SECRET is not configured");
  return secret;
}

export function signStaffSession(payload: StaffSessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: MAX_AGE_SECONDS });
}

export async function setStaffSessionCookie(payload: StaffSessionPayload) {
  const token = signStaffSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret()) as StaffSessionPayload;
  } catch {
    return null;
  }
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
