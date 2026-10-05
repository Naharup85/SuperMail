import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listRunsForAutomation } from "@/server/automations/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  try {
    const runs = await listRunsForAutomation(id, session.user.id, limit);
    return NextResponse.json({ runs });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch runs";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
