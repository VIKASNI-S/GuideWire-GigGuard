#  Pheoraksha

**AI-powered parametric income protection for India’s gig delivery workforce.**

GigGuard is a state-of-the-art insurance platform designed to protect gig workers from income loss due to adverse weather, traffic congestion, and other environmental factors. It leverages a modern tech stack and machine learning to provide real-time risk assessment and automated payouts.

---

## Tech Stack

-   **Frontend**: React 18 + Vite (configured for port 3000)
-   **Backend**: Express + TypeScript + Drizzle ORM (configured for port 5000)
-   **ML Service**: Python FastAPI + scikit-learn (configured for port 8000)
-   **Database**: PostgreSQL (Optimized for Neon)

---

##  Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [PostgreSQL](https://www.postgresql.org/) (or a Neon.tech account)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

---

## Project Configuration

The project requires several environment variables to function properly. You should create `.env` files in each service directory.

### 1. External API Keys
1.  **OpenWeatherMap**: Sign up at [openweathermap.org](https://openweathermap.org/api) to get a free API key for weather data.
2.  **TomTom Traffic**: Sign up at [developer.tomtom.com](https://developer.tomtom.com/) to get a free API key for traffic flow data.

### 2. Environment Variables Mapping

| Service | File | Key | Description |
| :--- | :--- | :--- | :--- |
| **Backend** | `backend/.env` | `DATABASE_URL` | PostgreSQL connection string |
| | | `JWT_SECRET` | Secret for signing auth tokens |
| | | `OPENWEATHER_API_KEY` | Your OpenWeatherMap key |
| | | `TOMTOM_API_KEY` | Your TomTom Traffic key |
| | | `ML_SERVICE_URL` | URL of the ML service (default: `http://localhost:8000`) |
| | | `DEMO_MODE` | `true` for lower thresholds (testing), `false` for prod |
| **Frontend**| `frontend/.env` | `VITE_API_URL` | URL of the backend API (default: `http://localhost:5000`) |
| | | `VITE_TOMTOM_API_KEY`| (Optional) TomTom key for map tiles |
| **ML Service**| `ml-service/.env`| `PORT` | Port for the FastAPI service (default: `8000`) |

---

##  Local Setup Instructions

Follow these steps in order to get the full solution running:

### Step 1: Backend Setup
```bash
cd backend
npm install
cp .env.example .env
#  Update .env with your DATABASE_URL and API keys
npm run db:push          # Initialize database schema
npm run db:seed          # (Optional) Seed the database with demo data
npm run dev              # Starts backend on http://localhost:5000
```

### Step 2: ML Service Setup
```bash
cd ml-service
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env     # Update if you need a different port
uvicorn main:app --reload --port 8000
```
> **Note:** On the first run, the service will automatically train the `risk_model.joblib` if it's missing.

### Step 3: Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Update .env if your backend is not on localhost:5000
npm run dev              # Starts frontend on http://localhost:3000
```

---

## Testing & Simulation

GigGuard includes built-in tools to test the parametric triggers and fraud detection:

-   **Manual Triggers**: Logged-in users can use the **Demo Mode** panel in the dashboard to simulate heavy rain, heatwaves, or traffic congestion.
-   **Automated Checks**: A cron job runs every 10 minutes in the backend to check active policies against real-time data.
-   **Fraud Detection**: The system includes GPS spoofing detection and activity verification. See `FRAUD_TESTING.md` for detailed testing scenarios.

---

##  Project Structure

```text
GuideWire-GigGuard/
├── backend/       # Express API, Drizzle Schema, Cron Jobs
├── frontend/      # React App, Dashboard, Dashboards
├── ml-service/    # FastAPI, Risk Models, Premium Prediction
└── ...            # Config & Documentation
```

---

##  Security Summary
-   **Passwords**: Hashed using `bcryptjs` (12 rounds).
-   **Authentication**: JWT-based session management with `httpOnly` cookies.
-   **Validation**: Schema validation via `zod` for all API inputs.

---

## Admin Credentials
- **Email**:admin@phoeraksha.com
- **password**:Admin@123

## PPT Link
- https://canva.link/u0ultzy6a0ktad1
.
