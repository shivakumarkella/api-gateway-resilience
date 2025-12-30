# API Gateway Resilience – Detailed Learning Notes (Zero to Production Thinking)

## 1. Why This Project Was Built (Layman Explanation)

In the real world, software systems don’t fail only because of bugs.
They fail because of **pressure**.

Pressure comes from:
- too many users at the same time
- slow internet or networks
- one service depending on another service that becomes slow or unstable

This project was built to **understand how professional backend systems survive pressure**.

The goal was NOT:
- to build features
- to build UI
- to build a business app

The goal WAS:
- to understand *failure*
- to observe *system behavior*
- to design *protection mechanisms*

---

## 2. What System We Built (Simple Architecture)

We built a **small but realistic system** with 3 parts:

### 1️⃣ API Gateway
- Entry point for all requests
- Think of it as the **security gate** of a building
- Decides whether a request:
  - is allowed
  - should wait
  - should be rejected immediately

### 2️⃣ Redis
- A very fast in-memory system
- Used only for counting and timing
- Think of it as a **shared counter + stopwatch**

### 3️⃣ Slow Service
- A fake backend service
- Intentionally made slow
- Used to simulate real production problems

---

## 3. How We Tested Everything (Important Mindset)

This project was not built by just “writing code”.

For **every concept**, we followed this cycle:

1. Build a simple version
2. Break it intentionally
3. Observe the problem
4. Improve the design
5. Observe the difference

This is exactly how **senior engineers learn systems**.

---

## 4. Rate Limiting – Controlling Traffic

### 4.1 The Real Problem

If one user or bot sends too many requests:
- server CPU increases
- memory fills up
- normal users suffer
- entire system may crash

This happens very often in real life.

---

### 4.2 What Rate Limiting Means (Plain English)

Rate limiting means:
> “You can only make a fixed number of requests in a given time.”

Example:
> “Only 5 requests per 60 seconds from one IP.”

---

### 4.3 How We Implemented It

- Implemented at **API Gateway**
- Used **Redis** to store request counts
- Each request:
  - increases a counter
  - counter automatically expires after time window

---

### 4.4 How We Tested It Practically

#### Test Steps
- Started API Gateway
- Hit `/health` endpoint repeatedly from browser
- Counted how many times request succeeded

#### What We Observed
- First 5 requests → success
- 6th request → HTTP 429 (Too Many Requests)
- After 60 seconds → allowed again

This proved:
- traffic control works
- Redis TTL works
- gateway blocks early (before business logic)

---

### 4.5 Fixed Window Problem (Important Learning)

#### How We Simulated the Problem
- Sent requests near the end of the minute
- Immediately sent more after the window reset

#### What We Observed
- 10 requests passed in ~1 second
- System technically followed rules
- But behavior was dangerous

This showed:
> **Correct code can still cause production issues**

---

### 4.6 Sliding Window Improvement

#### What Changed
Instead of resetting every minute, we asked:
> “How many requests happened in the last 60 seconds *right now*?”

#### How We Tested the Difference
- Sent requests continuously
- Observed request rejection gradually
- No sudden reset spikes

#### What We Noticed
- Traffic was smoother
- No burst at time boundaries
- System behavior became predictable

---

### 4.7 Redis Failure Simulation (Very Important)

#### How We Simulated Failure
- Stopped Redis container using Docker
- Sent requests to gateway

#### What We Observed
- Redis connection errors appeared in logs
- Gateway did NOT crash
- Requests still succeeded

#### What This Taught
- Redis is a **support system**, not a single point of failure
- Fail-open strategy keeps system alive
- Errors in logs ≠ system failure

---

## 5. Timeouts – Protecting Against Slowness

### 5.1 The Real Problem

When a backend service becomes slow:
- requests wait forever
- threads get blocked
- server stops responding
- system appears “up” but is unusable

This is more dangerous than a crash.

---

### 5.2 How We Simulated Slowness

- Built a slow service with artificial delay
- Controlled delay using query parameter
- Example: `/slow?delay=3000`

---

### 5.3 What Happened Without Timeouts

#### Observation
- Gateway waited for slow service
- Browser kept loading
- Multiple requests piled up

This demonstrated:
> Waiting forever is deadly in production

---

### 5.4 Adding Timeouts

#### What We Did
- Added strict timeout to HTTP calls
- Example: 500ms or 1s max

#### What We Observed
- Gateway failed fast
- Client received error quickly
- Server remained responsive

#### Key Learning
> Failing fast protects system capacity

---

## 6. Retries – Controlled Recovery

### 6.1 Why Retries Exist

Some failures are temporary:
- network hiccups
- momentary CPU spikes

Retrying once can succeed.

---

### 6.2 Why Retries Are Dangerous

If uncontrolled:
- retries multiply traffic
- slow services get overloaded
- outage becomes worse

This is called a **retry storm**.

---

### 6.3 How We Implemented Retries

- Only **one retry**
- Small delay before retry
- Each attempt had its own timeout

---

### 6.4 What We Tested

#### Scenario 1
- First attempt failed
- Second attempt succeeded
- User still got success

#### Scenario 2
- Both attempts failed
- Gateway returned controlled error
- No infinite waiting

This proved:
> Retries help only when bounded

---

## 7. Circuit Breaker – System Self-Defense

### 7.1 The Real Problem

If a dependency keeps failing:
- retries keep hammering it
- system wastes resources
- entire platform degrades

---

### 7.2 Circuit Breaker Concept (Layman)

Think of a home electrical breaker:
- too much load → power is cut
- after some time → power restored

Same idea in software.

---

### 7.3 States We Implemented

- **Closed** → normal flow
- **Open** → stop calling dependency
- **Half-Open** → test if recovered

---

### 7.4 How We Simulated Failures

- Made slow service very slow
- Caused repeated timeouts
- Observed failure counter increase

---

### 7.5 What We Observed

- After 3 failures → circuit opened
- Further requests failed immediately
- No calls were made to slow service
- After wait time → one test request allowed

This showed:
> Fast failure is safer than slow damage

---

## 8. How Everything Works Together

A single request flow:

1. Enter API Gateway
2. Rate limit check
3. Timeout applied
4. Retry logic (if needed)
5. Circuit breaker decision
6. Forward or fail fast

Each step solves **a different problem**.

---

## 9. Biggest Lessons From This Project

This project taught:
- failures are normal
- systems must expect them
- protection is more important than features
- stability beats optimism

---

## 10. Final Simple Takeaway

Good systems don’t try to be perfect.

Good systems:
- protect themselves
- fail predictably
- recover automatically
- keep users safe under pressure

This project shows **how real backend systems survive in production**.
