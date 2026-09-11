import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePatient, assertPatientOwnsSession } from "@/lib/authz";
import { resolveQuestionText } from "@/lib/hospital";
import { getLlmProvider } from "@/lib/llm";
import { writeAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

const MAX_FOLLOW_UPS = 3;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const patient = await requirePatient();
    const { sessionId } = await params;
    const session = await assertPatientOwnsSession(patient.patientId, sessionId);

    const template = await prisma.surveyTemplate.findUniqueOrThrow({
      where: { id: session.surveyTemplateId },
      include: { questions: { orderBy: { orderIndex: "asc" }, include: { translations: true } } },
    });

    const turns = await prisma.conversationTurn.findMany({
      where: { sessionId },
      orderBy: { sequenceNo: "asc" },
    });

    const lastTurn = turns.at(-1);

    // First question of the whole session.
    if (!lastTurn) {
      const firstQuestion = template.questions[0];
      if (!firstQuestion) {
        return NextResponse.json({ sessionComplete: true });
      }
      const turn = await prisma.conversationTurn.create({
        data: {
          sessionId,
          sequenceNo: 1,
          questionId: firstQuestion.id,
          questionTextShown: resolveQuestionText(firstQuestion, session.languageCode),
          isFollowUp: false,
        },
      });
      return NextResponse.json({
        turnId: turn.id,
        questionText: turn.questionTextShown,
        isFollowUp: false,
        redFlag: false,
        sessionComplete: false,
      });
    }

    // Client should answer before asking for the next question again.
    if (!lastTurn.answerText) {
      return NextResponse.json({
        turnId: lastTurn.id,
        questionText: lastTurn.questionTextShown,
        isFollowUp: lastTurn.isFollowUp,
        redFlag: lastTurn.redFlag,
        sessionComplete: false,
      });
    }

    const rootTurn = lastTurn.isFollowUp
      ? turns.find((t) => t.id === lastTurn.parentTurnId) ?? lastTurn
      : lastTurn;

    const rootQuestion = rootTurn.questionId
      ? template.questions.find((q) => q.id === rootTurn.questionId)
      : undefined;

    const chain = turns.filter((t) => t.id === rootTurn.id || t.parentTurnId === rootTurn.id);
    const followUpsSoFar = chain.filter((t) => t.isFollowUp).length;

    if (rootQuestion && rootQuestion.followUpStrategy !== "NONE" && followUpsSoFar < MAX_FOLLOW_UPS) {
      const followUp = await getLlmProvider().generateFollowUp({
        languageCode: session.languageCode,
        rootQuestionText: rootQuestion.promptText,
        rootQuestionCode: rootQuestion.code,
        followUpStrategy: rootQuestion.followUpStrategy as "LLM_ADAPTIVE" | "SOCRATES",
        priorTurns: chain.map((t) => ({
          questionText: t.questionTextShown,
          answerText: t.answerText ?? "",
          isFollowUp: t.isFollowUp,
        })),
        followUpsSoFar,
        maxFollowUps: MAX_FOLLOW_UPS,
      });

      await writeAuditLog({
        actorType: "SYSTEM",
        eventType: "llm_follow_up_generated",
        entityType: "ConversationTurn",
        entityId: rootTurn.id,
        metadata: { followUp },
      });

      if (followUp) {
        const turn = await prisma.conversationTurn.create({
          data: {
            sessionId,
            sequenceNo: turns.length + 1,
            questionId: null,
            questionTextShown: followUp.questionText,
            isFollowUp: true,
            parentTurnId: rootTurn.id,
            redFlag: followUp.redFlag,
          },
        });

        if (followUp.redFlag) {
          await writeAuditLog({
            actorType: "SYSTEM",
            eventType: "red_flag_raised",
            entityType: "IntakeSession",
            entityId: sessionId,
            metadata: { reason: followUp.redFlagReason },
          });
        }

        return NextResponse.json({
          turnId: turn.id,
          questionText: turn.questionTextShown,
          isFollowUp: true,
          redFlag: turn.redFlag,
          sessionComplete: false,
        });
      }
    }

    // Move to the next root-level question.
    const currentIndex = rootQuestion
      ? template.questions.findIndex((q) => q.id === rootQuestion.id)
      : -1;
    const nextQuestion = template.questions[currentIndex + 1];

    if (!nextQuestion) {
      await prisma.intakeSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return NextResponse.json({ sessionComplete: true });
    }

    const turn = await prisma.conversationTurn.create({
      data: {
        sessionId,
        sequenceNo: turns.length + 1,
        questionId: nextQuestion.id,
        questionTextShown: resolveQuestionText(nextQuestion, session.languageCode),
        isFollowUp: false,
      },
    });

    return NextResponse.json({
      turnId: turn.id,
      questionText: turn.questionTextShown,
      isFollowUp: false,
      redFlag: false,
      sessionComplete: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
