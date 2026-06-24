/**
 * Per-IP rate limiter for the AI endpoints.
 *
 * Caps how often a single client can hit `/api/ai/*` so one caller can't run up
 * unbounded LLM cost. Limits are configurable via env:
 *   - AI_RATE_LIMIT_WINDOW_MS (default 60000)
 *   - AI_RATE_LIMIT_MAX       (default 30 requests per window)
 *
 * Note: express-rate-limit counts a request once at entry, so a long-lived SSE
 * response (/generate-page) consumes exactly one slot — not one per streamed event.
 */
import rateLimit from "express-rate-limit";

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const aiRateLimiter = rateLimit({
  windowMs: intEnv("AI_RATE_LIMIT_WINDOW_MS", 60_000),
  limit: intEnv("AI_RATE_LIMIT_MAX", 30),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many AI requests. Please slow down." },
});
