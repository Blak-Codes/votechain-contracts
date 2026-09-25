import express from "express";
import { connectRedis } from "./middleware/redisCache";
import proposalRoutes from "./routes/proposals";
import {
  notFoundHandler,
  globalErrorHandler,
} from "./middleware/errorHandler";

const app = express();
app.use(express.json());
app.use("/api", proposalRoutes);

// Catch unmatched routes — must come after all real route registrations.
app.use(notFoundHandler);

// Global error handler — must be the very last middleware registered.
app.use(globalErrorHandler);

const PORT = process.env.PORT ?? 3001;

connectRedis().then(() => {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
});

export default app;
