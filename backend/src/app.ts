import express from "express";
import { connectRedis } from "./middleware/redisCache";
import healthRoutes from "./routes/health";
import proposalRoutes from "./routes/proposals";

const app = express();
app.use(express.json());

// Health and readiness probes — mounted BEFORE rate-limiting and auth so
// load balancers and orchestrators can always reach them without credentials.
app.use("/", healthRoutes);

app.use("/api", proposalRoutes);

const PORT = process.env.PORT ?? 3001;

connectRedis().then(() => {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
});

export default app;
