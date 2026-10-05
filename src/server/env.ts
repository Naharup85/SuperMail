import { z } from "zod";

/**
 * Server-side environment schema.
 * Validates all required environment variables at runtime on the server.
 * Never leaks secret values to client bundles or error messages.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORSAIR_KEK: z.string().min(1, "CORSAIR_KEK is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  CORSAIR_BASE_URL: z.string().url("CORSAIR_BASE_URL must be a valid URL").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional(),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters in production").optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_MODEL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let validatedEnv: ServerEnv | null = null;

/**
 * Validates environment variables safely.
 * Returns validated env object or throws a sanitized error describing missing keys without exposing values.
 */
export function validateEnv(customEnv?: Record<string, string | undefined>): ServerEnv {
  const envToValidate = customEnv || process.env;
  const result = serverEnvSchema.safeParse(envToValidate);

  if (!result.success) {
    const missingOrInvalid = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    // In production or test, enforce strictness
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[CRITICAL] Server environment validation failed: ${missingOrInvalid}`);
    } else {
      console.warn(`[WARN] Server environment warning: ${missingOrInvalid}`);
    }
    // Return partially parsed for dev fallback if non-prod
    return (result.data || envToValidate) as unknown as ServerEnv;
  }

  validatedEnv = result.data;
  return validatedEnv;
}

/**
 * Retrieves a validated environment variable safely.
 */
export function getServerEnv(): ServerEnv {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
