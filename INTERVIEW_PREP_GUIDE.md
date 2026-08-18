# 🎓 Master Interview Guide & Technical System Manual
**Rate-Limited URL Shortener with Real-Time Analytics**
**Candidate:** Koushik Bobba  
**Target Roles:** Software Development Engineer (SDE I / SDE II / Systems Engineer)

---

## 📌 Table of Contents
1. [Executive Summary & High-Level System Architecture](#1-executive-summary--high-level-system-architecture)
2. [The Complete Interview Pitch Script](#2-the-complete-interview-pitch-script)
   - [The 60-Second Elevator Pitch](#the-60-second-elevator-pitch)
   - [The 3-Minute System Design Walkthrough](#the-3-minute-system-design-walkthrough)
3. [Top 12 Hard-Hitting Interview Questions & Fire-Back Answers](#3-top-12-hard-hitting-interview-questions--fire-back-answers)
4. [How to Export this Guide to PDF](#4-how-to-export-this-guide-to-pdf)

---

## 1. Executive Summary & High-Level System Architecture

This project is a high-throughput, low-latency URL shortening platform designed using enterprise microservices patterns. It solves core distributed systems challenges: **high read-to-write ratio optimization**, **sliding-window rate limiting**, **two-tier L1/L2 caching**, and **asynchronous message queue decoupling**.

```
                      +---------------------------------------+
                      |         React Frontend (Vite)         |
                      | - Shortener Form & Link Management    |
                      | - Real-time Analytics Dashboard       |
                      +-------------------+-------------------+
                                          |
                                          v HTTP / REST
                      +-------------------+-------------------+
                      |           C++ Backend Server          |
                      |           (Crow Engine + C++17)       |
                      | - JWT Auth Guard                     |
                      | - Sliding-Window Rate Limiter (Redis) |
                      | - Base62 Short Code Generator         |
                      +-------+---------------+-------+-------+
                              |               |       |
               Cache Hit/Miss |               |       | Async Click Event
                              v               v       v
                      +-------+---+   +-------+---+   +-------+---+
                      |   Redis   |   | PostgreSQL|   | RabbitMQ  |
                      | (Cache +  |   | (Primary  |   | (Click    |
                      | Rate Limit|   | DB Store) |   | Queue)    |
                      +-----------+   +-----------+   +-----+-----+
                                                            |
                                                            v Consume Event
                                                      +-----+-----+
                                                      | Analytics |
                                                      | Consumer  |
                                                      | (Worker)  |
                                                      +-----+-----+
                                                            | Persistence
                                                            v
                                                      +-----------+
                                                      | PostgreSQL|
                                                      +-----------+
```

---

## 2. The Complete Interview Pitch Script

### The 60-Second Elevator Pitch
> *"I designed and engineered SwiftURL, a high-throughput, rate-limited URL shortener built with C++, Redis, PostgreSQL, and RabbitMQ.*  
> 
> *The core goal was to handle heavy read traffic with sub-millisecond latency while protecting the backend from DDoS abuse. I chose C++ with the Crow engine for zero-GC memory performance. To handle URL short code generation deterministically without collisions, I used an atomic counter converted into a 6-character Base62 string.*  
> 
> *For performance, I implemented a two-tier caching strategy using Redis that yields a 99%+ L1 cache hit ratio. To prevent rate abuse, I built a sliding-window rolling counter in Redis. Finally, to ensure HTTP redirects respond instantly without waiting for disk IO, I used RabbitMQ to publish click analytics events asynchronously to a background consumer service that persists metrics into PostgreSQL.*  
> 
> *The entire system is containerized with Docker Compose and automated via GitHub Actions CI."*

---

### The 3-Minute System Design Walkthrough

> **Interviewer:** *"Can you walk me through the end-to-end request flow for both creating a link and visiting a link?"*

> **Koushik's Script:**
> 1. **URL Shortening Flow:**
>    - *"When a client submits a long URL via our React frontend, the request hits our C++ API server.*
>    - *First, the request passes through our **Sliding-Window Rate Limiter**. Using a rolling window key in Redis, we check if the IP has exceeded 10 requests per 60 seconds. If exceeded, we return an `HTTP 429 Too Many Requests` immediately.*
>    - *Next, if the user is authorized via JWT, the server generates a unique short code using **Base62 encoding** over a 64-bit atomic counter. This guarantees zero collisions in O(1) time.*
>    - *The mapping is written to PostgreSQL as the system of record, and simultaneously pre-warmed in Redis cache. The short link `http://domain/r/code` is returned."*
>
> 2. **URL Redirect & Analytics Flow:**
>    - *"When an end-user clicks a short link, speed is critical.*
>    - *Our C++ server checks **Redis L1 cache first**. On a cache hit (which accounts for ~99% of requests), we instantly construct an `HTTP 302 Found` with `Location: <OriginalURL>`.*
>    - *Instead of executing a synchronous SQL `UPDATE` or `INSERT` query that would add 20-50ms of database latency to the user's redirect, the C++ server pushes a lightweight JSON `click_event` message (IP, User-Agent, Referrer, Timestamp) to a **RabbitMQ queue**.*
>    - *The HTTP 302 response is returned to the user immediately (< 2ms).*
>    - *In the background, an asynchronous **Analytics Consumer Worker** pulls click messages off RabbitMQ, batches them, and updates PostgreSQL `click_analytics` and `urls` tables."*

---

## 3. Top 12 Hard-Hitting Interview Questions & Fire-Back Answers

### Q1: Why choose C++ for a web API over Node.js, Go, or Python?
**Koushik's Answer:**
> *"In a high-throughput URL shortener, read redirects represent 90%+ of traffic. Node.js and Python suffer from single-threaded event loop blocking or GIL constraints and non-deterministic Garbage Collection pauses.  
> C++ provides native OS socket control, zero-GC memory allocation, and explicit multi-threading (`std::thread` / thread pools). By using C++17, we achieve sub-millisecond HTTP processing times and minimal CPU/memory footprint per container."*

---

### Q2: Why Base62 encoding over MD5/SHA256 hashing or UUIDs?
**Koushik's Answer:**
> *"Hashes like MD5 or SHA256 produce long strings (32+ characters) requiring truncation. Truncating hashes introduces high collision probability, requiring expensive DB `SELECT` checks to detect collisions (the 'check-then-insert' penalty). UUIDs are also too long (36 characters) for short URLs.  
> Base62 uses characters `[0-9][a-z][A-Z]` (10 + 26 + 26 = 62). By mapping an incremental 64-bit integer ID to Base62, a 6-character string yields 62^6 = 56.8 billion unique URLs with zero collisions guaranteed."*

---

### Q3: How did you implement Sliding-Window Rate Limiting? Why not Fixed Window or Token Bucket?
**Koushik's Answer:**
> *"Fixed-window algorithms suffer from the 'boundary burst' vulnerability—a client can send 100 requests at 11:59 and another 100 at 12:00, effectively bursting 200 requests across a 2-second edge.  
> I implemented a **Sliding-Window Log** using Redis Sorted Sets (`ZSET`). Each request timestamp is added with `ZADD`. We remove entries older than (T - 60s) using `ZREMRANGEBYSCORE`, and check `ZCARD`. If `ZCARD` > limit, the request is rejected. This guarantees true rolling window precision."*

---

### Q4: Why use RabbitMQ instead of writing analytics synchronously to PostgreSQL?
**Koushik's Answer:**
> *"Database writes involve disk I/O, table indexing, and row locking, which typically take 15-50ms per request. If 10,000 users visit viral short links concurrently, synchronous DB writes create thread contention and exhaust database connection pools.  
> By publishing click events to RabbitMQ in-memory, the redirect completes in < 2ms. RabbitMQ acts as a buffer, allowing the worker process to write to PostgreSQL in optimized batch inserts."*

---

### Q5: How do you prevent Cache Stampedes (Thundering Herd) when a viral link expires from Redis?
**Koushik's Answer:**
> *"If a viral link with 50,000 active readers expires from Redis, all 50,000 concurrent requests would miss the cache simultaneously and slam PostgreSQL.  
> To solve this, we use **Mutex Locking / Probabilistic Early Expiration (XFetch)**. When a cache miss occurs, only the first thread acquires an in-memory lock/mutex to query PostgreSQL and populate Redis, while other concurrent requests wait briefly for the lock or serve the stale cache item."*

---

### Q6: What happens if RabbitMQ or the Consumer Worker process crashes? Will click events be lost?
**Koushik's Answer:**
> *"No data is lost because we configure RabbitMQ with **Durable Queues & Persistent Messages** (`delivery_mode: 2`).  
> Furthermore, the Consumer Worker uses **Explicit Manual Acknowledgments (`channel.ack(msg)`)**. A message is only removed from RabbitMQ after PostgreSQL confirms the SQL transaction commit. If the worker crashes mid-processing, RabbitMQ automatically re-queues the message to be picked up when the worker restarts."*

---

### Q7: How would you scale this system horizontally to 100,000+ requests per second?
**Koushik's Answer:**
> 1. **Load Balancing:** Place an NGINX or AWS ALB load balancer in front of multiple C++ API server instances.
> 2. **Distributed ID Generation:** Replace single-node counter with **Twitter Snowflake** or **Redis ID Generator Clusters** (assigning unique machine ID bits to each node).
> 3. **Database Sharding & Read Replicas:** Implement PostgreSQL read replicas for `urls` lookups and shard `click_analytics` by `short_code` hash.
> 4. **Redis Cluster:** Use Redis Sentinel / Cluster mode with consistent hashing.

---

### Q8: Why Base62 instead of Base64?
**Koushik's Answer:**
> *"Base64 includes `+` and `/` (or `-` and `_` in Base64URL). In standard URLs, `+` represents a space in query parameters and `/` acts as a path delimiter. Base62 consists strictly of alphanumeric characters `[0-9a-zA-Z]`, making every short code 100% URL-safe without requiring URL encoding."*

---

### Q9: How do you prevent URL short code collisions in a distributed multi-master setup?
**Koushik's Answer:**
> *"Instead of auto-incrementing DB IDs on single nodes, we assign distinct numeric ranges to nodes (e.g. Node A gets odd numbers, Node B gets even numbers), or use a centralized range service (e.g., ZooKeeper / Redis allocating batches of 1,000 IDs to each server instance at a time). Instance 1 encodes IDs `1-1000`, Instance 2 encodes `1001-2000`."*

---

### Q10: How does JWT Authentication work in this architecture?
**Koushik's Answer:**
> *"JWTs are stateless tokens signed with HMAC-SHA256. Upon user login, the C++ server issues a signed JWT containing user ID and expiration timestamp (`exp`). For protected routes (like `/api/shorten`), the server verifies the cryptographic signature without querying the database, enabling zero-latency auth checks across horizontally scaled nodes."*

---

### Q11: What PostgreSQL indexes were created and why?
**Koushik's Answer:**
> 1. `CREATE UNIQUE INDEX idx_urls_short_code ON urls(short_code);` -> Enables O(log N) B-Tree index lookups for cache misses.
> 2. `CREATE INDEX idx_urls_user_id ON urls(user_id);` -> Fast retrieval of user-owned links.
> 3. `CREATE INDEX idx_analytics_short_code ON click_analytics(short_code);` -> High-performance aggregation queries for analytics dashboards.

---

### Q12: What would you improve or refactor if you had another week?
**Koushik's Answer:**
> *"I would add **Geographic IP Resolution** (using MaxMind GeoIP2 library) to map click IPs to country/city metrics, introduce **WebSocket push notifications** to stream live click counts to the React dashboard in real-time, and implement **Prometheus + Grafana monitoring metrics** for C++ thread pool utilization."*

---

## 4. How to Export this Guide to PDF

1. **VS Code PDF Export**: Install the VS Code extension **"Markdown PDF"** (by yzane). Right-click `INTERVIEW_PREP_GUIDE.md` -> Select **Markdown PDF: Export (pdf)**.
2. **Browser Print**: Open the `README.md` or `INTERVIEW_PREP_GUIDE.md` on GitHub in your browser, press **Ctrl + P**, and select **Save as PDF**.
