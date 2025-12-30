
# Resilience Basics in Node.js, TypeScript, and Express

This guide explains 8 important resilience questions in simple terms, with code examples.

---

## ❓ 1. Why rate limiting belongs at the gateway
- Think of the **gateway** like the front door of your house.
- If too many people try to enter at once, the house gets crowded.
- Rate limiting at the gateway stops extra people at the door, before they disturb the inside.

```ts
app.use(async (req, res, next) => {
  const key = `rate:${req.userId}:${Math.floor(Date.now() / 1000)}`;
  const count = await redis.incr(key);
  await redis.expire(key, 1);
  if (count > LIMIT) return res.status(429).send('Too Many Requests');
  next();
});
```

---

## ❓ 2. What breaks if Redis goes down
- Redis is like a **shared notebook** where gateways write who has made requests.
- If Redis is down:
  - Gateways can’t share info → limits don’t work properly.
  - Services may get overloaded.
  - Monitoring data disappears.
  - Clients may retry too much, making things worse.

```ts
const redis = new Redis({ enableOfflineQueue: false, maxRetriesPerRequest: 0 });
redis.on('error', () => gatewayState.redisHealthy = false);
```

---

## ❓ 3. Fail-open vs fail-closed tradeoffs
- **Fail-open:** If Redis fails, let requests pass. Good for availability, but risky (overload).
- **Fail-closed:** If Redis fails, block requests. Protects services, but users see errors.

```ts
if (!gatewayState.redisHealthy) return next(); // fail-open
if (!gatewayState.redisHealthy) return res.status(503).send('Service Unavailable'); // fail-closed
```

---

## ❓ 4. Why fixed window passes tests but fails in production
- In tests, traffic is smooth. In real life, traffic comes in **bursts**.
- Fixed window resets every second/minute. Bursts at the edge of windows can sneak through.
- Example: 100 requests at the end of one window + 100 at the start of the next = 200 allowed.

```ts
const now = Date.now();
await redis.zremrangebyscore(key, 0, now - WINDOW_MS);
await redis.zadd(key, now, `${req.id}:${now}`);
const hits = await redis.zcard(key);
if (hits > LIMIT) return res.status(429).send('Too Many Requests');
```

---

## ❓ 5. Why timeouts are mandatory but retries are optional
- **Timeouts:** Stop waiting after a set time. Prevents your app from hanging forever.
- **Retries:** Only retry if it makes sense (like a temporary network glitch). Not always safe.

```ts
const controller = new AbortController();
const t = setTimeout(() => controller.abort(), 800);
const resp = await fetch(url, { signal: controller.signal });
```

---

## ❓ 6. How retries amplify failures
- Imagine 100 users call a service. If each retries 3 times, that’s 300 calls.
- Retries can **multiply traffic** exactly when the service is weakest.
- This makes failures worse.

```ts
for (let attempt = 1; attempt <= MAX; attempt++) {
  try { return await call(); }
  catch (e) {
    if (!isTransient(e) || attempt === MAX) throw e;
    const backoffMs = Math.min(BASE * 2 ** (attempt - 1), CAP) + Math.random() * JITTER;
    await sleep(backoffMs);
  }
}
```

---

## ❓ 7. Why fast failure is safer than slow success
- Better to **fail quickly** than to keep users waiting forever.
- Quick errors free resources and keep the system healthy.
- Slow success can block other requests and cause bigger delays.

```ts
if (queueDepth > MAX_QUEUE || circuit.isOpen()) {
  return res.status(503).send('Please retry later');
}
```

---

## ❓ 8. When to STOP calling a dependency (circuit breaker)
- Circuit breaker is like a **safety switch**.
- If a service keeps failing, stop calling it for a while.
- After a cooldown, test again with a few requests.
- This prevents wasting resources and protects the system.

```ts
type State = 'closed' | 'open' | 'half';
class Circuit {
  state: State = 'closed';
  failures = 0;
  openedAt = 0;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.state === 'open' && now - this.openedAt < 5000)
      throw new Error('CircuitOpen');
    if (this.state === 'open') this.state = 'half';

    try {
      const res = await fn();
      this.failures = 0;
      if (this.state === 'half') this.state = 'closed';
      return res;
    } catch (e) {
      this.failures++;
      if (this.failures >= 5) { this.state = 'open'; this.openedAt = now; }
      throw e;
    }
  }
}
```

---

# ✅ Summary
- **Rate limiting:** Stop overload at the door.
- **Redis down:** Shared limits break, services overload.
- **Fail-open vs fail-closed:** Choose between availability vs protection.
- **Fixed window issue:** Bursts sneak through.
- **Timeouts:** Always needed.  
- **Retries:** Use carefully.  
- **Fast failure:** Safer than waiting too long.  
- **Circuit breaker:** Stop calling broken services until they recover.
```
