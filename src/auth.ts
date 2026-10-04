import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = profile.sub;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.googleId as string;
      }

      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
});