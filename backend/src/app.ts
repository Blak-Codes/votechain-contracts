import express from "express";
import { connectRedis } from "./middleware/redisCache";
import { requestTracing, log } from "./middleware/requestTracing";
import proposalRoutes from "./routes/proposals";

const app = express();
app.use(requestTracing);
app.use(express.json());
app.use("/api", proposalRoutes);

const PORT = process.env.PORT ?? 3001;

connectRedis().then(() => {
  app.listen(PORT, () => log("info", "server listening", { port: PORT }));
});

export default app;
