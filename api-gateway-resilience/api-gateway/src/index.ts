import express from "express";
import redis from "./redis";
import { slidingRateLimiter } from "./middleware/slidingRateLimiter";
import axios from "axios";

const app = express();

app.use(slidingRateLimiter);

async function callSlowServiceWithRetry() {
  try {
    // FIRST ATTEMPT
    return await axios.get(
      "http://localhost:4000/slow?delay=800",
      { timeout: 500 }
    );
  } catch (err) {
    console.log("First attempt failed, retrying once...");

    // WAIT before retry (backoff)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // SECOND (FINAL) ATTEMPT
    return axios.get(
      "http://localhost:4000/slow?delay=800",
      { timeout: 500 }
    );
  }
}

let failureCount = 0;
let circuitOpen = false;
let lastFailureTime = 0;

const FAILURE_THRESHOLD = 3;
const OPEN_TIMEOUT_MS = 10_000;


app.get("/health", (req, res) => {
  res.json({ status: "gateway-up" });
});

app.get("/redis-test", async (req, res) => {
  await redis.set("learning:key", "hello-redis", "EX", 60);

  const value = await redis.get("learning:key");

  res.json({
    message: "Redis write + read successful",
    value,
  });
});

// app.get("/call-slow", async (req, res) => {
//   try {
//     const response = await callSlowServiceWithRetry();
//     res.json(response.data);
//   } catch (err) {
//     res.status(504).json({
//       error: "Upstream service timed out",
//     });
//   }
// });

app.get("/call-slow", async (req, res) => {
  const now = Date.now();

  // 🔴 OPEN STATE — fail fast
  if (circuitOpen) {
    if (now - lastFailureTime < OPEN_TIMEOUT_MS) {
      return res.status(503).json({
        error: "Circuit open. Service temporarily unavailable.",
      });
    } else {
      // 🟡 Move to HALF-OPEN
      circuitOpen = false;
      failureCount = 0;
      console.log("Circuit half-open: testing dependency");
    }
  }

  try {
    const response = await callSlowServiceWithRetry();
    failureCount = 0; // success heals
    res.json(response.data);
  } catch (err) {
    failureCount++;
    lastFailureTime = now;

    console.log(`Failure count: ${failureCount}`);

    if (failureCount >= FAILURE_THRESHOLD) {
      circuitOpen = true;
      console.log("Circuit opened to protect system");
    }

    res.status(504).json({
      error: "Upstream failure",
    });
  }
});


app.listen(3000, () => {
  console.log("API Gateway running on port 3000");
});
