import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePatient, assertPatientOwnsSession } from "@/lib/authz";
import { transcribeAudio } from "@/lib/services/sttClient";
import { handleApiError } from "@/lib/apiError";

/**
 * Accepts either a JSON body { turnId, answerText } (typed/tapped answer)
 * or a multipart form (turnId, audio=<file>) which is transcribed via the
 * local STT service -- dual-mode input per the SIH problem statement.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { sessionId } = await params;
    const session = await assertPatientOwnsSession(patient.patientId, sessionId);

    const contentType = req.headers.get("content-type") ?? "";
    let turnId: string;
    let answerText: string;
    let answerAudioNote: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      turnId = String(form.get("turnId"));
      const audio = form.get("audio") as File | null;
      if (!audio) {
        return NextResponse.json({ error: "audio file is required" }, { status: 400 });
      }
      const transcription = await transcribeAudio(audio, audio.name || "answer.webm", session.languageCode);
      answerText = transcription.text;
      answerAudioNote = `transcribed (confidence ${transcription.confidence})`;
    } else {
      const body = await req.json();
      turnId = body.turnId;
      answerText = body.answerText;
    }

    if (!turnId || !answerText?.trim()) {
      return NextResponse.json({ error: "turnId and a non-empty answer are required" }, { status: 400 });
    }

    const turn = await prisma.conversationTurn.findUnique({ where: { id: turnId } });
    if (!turn || turn.sessionId !== sessionId) {
      return NextResponse.json({ error: "Turn not found for this session" }, { status: 404 });
    }

    const updated = await prisma.conversationTurn.update({
      where: { id: turnId },
      data: { answerText: answerText.trim() },
    });

    return NextResponse.json({ ok: true, turnId: updated.id, answerText: updated.answerText, note: answerAudioNote });
  } catch (error) {
    return handleApiError(error);
  }
}
