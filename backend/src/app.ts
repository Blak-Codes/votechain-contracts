import express from "express";
import { connectRedis } from "./middleware/redisCache";
import proposalRoutes from "./routes/proposals";

const app = express();
app.use(express.json());
app.use("/api", proposalRoutes);

const PORT = process.env.PORT ?? 3001;

export async function startServer() {
  await connectRedis();
  return app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

if (require.main === module) {
  startServer();
}

export default app;
