import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const databaseUrl = process.env.DATABASE_URL;

// Safe PostgreSQL client configuration with pooling, timeout boundaries, and SSL support
export const client = postgres(databaseUrl!, {
  max: 10, // Max connection pool size
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout 10 seconds
  ssl: databaseUrl?.includes("localhost") || databaseUrl?.includes("127.0.0.1") ? false : "prefer",
  onnotice: () => {}, // Suppress noisy notices in logs
});

export const db = drizzle(client);
