/**
 * Proposal routes with Redis caching and zod request validation applied.
 * Replace the stub handlers with real Stellar RPC / indexer calls.
 */

import { Router, Request, Response } from "express";
import {
  cacheProposalList,
  cacheProposalItem,
  getCacheMetrics,
  invalidateProposalCache,
} from "../middleware/redisCache";
import {
  validateBody,
  createProposalSchema,
  castVoteSchema,
  type CreateProposalBody,
  type CastVoteBody,
} from "../middleware/validation";

const router = Router();

// GET /proposals — cached 30 s
router.get("/proposals", cacheProposalList, async (_req: Request, res: Response) => {
  // TODO: fetch from Stellar RPC / indexer
  const proposals: unknown[] = [];
  res.json(proposals);
});

// GET /proposals/:id — cached 10 s
router.get("/proposals/:id", cacheProposalItem, async (req: Request, res: Response) => {
  const { id } = req.params;
  // TODO: fetch single proposal from Stellar RPC / indexer
  res.json({ id });
});

// POST /proposals — validated, then forwarded to Stellar RPC / indexer
router.post(
  "/proposals",
  validateBody(createProposalSchema),
  async (req: Request, res: Response) => {
    const body = req.body as CreateProposalBody;
    // TODO: call Stellar RPC to create proposal on-chain
    res.status(201).json({ ok: true, received: body });
  }
);

// POST /proposals/:id/vote — validated, then forwarded to Stellar RPC / indexer
router.post(
  "/proposals/:id/vote",
  validateBody(castVoteSchema),
  async (req: Request, res: Response) => {
    const body = req.body as CastVoteBody;
    // TODO: call Stellar RPC to cast vote on-chain
    res.status(200).json({ ok: true, received: body });
  }
);

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
