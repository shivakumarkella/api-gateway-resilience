
# API Gateway Resilience Patterns (Production-Grade)

This repository demonstrates how **real backend systems protect themselves in production**
using an **API Gateway–centric resilience architecture**.

The project focuses on **system behavior under failure**, not just happy-path functionality.

---

## 🎯 What This Project Demonstrates

This project implements and validates the following **production-grade resilience patterns**:

- ✅ Redis-based **sliding window rate limiting**
- ✅ **Fail-open** strategy during Redis outages
- ✅ Strict **timeouts** on downstream calls
- ✅ **Bounded retries with backoff** to avoid retry storms
- ✅ **Circuit breaker** to stop calling unhealthy dependencies
- ✅ Graceful degradation instead of cascading failures

> The goal is to show **design ownership and production thinking**, not framework usage.

---

## 🧠 Why This Matters (For Recruiters & Interviewers)

Most real-world outages happen due to:
- traffic spikes
- slow dependencies
- uncontrolled retries
- cascading failures

This project shows how a backend engineer:
- anticipates failures
- designs explicit protection policies
- validates behavior through failure simulation

---

## 🧱 Architecture Overview

```

Client
↓
API Gateway (Node.js + Express)
├─ Rate Limiting (Redis, Sliding Window)
├─ Timeout Enforcement
├─ Bounded Retry Logic
├─ Circuit Breaker
↓
Downstream Service (Simulated Slow Service)

````

Redis acts as a **shared control plane**, not a business dependency.

---

## 🧩 Components

### 1️⃣ API Gateway
- Port: **3000**
- Responsibilities:
  - Traffic governance
  - Dependency protection
  - Fail-fast behavior

### 2️⃣ Slow Service (Dependency Simulator)
- Port: **4000**
- Used to intentionally simulate:
  - slowness
  - timeouts
  - repeated failures

### 3️⃣ Redis
- Used only for:
  - request counting
  - time-based expiry
- Runs via Docker
- Designed to **fail-open**

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Node.js 18+
- Docker
- npm

---

### Step 1: Start Redis
```bash
docker run -d --name redis-rate-limit -p 6379:6379 redis
````

---

### Step 2: Start Slow Service

```bash
cd slow-service
npm install
npm run dev
```

---

### Step 3: Start API Gateway

```bash
cd api-gateway
npm install
npm run dev
```

---

## 🧪 How to Test & Observe Behavior

### Health Check

```bash
curl http://localhost:3000/health
```

---

### Rate Limiting

```bash
for i in {1..10}; do curl http://localhost:3000/health; done
```

Expected:

* First few requests succeed
* Excess requests return **HTTP 429**
* Sliding window prevents burst at time boundaries

---

### Redis Failure (Fail-Open Test)

```bash
docker stop redis-rate-limit
curl http://localhost:3000/health
```

Expected:

* Redis errors logged
* Requests still succeed
* Gateway remains available

---

### Timeout & Retry Test

```bash
curl http://localhost:3000/call-slow
```

Expected:

* Gateway fails fast if downstream is slow
* One controlled retry may occur
* No hanging requests

---

### Circuit Breaker Test

* Repeated slow failures trigger breaker
* Subsequent calls fail immediately
* After cooldown, gateway probes recovery

---

## 📁 Repository Structure

```
api-gateway-resilience/
│
├── api-gateway/        # API Gateway implementation
├── slow-service/       # Dependency simulator
├── docker-compose.yml  # Local orchestration
├── ARCHITECTURE.md     # Design decisions & flow
├── LEARNING_NOTES.md   # Detailed learning & observations
└── README.md
```

---

## 🧠 Key Design Decisions

* Rate limiting lives at the **gateway**, not in services
* Timeouts are **mandatory**, retries are **optional**
* Retries are **bounded** to avoid amplification
* Circuit breaker prevents cascading failures
* Redis failure does not bring the system down

---

## 🗣️ Summary

> “I designed an API Gateway that protects backend services using Redis-based sliding-window rate limiting, strict timeouts, bounded retries, and a circuit breaker. The system is intentionally tested under failure scenarios to ensure fast failure, graceful degradation, and predictable behavior in production.”

---

## 🛠️ Tech Stack

* Node.js
* Express
* TypeScript
* Redis
* Docker
* REST APIs
* Resilience Patterns

---

## 📜 License

MIT

