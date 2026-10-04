import { corsair } from "./corsair";

export async function listCalendarEvents(
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
) {
  const { limit = 20, offset = 0 } = options;

  return corsair.withTenant(tenantId).googlecalendar.db.events.search({
    limit,
    offset,
  });
}