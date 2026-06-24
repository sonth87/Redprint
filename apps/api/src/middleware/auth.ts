/**
 * API-key auth middleware for the AI endpoints.
 *
 * Protects `/api/ai/*` behind a single shared bearer token (env `AI_API_KEY`).
 * This is a perimeter guard against open LLM-cost abuse — not a per-user system.
 *
 * Behaviour:
 *  - `AI_API_KEY` unset  → allow all (dev convenience), warn once so prod isn't silently open.
 *  - `AI_API_KEY` set    → require `Authorization: Bearer <AI_API_KEY>`, else 401.
 */
import type { Request, Response, NextFunction } from "express";

let warnedOpen = false;

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.AI_API_KEY;

  if (!expected) {
    if (!warnedOpen) {
      warnedOpen = true;
      console.warn(
        "[auth] AI_API_KEY is not set — /api/ai/* is OPEN. Set AI_API_KEY before deploying to production.",
      );
    }
    next();
    return;
  }

  const provided = extractBearer(req.headers.authorization);
  if (provided !== expected) {
    console.warn(`[auth] Rejected /api/ai request from ${req.ip ?? "unknown"} (missing/invalid bearer token)`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
}
