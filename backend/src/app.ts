import express from "express";
import { connectRedis } from "./middleware/redisCache";
import proposalRoutes from "./routes/proposals";

// ---------------------------------------------------------------------------
// Environment variable validation
// ---------------------------------------------------------------------------
// Validates required env vars at startup so the process fails fast with a
// clear diagnostic instead of a cryptic runtime panic later.

interface EnvConfig {
  PORT: string;
  REDIS_URL: string;
}

function validateEnv(): EnvConfig {
  const required: Array<keyof EnvConfig> = ["REDIS_URL"];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      "[startup] Missing required environment variables:\n" +
        missing.map((k) => `  • ${k}`).join("\n") +
        "\n\nSet these variables before starting the server. " +
        "See .env.example for reference."
    );
    process.exit(1);
  }

  return {
    PORT: process.env.PORT ?? "3001",
    REDIS_URL: process.env.REDIS_URL!,
  };
}

const env = validateEnv();

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use("/api", proposalRoutes);

const PORT = env.PORT;

connectRedis(env.REDIS_URL).then(() => {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
});

export default app;
