import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { client } from "@/db";

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: client,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true,
});