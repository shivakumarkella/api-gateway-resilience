import { Request, Response, NextFunction } from "express";
import redis from "../redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

export async function slidingRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const now = Date.now();
  const ip = req.ip;
  const key = `rate:sw:${ip}`;

  try {
    const pipeline = redis.pipeline();

    // 1) record this request
    pipeline.zadd(key, now, `${now}`);

    // 2) remove outdated requests
    pipeline.zremrangebyscore(key, 0, now - WINDOW_MS);

    // 3) count remaining
    pipeline.zcard(key);

    // 4) ensure auto-cleanup
    pipeline.expire(key, Math.ceil(WINDOW_MS / 1000));

    const results = await pipeline.exec();
    const requestCount = results?.[2]?.[1] as number;

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, MAX_REQUESTS - requestCount)
    );

    if (requestCount > MAX_REQUESTS) {
      return res.status(429).json({
        error: "Too many requests (sliding window)",
        retryAfterMs: WINDOW_MS,
      });
    }

    next();
  } catch (err) {
    // Maintain fail-open posture
    console.error("Sliding limiter degraded, allowing request", err);
    next();
  }
}
