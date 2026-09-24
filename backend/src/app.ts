import express from "express";
import path from "path";
import { connectRedis } from "./middleware/redisCache";
import proposalRoutes from "./routes/proposals";

const app = express();
app.use(express.json());
app.use("/api", proposalRoutes);

// ── Swagger UI (development only) ─────────────────────────────────────────────
// Start the server with ENABLE_SWAGGER=true to mount the Swagger UI at /docs.
// The UI is powered by swagger-ui-express and reads the canonical openapi.yml.
if (process.env.ENABLE_SWAGGER === "true") {
  // Dynamic require so the dependency is optional in production images.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const swaggerUi = require("swagger-ui-express") as typeof import("swagger-ui-express");
  const YAML = require("js-yaml") as typeof import("js-yaml");
  const fs = require("fs") as typeof import("fs");
  /* eslint-enable @typescript-eslint/no-var-requires */

  const openapiPath = path.resolve(__dirname, "../../api/openapi.yml");
  const swaggerDocument = YAML.load(fs.readFileSync(openapiPath, "utf8")) as Record<string, unknown>;

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("[swagger] UI available at /docs");
}

const PORT = process.env.PORT ?? 3001;

connectRedis().then(() => {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
});

export default app;
