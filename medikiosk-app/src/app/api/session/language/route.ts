import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPatientSession } from "@/lib/auth/patientSession";
import { LOCALE_COOKIE, isSupportedLocale } from "@/i18n/routing";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ languageCode: z.string() });

/**
 * Sets the site-wide locale cookie (drives the entire UI, not just survey
 * content) and, once a patient is authenticated, persists the preference on
 * their record too.
 */
export async function POST(req: NextRequest) {
  try {
    const { languageCode } = schema.parse(await req.json());
    if (!isSupportedLocale(languageCode)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, languageCode, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    const patientSession = await getPatientSession();
    if (patientSession) {
      await prisma.patient.update({
        where: { id: patientSession.patientId },
        data: { preferredLanguage: languageCode },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
