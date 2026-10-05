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
import { NextResponse } from "next/server";

export const maxDuration = 60;

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
  try {
    // 1. Authenticate user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    // 2. Validate request payload
    let body: { messages?: UIMessage[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request." },
        { status: 400 },
      );
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'messages' must be a non-empty array." },
        { status: 400 },
      );
    }

    // Bound message count to prevent denial of service
    if (messages.length > 50) {
      return NextResponse.json(
        { error: "Payload too large: maximum 50 messages allowed per request." },
        { status: 400 },
      );
    }

    // Basic sanitization & length limits on message contents
    for (const msg of messages) {
      if (
        !msg ||
        typeof msg !== "object" ||
        !["user", "assistant", "system"].includes(msg.role)
      ) {
        return NextResponse.json(
          { error: "Invalid message format in conversation history." },
          { status: 400 },
        );
      }
    }

    // 3. Verify Gemini API key configuration
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API key (GOOGLE_GENERATIVE_AI_API_KEY) is not configured on the server.",
        },
        { status: 500 },
      );
    }

    // 4. Derive tenantId strictly from authenticated session
    const tenantId = getTenantId(session.user.id);

    // 5. Build tools scoped to this tenant and authenticated user
    const tools = buildAgentTools(tenantId, session.user.id);

    // 6. Apply bounded context window to maintain recent conversational memory safely
    const contextMessages = getBoundedMessageWindow(messages, 30);

    // 7. Convert messages to AI SDK model message representation
    const modelMessages = await convertToModelMessages(contextMessages);

    // 8. Execute streaming language model generation with tool calling
    const result = streamText({
      model: getAgentModel(),
      system: getSystemPrompt(),
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(MAX_AGENT_STEPS),
      onFinish: ({ finishReason, usage }) => {
        const durationMs = Date.now() - startTime;
        console.log(
          `[ChatAPI] Completed turn. FinishReason: ${finishReason}, Duration: ${durationMs}ms, InputTokens: ${usage?.inputTokens ?? "N/A"}, OutputTokens: ${usage?.outputTokens ?? "N/A"}`,
        );
      },
    });

    // 9. Stream the UI message response back to the client
    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal chat processing error";
    const durationMs = Date.now() - startTime;
    console.error(`[ChatAPI] Error processing request (${durationMs}ms):`, message);

    return NextResponse.json(
      { error: "An error occurred while communicating with the AI assistant." },
      { status: 500 },
    );
  }
}
