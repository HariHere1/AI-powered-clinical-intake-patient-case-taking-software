import type {
  FollowUpInput,
  FollowUpResult,
  LlmProvider,
  StructuredReportContent,
  SummarizeInput,
} from "./provider";
import { buildFollowUpPrompt, buildSummarizePrompt } from "./promptTemplates";

/**
 * Talks to any OpenAI-compatible chat completions endpoint. Groq's API is
 * OpenAI-compatible, so this same client works for Groq today and for a
 * real OpenAI account (or any other OpenAI-compatible provider) later just
 * by changing GROQ_BASE_URL / GROQ_API_KEY / GROQ_MODEL.
 */
async function chatJson(system: string, user: string): Promise<Record<string, unknown>> {
  const baseUrl = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM response missing content");
  return JSON.parse(content);
}

export class GroqProvider implements LlmProvider {
  async generateFollowUp(input: FollowUpInput): Promise<FollowUpResult | null> {
    if (input.followUpsSoFar >= input.maxFollowUps) return null;

    const { system, user } = buildFollowUpPrompt(input);
    const result = await chatJson(system, user);

    if (!result.askFollowUp) return null;

    return {
      questionText: String(result.questionText ?? ""),
      redFlag: Boolean(result.redFlag),
      redFlagReason: result.redFlagReason ? String(result.redFlagReason) : undefined,
    };
  }

  async summarizeSession(input: SummarizeInput): Promise<StructuredReportContent> {
    const { system, user } = buildSummarizePrompt(input);
    const result = await chatJson(system, user);

    return {
      chiefComplaint: String(result.chiefComplaint ?? ""),
      hpi: String(result.hpi ?? ""),
      pastMedical: String(result.pastMedical ?? ""),
      drugAllergy: String(result.drugAllergy ?? ""),
      family: String(result.family ?? ""),
      personal: String(result.personal ?? ""),
      ros: String(result.ros ?? ""),
      priorInvestigations: String(result.priorInvestigations ?? ""),
    };
  }
}
