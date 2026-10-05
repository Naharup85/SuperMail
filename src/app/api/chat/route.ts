import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import {
  buildAgentTools,
  getAgentModel,
  getSystemPrompt,
  MAX_AGENT_STEPS,
} from "@/server/agent";
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { rateLimiter, RATE_LIMIT_PRESETS, getRateLimitHeaders } from "@/server/rate-limit";
import { AppLogger } from "@/server/logger";
import { createApiErrorResponse } from "@/server/errors";


export const maxDuration = 60;

const MAX_MESSAGES_COUNT = 50;
const CHAT_EXECUTION_TIMEOUT_MS = 45000; // 45 seconds


/**
 * Bounds the conversation message history to recent turns while maintaining
 * coherent role boundaries and valid tool call/response pairs.
 */
function getBoundedMessageWindow(messages: UIMessage[], maxCount = 30): UIMessage[] {
  if (messages.length <= maxCount) {
    return messages;
  }

  let sliceIndex = messages.length - maxCount;

  // Align start to a user message so the prompt context starts with a clean turn
  while (sliceIndex < messages.length && messages[sliceIndex].role !== "user") {
    sliceIndex++;
  }

  if (sliceIndex >= messages.length) {
    sliceIndex = messages.length - maxCount;
  }

  return messages.slice(sliceIndex);
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = AppLogger.generateRequestId();

  try {
    // 1. Authenticate user session
    const session = await auth();
    if (!session?.user?.id) {
      return createApiErrorResponse("Unauthorized. Please sign in.", null, {
        status: 401,
        code: "UNAUTHORIZED",
        requestId,
      });
    }

    const userId = session.user.id;
    const tenantId = getTenantId(userId);

    // 2. Enforce user-scoped rate limiting
    const rlResult = rateLimiter.check(`chat_${userId}`, RATE_LIMIT_PRESETS.chat);
    if (!rlResult.success) {
      AppLogger.warn("Chat rate limit exceeded.", { requestId, userId });
      return createApiErrorResponse(
        "You have sent too many requests. Please wait before asking again.",
        null,
        {
          status: 429,
          code: "RATE_LIMITED",
          requestId,
          headers: getRateLimitHeaders(rlResult),
        },
      );
    }

    // 3. Validate request payload structure
    let body: { messages?: UIMessage[] };
    try {
      body = await req.json();
    } catch {
      return createApiErrorResponse("Invalid JSON payload in request.", null, {
        status: 400,
        code: "INVALID_JSON",
        requestId,
      });
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return createApiErrorResponse(
        "Invalid request: 'messages' must be a non-empty array.",
        null,
        {
          status: 400,
          code: "VALIDATION_ERROR",
          requestId,
        },
      );
    }

    // Enforce message count limit
    if (messages.length > MAX_MESSAGES_COUNT) {
      return createApiErrorResponse(
        `Payload too large: maximum ${MAX_MESSAGES_COUNT} messages allowed per request.`,
        null,
        {
          status: 400,
          code: "PAYLOAD_TOO_LARGE",
          requestId,
        },
      );
    }

    // Validate each message structure
    for (const msg of messages) {
      if (
        !msg ||
        typeof msg !== "object" ||
        !["user", "assistant", "system"].includes(msg.role)
      ) {
        return createApiErrorResponse(
          "Invalid message format in conversation history.",
          null,
          {
            status: 400,
            code: "VALIDATION_ERROR",
            requestId,
          },
        );
      }
    }

    // 4. Verify Gemini API key configuration
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return createApiErrorResponse(
        "Google Gemini API key is not configured on the server.",
        null,
        {
          status: 500,
          code: "CONFIG_ERROR",
          requestId,
        },
      );
    }


    // 5. Build tools scoped to this tenant and authenticated user
    const tools = buildAgentTools(tenantId, userId);

    // 6. Apply bounded context window for recent conversational memory
    const contextMessages = getBoundedMessageWindow(messages, 30);

    // 7. Convert messages to AI SDK model message representation
    const modelMessages = await convertToModelMessages(contextMessages);

    // 8. Setup execution timeout with AbortController
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), CHAT_EXECUTION_TIMEOUT_MS);

    // 9. Execute streaming language model generation with tool calling
    const result = streamText({
      model: getAgentModel(),
      system: getSystemPrompt(),
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(MAX_AGENT_STEPS),
      abortSignal: abortController.signal,
      onFinish: ({ finishReason, usage }) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        AppLogger.info("Chat generation completed.", {
          requestId,
          userId,
          durationMs,
          finishReason,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
        });
      },
    });

    // 10. Stream UI message response back to the client with rate limit headers
    const streamResponse = result.toUIMessageStreamResponse();
    const rateHeaders = getRateLimitHeaders(rlResult);
    for (const [key, value] of Object.entries(rateHeaders)) {
      streamResponse.headers.set(key, value);
    }
    streamResponse.headers.set("X-Request-Id", requestId);

    return streamResponse;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    AppLogger.error("Chat generation failed.", error, { requestId, durationMs });
    return createApiErrorResponse("An error occurred while processing your request.", error, {
      status: 500,
      requestId,
    });
  }

}

