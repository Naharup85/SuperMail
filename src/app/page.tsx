import { auth, signIn, signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";

export default async function HomePage() {
  const session = await auth();

  async function handleSignIn() {
    "use server";
    await signIn("google");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  if (!session?.user) {
    return <Landing signInAction={handleSignIn} />;
  }

  return <AppShell user={session.user} signOutAction={handleSignOut} />;
}
