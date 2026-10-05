import { signOut } from "@/auth";

export default async function SignOutPage() {
  await signOut({ redirectTo: "/" });
}
