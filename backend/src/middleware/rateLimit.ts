import { Request, Response, NextFunction } from "express";
import { getRedis } from "./redisCache";

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 60;

function limit() {
  const configured = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LIMIT;
}

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const maximum = limit();
  const reset = Math.ceil(Date.now() / 1000) + WINDOW_SECONDS;
  res.setHeader("X-RateLimit-Limit", maximum);
  res.setHeader("X-RateLimit-Reset", reset);

  const redis = getRedis();
  if (!redis?.isOpen) {
    res.setHeader("X-RateLimit-Remaining", maximum);
    return next();
  }

  const key = `rate-limit:${req.ip}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    const remaining = Math.max(0, maximum - count);
    res.setHeader("X-RateLimit-Remaining", remaining);
    if (count > maximum) {
      return res.status(429).json({ error: "Too many requests" });
    }
  } catch {
    res.setHeader("X-RateLimit-Remaining", maximum);
  }

  next();
}