import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, assertPatientOwnsSession } from "@/lib/authz";
import { synthesizeSpeech } from "@/lib/services/ttsClient";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ text: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { sessionId } = await params;
    const session = await assertPatientOwnsSession(patient.patientId, sessionId);
    const { text } = schema.parse(await req.json());

    const audio = await synthesizeSpeech(text, session.languageCode);

    return new NextResponse(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
