# 🚀 Rate-Limited URL Shortener with Real-Time Analytics

A high-performance URL shortener microservices system built with a **C++ API Engine (Crow/C++17)**, **React Frontend**, **PostgreSQL**, **Redis**, **RabbitMQ**, **JWT Auth**, and **Docker Compose**.

---

## 🌟 Architecture & Key Highlights

- **C++ Backend Engine**: High-performance REST API handling URL encoding, JWT authentication, and sliding-window rate protection.
- **Base62 Encoding**: 64-bit atomic sequence generator encoding long URLs into compact 6-character short codes (e.g. `q0V`).
- **Redis Caching**: High-speed lookup cache (`X-Cache-Status: HIT`) avoiding database hits on popular redirect links.
- **Sliding-Window Rate Limiter**: Redis-backed rolling counter limiting requests per client IP (10 requests / 60s) to prevent abuse.
- **RabbitMQ Async Queue**: Asynchronous message queue decoupling instant 302 redirects from database analytics writes.
- **Analytics Worker**: Asynchronous consumer writing detailed click metrics (IP, User-Agent, Referrer, Timestamp) to PostgreSQL.
- **React UI Dashboard**: Modern dark glassmorphic UI featuring interactive Recharts click throughput graphs and rate limit indicators.

---

## 📁 Repository Structure

```
├── backend/                # C++ Crow REST API Server & Headers
│   ├── include/
│   │   ├── base62.hpp      # Base62 encoder/decoder
│   │   ├── rate_limiter.hpp# Sliding-window rate limiter
│   │   ├── jwt_helper.hpp  # JWT authentication helper
│   │   └── crow_light.hpp  # C++ web server framework
│   ├── src/main.cpp        # Server routes & API logic
│   ├── CMakeLists.txt      # CMake build setup
│   └── Dockerfile          # Multi-stage C++ container build
├── frontend/               # React + Vite Glassmorphic Dashboard
│   ├── src/
│   │   ├── components/     # Navbar, ShortenerCard, AnalyticsDashboard, AuthModal
│   │   ├── index.css       # Glassmorphism design system
│   │   └── App.jsx         # Main application layout
│   └── Dockerfile          # Nginx container build
├── consumer/               # Async RabbitMQ Click Analytics Worker
│   ├── worker.js           # Queue listener & database persister
│   └── Dockerfile          # Node.js worker build
├── database/
│   └── init.sql            # PostgreSQL schema & performance indexes
└── docker-compose.yml      # Orchestrates all 6 microservices
```

---

## 🛠️ How to Run

### Option 1: Using Docker Compose (Single Command)
```bash
docker compose up --build
```
Access the application at:
- **Frontend Dashboard**: `http://localhost:3000` (or `http://localhost:5173` locally)
- **C++ Backend API**: `http://localhost:8080`
- **RabbitMQ Dashboard**: `http://localhost:15672` (User: `guest`, Pass: `guest`)

### Option 2: Running Locally
1. **Compile & Run C++ Backend**:
   ```bash
   g++ -O2 -std=c++17 backend/src/main.cpp -Ibackend/include -lws2_32 -lmswsock -o backend/url_shortener_server.exe
   ./backend/url_shortener_server.exe
   ```
2. **Run React Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🧪 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/shorten` | Shorten a long URL with optional custom slug | Optional |
| `GET` | `/r/{short_code}` | Instant 302 redirect & async click log publish | No |
| `GET` | `/api/analytics/{short_code}` | Retrieve click metrics and history | Yes |
| `GET` | `/api/user/urls` | Get list of user created short links | Yes |
| `POST` | `/api/auth/register` | Create user account & receive JWT | No |
| `POST` | `/api/auth/login` | Authenticate & receive JWT | No |
