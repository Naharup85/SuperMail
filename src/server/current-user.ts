import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);

  return user ?? null;
}