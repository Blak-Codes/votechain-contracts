import express from "express";
import { connectRedis } from "./middleware/redisCache";
import { rateLimit } from "./middleware/rateLimit";
import proposalRoutes from "./routes/proposals";

const app = express();
app.use(express.json());
app.use(rateLimit);
app.use("/api", proposalRoutes);

const PORT = process.env.PORT ?? 3001;

connectRedis().then(() => {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
});

export default app;
