# Pheraksha

AI-powered parametric income protection for India’s gig delivery workforce. The stack is **React + Vite** (frontend), **Express + TypeScript + Drizzle** (backend), **PostgreSQL (Neon)**, and a **Python FastAPI** ML service (Random Forest premium multiplier + risk scores).

## Ports

| Service     | Port |
|------------|------|
| Frontend   | 3000 |
| Backend API | 5000 |
| ML service | 8000 |

---

## Setup & configuration guide

### 1. OpenWeatherMap API key (free)

1. Create an account at [https://openweathermap.org/api](https://openweathermap.org/api).
2. Under **API keys**, generate a key (activation can take up to a few hours on a new account).
3. Use these endpoints from the backend:
   - Current weather: `https://api.openweathermap.org/data/2.5/weather` (`lat`, `lon`, `units=metric`, `appid=<key>`).
   - Air pollution: `https://api.openweathermap.org/data/2.5/air_pollution` (`lat`, `lon`, `appid=<key>`).
4. Put the key in **`backend/.env`** as `OPENWEATHER_API_KEY=...`.

If the key is missing, the backend uses **mock weather** so local development still runs.

### 2. TomTom API key (free developer tier)

1. Sign up at [https://developer.tomtom.com/](https://developer.tomtom.com/).
2. Create a project and enable **Traffic API** (Flow Segment Data is used).
3. Flow Segment Data URL used in code:  
   `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key=<KEY>`
4. Put the key in **`backend/.env`** as `TOMTOM_API_KEY=...`.

Optional: **`frontend/.env`** can expose `VITE_TOMTOM_API_KEY` if you add TomTom map tiles later.

If the key is missing, the backend uses **mock traffic** (moderate congestion).

### 3. Neon PostgreSQL

1. Create a project at [https://neon.tech](https://neon.tech).
2. Copy the connection string (include `?sslmode=require`).
3. Set **`backend/.env`**: `DATABASE_URL=postgresql://...`

### 4. Where to put each secret

| Value | File |
|-------|------|
| Database URL | `backend/.env` → `DATABASE_URL` |
| Demo thresholds | `backend/.env` → `DEMO_MODE` (`true` = lowered Chennai-friendly triggers; `false` = production) |
| JWT signing secret | `backend/.env` → `JWT_SECRET` |
| OpenWeather key | `backend/.env` → `OPENWEATHER_API_KEY` |
| TomTom key | `backend/.env` → `TOMTOM_API_KEY` |
| ML service URL | `backend/.env` → `ML_SERVICE_URL` (default `http://localhost:8000`) |
| Frontend API base | `frontend/.env` → `VITE_API_URL` (default `http://localhost:5000`) |
| CORS origin | `backend/.env` → `FRONTEND_ORIGIN` (default `http://localhost:3000`) |

Copy from each `**/.env.example`** file.

### 5. Install and run

**Backend**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env (DATABASE_URL, JWT_SECRET, API keys)
npx drizzle-kit push
npm run db:seed
npm run dev
```

**ML service**

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

On first start, if `model/risk_model.joblib` is missing, training runs automatically.

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite is configured for **port 3000**.

### 6. Database migrations

- **Push schema (dev / Neon):** `cd backend && npx drizzle-kit push`
- **Generate SQL migrations (optional):** `npm run db:generate` then apply with your migration process.

### 7. Manual / demo trigger testing

- **Cron:** auto-trigger runs every **10 minutes** when the API process is up.
- **Immediate check (logged-in user):** `POST /api/trigger/manual-check` with an active policy.
- **Demo (logged-in user):**
  - `POST /api/demo/simulate-rain` — optional body: `{ "rainfallMm": 55 }`
  - `POST /api/demo/simulate-heatwave` — optional: `{ "tempC": 46 }`
  - `POST /api/demo/simulate-traffic` — optional: `{ "congestion": 0.9 }`

The dashboard includes **Demo mode** buttons that call these endpoints.

### 8. End-to-end flow

1. Sign up → JWT is set in an **httpOnly** cookie.
2. Choose a plan on `/plans` → creates a **7-day** policy with **ML-adjusted** premium.
3. Cron or demo endpoints evaluate weather + traffic + plan thresholds → **trigger events** and **payouts** (mock payment with ~95% success).

---

## Project layout

```
pheraksha/
├── frontend/     # React 18 + Vite + Tailwind + Leaflet + Recharts
├── backend/      # Express + Drizzle + node-cron
├── ml-service/   # FastAPI + scikit-learn
└── README.md
```

---

## Security notes (MVP)

- Passwords hashed with **bcryptjs** (12 rounds).
- JWT expiry: **7 days** (login “Remember me” extends cookie max-age).
- Demo and manual trigger routes require an **authenticated** session.

---

## License

MIT (adjust as needed for your submission).
