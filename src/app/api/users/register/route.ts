import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email } = body;

    const userId = crypto.randomUUID();
    const corsairTenantId = `user_${userId}`;

    const [user] = await db.insert(users).values({ id: userId, name, email, corsairTenantId }).returning();

    return Response.json({ success: true, user });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, error: "Failed to register user" }, { status: 500 });
  }
}