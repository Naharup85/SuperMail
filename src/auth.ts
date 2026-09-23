import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !profile?.sub || !user.email) {
        return false;
      }

      const googleId = profile.sub;

      const existingUser = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

      if (existingUser.length === 0) {
        const userId = crypto.randomUUID();
        const corsairTenantId = `user_${userId}`;

        await db.insert(users).values({id: userId, googleId, email: user.email, name: user.name ?? null, corsairTenantId});
      }

      return true;
    },
  },
});
