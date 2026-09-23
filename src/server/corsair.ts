import "dotenv/config";

import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { client } from "@/db";

export const corsair = createCorsair({
  plugins: [
    gmail(),
    googlecalendar(),
  ],

  database: client,

  kek: process.env.CORSAIR_KEK!,

  hub: {
    projectApiKey: process.env.CORSAIR_API_KEY!,
    signingSecret: process.env.CORSAIR_SIGNING_SECRET!,
  },

  multiTenancy: true,
});