import { NextResponse } from "next/server";
import { corsair } from "@/server/corsair";
import { getCurrentCorsairTenant } from "@/server/corsair-tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await getCurrentCorsairTenant();

    const { searchParams } = new URL(request.url);
    const plugin = searchParams.get("plugin");

    if (plugin !== "gmail" && plugin !== "googlecalendar") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid integration",
        },
        { status: 400 }
      );
    }

    const { connectUrl } = await corsair.manage.connect.createLink({
      plugin,
      tenantId,
    });

    return NextResponse.json({
      success: true,
      connectUrl,
    });
  } catch (error) {
    console.error("Integration connect error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}