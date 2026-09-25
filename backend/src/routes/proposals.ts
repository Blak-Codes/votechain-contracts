/**
 * Proposal routes with Redis caching applied.
 * Replace the stub handlers with real Stellar RPC / indexer calls.
 */

import { Router, Request, Response } from "express";
import {
  cacheProposalList,
  cacheProposalItem,
  getCacheMetrics,
  invalidateProposalCache,
} from "../middleware/redisCache";

const router = Router();

const VALID_STATES = new Set(["active", "passed", "rejected", "executed", "cancelled"]);

// GET /proposals — cached 30 s
router.get("/proposals", cacheProposalList, async (req: Request, res: Response) => {
  // TODO: fetch from Stellar RPC / indexer
  const proposals: unknown[] = [];
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10),
  );
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  if (state && !VALID_STATES.has(state)) {
    return res.status(400).json({ error: "Invalid proposal state" });
  }

  const after = typeof req.query.after === "string" ? req.query.after : undefined;
  const offset = (page - 1) * limit;
  const data = proposals.slice(offset, offset + limit);
  res.json({
    data,
    pagination: {
      page,
      limit,
      total: proposals.length,
      hasMore: offset + data.length < proposals.length,
      ...(after ? { after } : {}),
      ...(state ? { state } : {}),
    },
  });
});

// GET /proposals/:id — cached 10 s
router.get("/proposals/:id", cacheProposalItem, async (req: Request, res: Response) => {
  const { id } = req.params;
  // TODO: fetch single proposal from Stellar RPC / indexer
  res.json({ id });
});

// POST /proposals/invalidate — called by the event indexer on new on-chain events
router.post("/proposals/invalidate", async (req: Request, res: Response) => {
  const { id } = req.body as { id?: string };
  await invalidateProposalCache(id);
  res.json({ ok: true, invalidated: id ?? "list" });
});

// GET /metrics/cache — exposes hit/miss counters
router.get("/metrics/cache", (_req: Request, res: Response) => {
  res.json(getCacheMetrics());
});

export default router;
