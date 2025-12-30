# Architecture & Design Decisions

## Request Lifecycle

1. Client request enters API Gateway
2. Sliding-window rate limiter checks Redis
3. Timeout boundary applied for downstream calls
4. One bounded retry attempted (with backoff)
5. Circuit breaker evaluates dependency health
6. Request forwarded or failed fast

---

## Rate Limiting
- Implemented using Redis Sorted Sets
- Sliding window to avoid burst issues
- Fail-open policy when Redis is unavailable

## Timeouts & Retries
- Caller-owned timeout configuration
- Retries limited to one attempt
- Backoff applied to avoid retry storms

## Circuit Breaker
- In-memory breaker for simplicity
- States: Closed, Open, Half-open
- Protects system from repeated dependency failures

---

## Failure Philosophy

This system prioritizes:
- Predictable behavior
- Fast failure over slow success
- Graceful degradation over total outage
