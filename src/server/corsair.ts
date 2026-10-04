import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { client } from "@/db";
import dotenv from "dotenv";
dotenv.config();

export const corsair = createCorsair({
    plugins: [gmail(), googlecalendar()],
    database: client,
    kek: process.env.CORSAIR_KEK!,
    multiTenancy: true,


    hub: {
        projectApiKey: process.env.CORSAIR_API_KEY!,
        signingSecret: process.env.CORSAIR_SIGNING_SECRET!,
        oauthCallbackUrl: process.env.CORSAIR_HUB_OAUTH_CALLBACK_URL!,
    },
});