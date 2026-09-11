import type { LlmProvider } from "./provider";
import { GroqProvider } from "./groqProvider";

let provider: LlmProvider | null = null;

/**
 * Provider is selected via LLM_PROVIDER env var. Only "groq" is implemented
 * today, but any OpenAI-compatible provider (including real OpenAI) can
 * reuse GroqProvider's client by pointing GROQ_BASE_URL/GROQ_API_KEY at it --
 * add a branch here if a genuinely different API shape is needed later.
 */
export function getLlmProvider(): LlmProvider {
  if (!provider) {
    const name = process.env.LLM_PROVIDER ?? "groq";
    switch (name) {
      case "groq":
      default:
        provider = new GroqProvider();
    }
  }
  return provider;
}

export * from "./provider";
