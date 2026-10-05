import { google } from "@ai-sdk/google";
import { DEFAULT_GEMINI_MODEL } from "./config";

export * from "./config";
export * from "./tools";
export * from "./action-security";
export * from "./executor";
export * from "./context-normalizer";

/**
 * Returns the configured Gemini LanguageModel instance.
 * Keeps model selection server-side only and configurable via GEMINI_MODEL env var.
 */
export function getAgentModel() {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  return google(modelName);
}
