import { corsair } from "@/server/corsair";
import { buildCorsairTools, type CorsairOperationTool } from "corsair";
import { tool, type ToolSet } from "ai";
import { READ_ONLY_OPERATIONS } from "./config";

/**
 * Builds AI SDK compatible tools backed by Corsair's buildCorsairTools for the authenticated tenant.
 * Guarantees that:
 * 1. ONLY READ_ONLY_OPERATIONS are exposed to the AI model.
 * 2. The tenantId is strictly bound from server-side session authentication.
 * 3. Execution logic, parameter validation, and token refresh are handled securely by Corsair.
 */
export function buildAgentTools(tenantId: string): ToolSet {
  const corsairTools: CorsairOperationTool[] = buildCorsairTools(corsair, {
    tenantId,
    operations: [...READ_ONLY_OPERATIONS],
  });

  const tools: ToolSet = {};

  for (const corsairTool of corsairTools) {
    tools[corsairTool.name] = tool({
      description:
        corsairTool.description || `Execute operation ${corsairTool.operation}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: corsairTool.schema as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => {
        try {
          const result = await corsairTool.execute(args || {});
          return result;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Operation execution failed";
          return { error: message };
        }
      },
    });
  }

  return tools;
}
