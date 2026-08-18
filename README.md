# 🚀 Rate-Limited URL Shortener with Real-Time Analytics

A zero-install URL shortener microservices system built with a **Node.js/Express Backend API**, **React Frontend**, and **SQLite**. 

*(Note: This project was migrated from a Dockerized Postgres/Redis architecture to a purely local SQLite/In-Memory architecture for easier execution on Windows).*

---

## 🌟 Architecture & Key Highlights

- **Node.js/Express Backend Engine**: High-performance REST API handling URL encoding and JWT authentication.
- **Base62 Encoding**: Atomic sequence generator encoding long URLs into compact 6-character short codes (e.g. `q0V`).
- **In-Memory Caching**: High-speed lookup cache using JavaScript Maps avoiding database hits on popular redirect links.
- **In-Memory Rate Limiter**: Rolling counter limiting requests per client IP (10 requests / 60s) to prevent abuse.
- **Asynchronous Analytics**: Decoupled Node.js background tasks writing detailed click metrics (IP, User-Agent, Referrer, Timestamp) to SQLite without slowing down redirects.
- **React UI Dashboard**: Modern dark glassmorphic UI featuring interactive Recharts click throughput graphs and rate limit indicators.
- **Zero Configuration**: Uses a local SQLite `database.sqlite` file. No Docker, no PostgreSQL, no Redis required!

---

## 📁 Repository Structure

```
├── backend/                # Node.js Express REST API Server
│   ├── src/
│   │   ├── utils/base62.js # Base62 encoder/decoder
│   │   ├── middleware/     # In-memory Rate limiter & JWT auth
│   │   ├── routes/         # API routes
│   │   ├── db/             # SQLite connection & table creation
│   │   ├── rabbitmq/       # Background async tasks (replacing queue)
│   │   └── redis/          # In-memory Map cache (replacing Redis)
│   ├── index.js            # Main Express server
│   └── package.json        # Dependencies (sqlite3, express)
├── frontend/               # React + Vite Glassmorphic Dashboard
│   ├── src/
│   │   ├── components/     # Navbar, ShortenerCard, AnalyticsDashboard, AuthModal
│   │   ├── index.css       # Glassmorphism design system
│   │   └── App.jsx         # Main application layout
│   └── package.json        # Dependencies (vite, recharts)
└── README.md               # You are here
```

---

## 🛠️ How to Run Locally

You do **not** need Docker to run this project. You only need Node.js installed on your computer.

### 1. Start the Backend API (Port 8080)
Open a terminal and run:
```bash
cd backend
npm install
node index.js
```
*The database tables and `database.sqlite` file will automatically be created on the first run.*

### 2. Start the React Frontend (Port 5173)
Open a **second** terminal and run:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App
Go to [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🧪 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/shorten` | Shorten a long URL with optional custom slug | Yes |
| `GET` | `/r/{short_code}` | Instant 302 redirect & async click log publish | No |
| `GET` | `/api/user/analytics/{short_code}`| Retrieve click metrics and history | Yes |
| `GET` | `/api/user/urls` | Get list of user created short links | Yes |
| `POST` | `/api/auth/register` | Create user account & receive JWT | No |
| `POST` | `/api/auth/login` | Authenticate & receive JWT | No |
