import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";

type RequestContext = { traceId: string };

const requestContext = new AsyncLocalStorage<RequestContext>();
const levels = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof levels)[number];

function configuredLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  return levels.includes(level as LogLevel) ? (level as LogLevel) : "info";
}

function shouldLog(level: LogLevel) {
  return levels.indexOf(level) <= levels.indexOf(configuredLevel());
}

export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}) {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId: requestContext.getStore()?.traceId,
    ...fields,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export function requestTracing(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("X-Request-Id");
  const traceId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader("X-Request-Id", traceId);
  requestContext.run({ traceId }, next);
}