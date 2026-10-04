import { corsair } from "./corsair";

export async function listGmailMessages(
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
) {
  const { limit = 20, offset = 0 } = options;

  return corsair.withTenant(tenantId).gmail.db.messages.search({
    limit,
    offset,
  });
}
