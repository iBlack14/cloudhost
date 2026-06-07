import { Pool } from "pg";
import { env } from "./env.js";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 25,                      // max concurrent connections
  idleTimeoutMillis: 30_000,    // release idle connections after 30s
  connectionTimeoutMillis: 5_000, // fail fast if pool is exhausted
  statement_timeout: 15_000,    // kill runaway queries after 15s
});

// Log pool errors so they don't silently crash the process
db.on("error", (err) => {
  console.error("[pg:pool:error]", err.message);
});
