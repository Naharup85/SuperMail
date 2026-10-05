import { signIn } from "@/auth";

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || "/";
  await signIn("google", { redirectTo: callbackUrl });
}
