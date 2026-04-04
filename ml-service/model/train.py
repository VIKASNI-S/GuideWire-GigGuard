import os
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

# Real Indian city profiles based on actual climate patterns
CITY_PROFILES = {
    "chennai": {"flood_risk": 72, "avg_rain": 140, "avg_temp": 33, "avg_aqi": 85, "coastal": 1},
    "mumbai": {"flood_risk": 85, "avg_rain": 220, "avg_temp": 30, "avg_aqi": 120, "coastal": 1},
    "delhi": {"flood_risk": 45, "avg_rain": 60, "avg_temp": 28, "avg_aqi": 280, "coastal": 0},
    "bangalore": {"flood_risk": 38, "avg_rain": 90, "avg_temp": 26, "avg_aqi": 75, "coastal": 0},
    "kolkata": {"flood_risk": 78, "avg_rain": 180, "avg_temp": 30, "avg_aqi": 160, "coastal": 0},
    "hyderabad": {"flood_risk": 42, "avg_rain": 75, "avg_temp": 30, "avg_aqi": 90, "coastal": 0},
    "pune": {"flood_risk": 40, "avg_rain": 100, "avg_temp": 27, "avg_aqi": 80, "coastal": 0},
    "ahmedabad": {"flood_risk": 35, "avg_rain": 50, "avg_temp": 32, "avg_aqi": 150, "coastal": 0},
    "jaipur": {"flood_risk": 25, "avg_rain": 30, "avg_temp": 34, "avg_aqi": 130, "coastal": 0},
    "lucknow": {"flood_risk": 48, "avg_rain": 80, "avg_temp": 29, "avg_aqi": 200, "coastal": 0},
}

MONTH_MULTIPLIERS = {
    1: 0.85,
    2: 0.85,
    3: 0.90,
    4: 0.95,
    5: 1.05,
    6: 1.35,
    7: 1.50,
    8: 1.45,
    9: 1.30,
    10: 1.10,
    11: 0.90,
    12: 0.85,
}

FEATURE_COLS = [
    "city_flood_risk_score",
    "avg_rainfall_last_30_days",
    "avg_temperature_last_30_days",
    "avg_aqi_last_30_days",
    "worker_experience_years",
    "avg_daily_orders",
    "avg_weekly_income",
    "vehicle_type_encoded",
    "delivery_category_encoded",
    "trust_score",
    "traffic_congestion_avg",
    "working_hours_per_day",
    "month",
    "is_coastal_city",
    "day_of_week",
]

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT, "risk_model.joblib")


def synthetic_row() -> dict:
    city_name = random.choice(list(CITY_PROFILES.keys()))
    city = CITY_PROFILES[city_name]
    month = random.randint(1, 12)
    season_mult = MONTH_MULTIPLIERS[month]

    rain_base = city["avg_rain"] * season_mult
    temp_base = city["avg_temp"]
    aqi_base = city["avg_aqi"]

    return {
        "city_flood_risk_score": city["flood_risk"] + random.uniform(-10, 10),
        "avg_rainfall_last_30_days": max(
            0, rain_base + random.uniform(-rain_base * 0.3, rain_base * 0.3)
        ),
        "avg_temperature_last_30_days": temp_base + random.uniform(-3, 5),
        "avg_aqi_last_30_days": max(30, aqi_base + random.uniform(-40, 60)),
        "worker_experience_years": random.uniform(0, 12),
        "avg_daily_orders": random.uniform(8, 70),
        "avg_weekly_income": random.uniform(3000, 22000),
        "vehicle_type_encoded": random.choice([0, 1, 2, 3]),
        "delivery_category_encoded": random.choice([0, 1, 2]),
        "trust_score": random.uniform(45, 98),
        "traffic_congestion_avg": random.uniform(0.1, 0.90),
        "working_hours_per_day": random.uniform(5, 13),
        "month": month,
        "is_coastal_city": city["coastal"],
        "day_of_week": random.randint(0, 6),
    }


def target_multiplier(row: dict) -> float:
    flood = row["city_flood_risk_score"] / 100
    rain = min(1.0, row["avg_rainfall_last_30_days"] / 400)
    temp_risk = max(0, (row["avg_temperature_last_30_days"] - 30) / 15)
    aqi_risk = min(1.0, row["avg_aqi_last_30_days"] / 350)
    congestion = row["traffic_congestion_avg"]
    trust_discount = (100 - row["trust_score"]) / 100 * 0.15
    experience_discount = min(0.08, row["worker_experience_years"] * 0.006)
    season = MONTH_MULTIPLIERS[int(row["month"])]
    coastal = row["is_coastal_city"] * 0.05

    base = (
        0.80
        + 0.25 * flood
        + 0.15 * rain
        + 0.10 * temp_risk
        + 0.10 * aqi_risk
        + 0.10 * congestion
        + 0.05 * coastal
        + trust_discount
        - experience_discount
    ) * season

    return float(np.clip(base, 0.70, 1.55))


def target_risk_score(row: dict) -> dict:
    env = min(
        100,
        int(
            row["city_flood_risk_score"] * 0.4
            + min(100, row["avg_rainfall_last_30_days"] / 4) * 0.3
            + min(100, row["avg_aqi_last_30_days"] / 3.5) * 0.3
        ),
    )
    behavior = min(
        100,
        int(
            (row["working_hours_per_day"] / 14) * 40
            + (row["avg_daily_orders"] / 80) * 40
            + 20
        ),
    )
    location = min(
        100,
        int(
            row["city_flood_risk_score"] * 0.6
            + row["is_coastal_city"] * 25
            + row["traffic_congestion_avg"] * 30
        ),
    )
    activity = min(
        100,
        int(
            (row["avg_daily_orders"] / 80) * 60
            + (row["working_hours_per_day"] / 14) * 40
        ),
    )
    trust = int(row["trust_score"])
    overall = int((env + behavior + location + activity + (100 - trust)) / 5)
    return {
        "environmental": env,
        "behavior": behavior,
        "location": location,
        "activity": activity,
        "trust": trust,
        "overall": overall,
    }


def train() -> dict:
    print("Generating city-aware synthetic training data (1500 samples)...")
    rows = [synthetic_row() for _ in range(1500)]
    for r in rows:
        r["target"] = target_multiplier(r)

    df = pd.DataFrame(rows)
    X = df[FEATURE_COLS]
    y = df["target"]

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    scores = cross_val_score(model, X, y, cv=5, scoring="r2", n_jobs=-1)
    print(f"Cross-validation R² scores: {scores.round(3)}")
    print(f"Mean R²: {scores.mean():.3f} (+/- {scores.std():.3f})")

    importances = sorted(
        zip(FEATURE_COLS, model.feature_importances_),
        key=lambda x: -x[1],
    )
    print("\nFeature importances:")
    for feat, imp in importances:
        bar = "#" * int(imp * 50)
        print(f"  {feat:<35} {imp:.3f} {bar}")

    payload = {"model": model, "features": FEATURE_COLS}
    joblib.dump(payload, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    return {
        "mean_r2": float(scores.mean()),
        "std_r2": float(scores.std()),
        "cv_scores": [float(s) for s in scores],
    }


if __name__ == "__main__":
    train()
