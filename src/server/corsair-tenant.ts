import { getCurrentUser } from "@/server/current-user";

export async function getCurrentCorsairTenant() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.corsairTenantId;
}