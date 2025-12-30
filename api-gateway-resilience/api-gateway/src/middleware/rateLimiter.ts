import { Request, Response, NextFunction } from "express";
import redis from "../redis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 5;

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const ip = req.ip;
    const key = `rate:${ip}`;

    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, MAX_REQUESTS - currentCount)
    );
    res.setHeader("Retry-After", WINDOW_SECONDS);

    if (currentCount > MAX_REQUESTS) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: WINDOW_SECONDS,
      });
    }

    next();
  } catch (err) {
    // 🔥 FAIL-OPEN POLICY
    console.error("Rate limiter degraded, allowing request", err);
    next();
  }
}

