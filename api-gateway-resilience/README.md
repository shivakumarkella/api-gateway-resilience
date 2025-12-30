# API Gateway Resilience Patterns (Production-Grade)

This project demonstrates **production-grade backend resilience patterns**
implemented at an API Gateway layer using Node.js, Express, TypeScript, and Redis.

## 🎯 What This Project Demonstrates

- Sliding-window rate limiting using Redis
- Fail-open strategy for Redis outages
- Explicit request timeouts
- Bounded retries with backoff
- Circuit breaker for unhealthy dependencies
- Graceful degradation under failure

This repository is designed to showcase **system design ownership**, not just code.

---

## 🧱 Architecture Overview

Client traffic flows through a centralized API Gateway that enforces
traffic governance and dependency protection before forwarding requests
to downstream services.

See `ARCHITECTURE.md` for detailed flow diagrams and decision rationale.

---

## 🧪 Components

### 1. API Gateway
- Port: `3000`
- Responsibilities:
  - Rate limiting (Redis-backed)
  - Timeout enforcement
  - Retry logic
  - Circuit breaker

### 2. Slow Service (Dependency Simulator)
- Port: `4000`
- Simulates latency and failures for resilience testing

### 3. Redis (Control Plane)
- Used for distributed rate limiting state
- Runs via Docker

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker
- npm

---

### Start Redis
```bash
docker run -d --name redis-rate-limit -p 6379:6379 redis
```

### Start Slow Service
```bash
cd slow-service
npm install
npm run dev
```

### Start API Gateway
```bash
cd api-gateway
npm install
npm run dev
```