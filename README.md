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

**Overview**

Phoeraksha is an AI-powered parametric insurance platform designed to protect gig workers from income loss caused by real-world disruptions such as adverse weather, traffic congestion, and environmental conditions. Unlike traditional insurance systems that rely on claims and manual verification, Phoeraksha operates on a fully automated, data-driven model where payouts are triggered in real time based on validated conditions.

The core idea behind the platform is to provide immediate financial protection to gig workers by continuously monitoring environmental signals, user activity, and behavioral patterns. By combining these signals, the system ensures that payouts are both accurate and fraud-resistant.

**Inspiration**

The motivation for building Phoeraksha comes from the growing gig economy in India, where delivery workers form the backbone of services like food delivery and logistics. These workers depend entirely on daily earnings and are highly vulnerable to external disruptions such as heavy rainfall, floods, or extreme heat.

Existing insurance systems are not designed for such dynamic and short-term risks. They are often slow, require manual claims, and do not align with the real-time nature of gig work. This gap inspired the development of a system that is automated, transparent, and capable of responding instantly to real-world conditions.

**System Architecture**

Phoeraksha is built using a modern multi-service architecture to ensure scalability and separation of concerns.

The frontend is developed using React and Vite, providing an interactive dashboard for both users and administrators. The backend is implemented using Express with TypeScript and Drizzle ORM, handling business logic, API routing, and data processing. A dedicated machine learning service is built using FastAPI and scikit-learn, responsible for risk evaluation and predictive modeling. PostgreSQL is used as the database, optimized for Neon for efficient cloud deployment.

The system is structured into three main components: frontend, backend, and ML service, all connected through APIs.

**How the System Works**

The platform follows a continuous monitoring and evaluation pipeline.

A user subscribes to a weekly insurance plan and becomes eligible for coverage. Once active, the system continuously collects environmental data such as rainfall, temperature, air quality, and traffic conditions using external APIs. At the same time, it monitors user activity, including delivery attempts and engagement levels.

At regular intervals, the backend evaluates whether the conditions meet the criteria for a disruption. If the system detects a valid disruption and confirms that the user is genuinely affected, it automatically triggers a payout without requiring any manual claim.

**Risk Evaluation Logic**

Phoeraksha uses a multi-factor risk evaluation model instead of relying on a single signal. Each factor contributes to an overall risk level, which determines both eligibility and payout decisions.

The risk model considers environmental risk, location-based risk, historical patterns, user behavior, income dependency, traffic conditions, and time-based factors.

Mathematically, the overall risk score can be represented as:

Risk=w
1
	​

⋅Environmental+w
2
	​

⋅Activity+w
3
	​

⋅Behavior+w
4
	​

⋅Location+w
5
	​

⋅Historical

where each component represents a normalized score and the weights determine their importance.

This approach ensures that the system reflects real-world conditions rather than reacting to isolated signals.

**Payout Trigger Logic**

The payout system is designed to be strict and reliable. A payout is triggered only when multiple independent conditions are satisfied.

First, the environmental threshold must be exceeded. For example, rainfall must cross a predefined threshold depending on the user’s plan.

Second, there must be a verified drop in user activity. The system compares the current delivery rate with the user’s baseline activity. If the current activity falls below a defined percentage of the baseline, it is considered a genuine disruption.

Third, the user must pass all fraud detection checks. If any suspicious behavior is detected, the payout is either blocked or flagged for review.

This can be summarized as:

Trigger=Environmental∧ActivityDrop∧ValidUser

This multi-condition approach ensures that payouts are both accurate and resistant to manipulation.

**Activity Drop Detection**

To determine whether a user is genuinely affected, the system evaluates activity drop using a baseline comparison.

Each user has an average delivery rate based on historical data. The system calculates the current activity level and compares it with this baseline. If the current activity falls below a defined threshold, typically around sixty percent of the baseline, the system considers it a valid activity drop.

This ensures that the system does not rely solely on environmental conditions but also verifies real impact on the user.

**Fraud Detection Logic**

Fraud detection is a critical component of Phoeraksha, especially in scenarios where users may attempt to exploit the system using GPS spoofing or coordinated attacks.

The system uses multiple layers of fraud detection.

The first layer focuses on location consistency. It compares the user’s current location with their previous location and calculates the distance and time difference. If the movement is physically unrealistic, such as a large distance covered in a very short time, it is flagged as suspicious.

The second layer focuses on behavioral validation. The system checks whether the user is actively attempting deliveries. If a user claims disruption but shows no meaningful activity, it indicates potential misuse.

The third layer focuses on cluster-based detection. If multiple users in the same region exhibit identical patterns of behavior or synchronized inactivity, the system identifies it as a coordinated fraud attempt.

The fraud detection process produces detailed evidence, including location jumps, time differences, and behavioral inconsistencies, which are displayed in the admin dashboard.

**Trust Score System**

Each user is assigned a dynamic trust score that reflects their reliability.

The trust score is updated automatically based on user behavior and system events. Fraud detection reduces the trust score, while consistent and normal activity increases it. The score is bounded within a defined range to maintain stability.

The system maintains a history of trust score changes, allowing administrators to track how and why a user’s score has evolved over time.

This mechanism ensures that repeated fraudulent behavior is penalized while genuine users are rewarded.

**Admin Dashboard and Analytics**

The admin dashboard provides a comprehensive view of system operations.

It includes real-time metrics such as active users, total payouts, fraud alerts, and system health indicators. It also provides detailed analytics, including payout trends, trigger distribution, fraud rates, and loss ratio.

The loss ratio is calculated as:

LossRatio= TotalPremiums/ TotalPayouts
	​


This metric helps ensure the financial sustainability of the system.

The dashboard also provides explainability for each event, clearly showing why a payout was triggered or why a user was flagged for fraud.

**Explainability**

A key focus of Phoeraksha is transparency.

For every payout or fraud alert, the system provides a detailed explanation that includes environmental conditions, activity validation, and fraud checks. This ensures that both users and administrators understand the reasoning behind every decision.

This explainability layer makes the system trustworthy and easier to evaluate.

**What We Learned**

Building Phoeraksha provided deep insights into how real-world systems must balance accuracy, fairness, and scalability.

We learned how to design systems that are not only technically correct but also explainable and user-centric. We also gained experience in integrating multiple data sources, building multi-service architectures, and implementing fraud-resistant logic.

**Challenges Faced**

One of the biggest challenges was designing a system that cannot be easily exploited. Simple solutions based only on location or weather were not sufficient, as they could be manipulated.

Another challenge was ensuring that the system remains financially sustainable while still providing meaningful payouts to users. This required careful design of the risk model and payout logic.

We also faced challenges in making the system explainable, ensuring that every decision can be justified clearly.

**Conclusion**

Phoeraksha redefines insurance for the gig economy by combining real-time data, AI-driven risk evaluation, and automated payouts. It creates a system where financial protection is immediate, fair, and resistant to fraud.

By addressing both user needs and system sustainability, Phoeraksha provides a scalable and practical solution for income protection in dynamic environments.
