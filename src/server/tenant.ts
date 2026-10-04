import { corsairClient } from "./corsair-client";

export function getTenantId(userId: string) {
  return `user_${userId}`;
}

export async function ensureCorsairTenant(userId: string) {
  const tenantId = getTenantId(userId);

  try {
    return await corsairClient.tenants.get(tenantId);
  } catch (error) {
    return corsairClient.tenants.create({
      id: tenantId,
    });
  }
}