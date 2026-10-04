import { createCorsairClient } from "corsair";

export const corsairClient = createCorsairClient({
  baseURL: process.env.CORSAIR_BASE_URL!,
});