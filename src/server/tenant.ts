import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCorsairTenantId(userId: string) {
  const user = await db.select({corsairTenantId: users.corsairTenantId,}).from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]?.corsairTenantId) {
    throw new Error("Corsair tenant not found for user");
  }

  return user[0].corsairTenantId;
}