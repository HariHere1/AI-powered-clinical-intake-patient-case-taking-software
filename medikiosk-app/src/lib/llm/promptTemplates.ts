import type { ConversationTurnInput, FollowUpInput, SummarizeInput } from "./provider";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

function renderTurns(turns: ConversationTurnInput[]): string {
  return turns
    .map((t, i) => `${i + 1}. Q: ${t.questionText}\n   A: ${t.answerText}`)
    .join("\n");
}

/**
 * SOCRATES: Site, Onset, Character, Radiation, Associations, Timing,
 * Exacerbating/relieving factors, Severity -- standard symptom history
 * framework referenced in the SIH problem statement.
 */
export function buildFollowUpPrompt(input: FollowUpInput): {
  system: string;
  user: string;
} {
  const lang = languageName(input.languageCode);
  const socratesNote =
    input.followUpStrategy === "SOCRATES"
      ? `Use the SOCRATES framework (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating/relieving factors, Severity) to decide what is still missing and ask about exactly one missing element next.`
      : `Ask one clinically useful follow-up question that a physician would ask next, based on what the patient has said so far.`;

  const system = `You are a clinical intake assistant helping a physician gather a complete history from a patient before their consultation. You do not diagnose. You ask short, plain-language follow-up questions, one at a time, in ${lang}. ${socratesNote}

If the patient's answers describe a potential emergency (e.g. severe chest pain with breathlessness, signs of stroke, severe bleeding, loss of consciousness), set redFlag to true and briefly note why.

Respond ONLY with JSON of the shape: {"questionText": string, "askFollowUp": boolean, "redFlag": boolean, "redFlagReason": string | null}. Set askFollowUp to false once enough detail has been gathered (e.g. after covering the key SOCRATES elements) or if ${input.followUpsSoFar} has reached ${input.maxFollowUps}.`;

  const user = `Root question: "${input.rootQuestionText}" (code: ${input.rootQuestionCode})

Conversation so far:
${renderTurns(input.priorTurns)}

Follow-ups asked so far for this root question: ${input.followUpsSoFar} (max ${input.maxFollowUps}).`;

  return { system, user };
}

export function buildSummarizePrompt(input: SummarizeInput): {
  system: string;
  user: string;
} {
  const lang = languageName(input.languageCode);
  const system = `You are a clinical scribe. Convert a patient intake conversation (conducted in ${lang}) and any digitized prior documents into a structured clinical history in standard format. Write in clear clinical English regardless of the conversation's language, suitable for a physician to review in seconds. Do not invent facts not present in the input. This is a draft for the physician to edit -- never state a diagnosis.

Respond ONLY with JSON of the shape:
{"chiefComplaint": string, "hpi": string, "pastMedical": string, "drugAllergy": string, "family": string, "personal": string, "ros": string, "priorInvestigations": string}`;

  const documentsBlock = input.documentTexts.length
    ? input.documentTexts.map((d) => `[${d.docType}]\n${d.text}`).join("\n\n")
    : "(none uploaded)";

  const user = `Conversation:
${renderTurns(input.turns)}

Digitized prior documents:
${documentsBlock}`;

  return { system, user };
}
