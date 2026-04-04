import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field, model_validator

from model.train import FEATURE_COLS, MODEL_PATH, target_risk_score, train

ROOT = Path(__file__).resolve().parent
MODEL_FILE = ROOT / "model" / "risk_model.joblib"

COASTAL_KEYS = ("chennai", "mumbai", "kochi", "vishakhapatnam", "visakhapatnam")


def is_coastal_from_city(city: Optional[str]) -> float:
    if not city:
        return 0.0
    c = city.lower().strip()
    return 1.0 if any(k in c for k in COASTAL_KEYS) else 0.0


class FeaturePayload(BaseModel):
    city_flood_risk_score: float = Field(ge=0, le=100)
    avg_rainfall_last_30_days: float
    avg_temperature_last_30_days: float
    avg_aqi_last_30_days: float
    worker_experience_years: float
    avg_daily_orders: float
    avg_weekly_income: float
    vehicle_type_encoded: float
    delivery_category_encoded: float
    trust_score: float
    traffic_congestion_avg: float = Field(ge=0, le=1)
    working_hours_per_day: float
    month: Optional[float] = None
    is_coastal_city: Optional[float] = None
    day_of_week: Optional[float] = None
    city_name: Optional[str] = None

    def to_row_vector(self) -> list[float]:
        now = datetime.now()
        month = int(self.month) if self.month is not None else now.month
        dow = int(self.day_of_week) if self.day_of_week is not None else now.weekday()
        coastal = self.is_coastal_city
        if coastal is None:
            coastal = is_coastal_from_city(self.city_name)
        return [
            self.city_flood_risk_score,
            self.avg_rainfall_last_30_days,
            self.avg_temperature_last_30_days,
            self.avg_aqi_last_30_days,
            self.worker_experience_years,
            self.avg_daily_orders,
            self.avg_weekly_income,
            self.vehicle_type_encoded,
            self.delivery_category_encoded,
            self.trust_score,
            self.traffic_congestion_avg,
            self.working_hours_per_day,
            float(month),
            float(coastal),
            float(dow),
        ]

    def to_risk_row_dict(self) -> dict[str, Any]:
        now = datetime.now()
        month = int(self.month) if self.month is not None else now.month
        dow = int(self.day_of_week) if self.day_of_week is not None else now.weekday()
        coastal = self.is_coastal_city
        if coastal is None:
            coastal = is_coastal_from_city(self.city_name)
        return {
            "city_flood_risk_score": self.city_flood_risk_score,
            "avg_rainfall_last_30_days": self.avg_rainfall_last_30_days,
            "avg_temperature_last_30_days": self.avg_temperature_last_30_days,
            "avg_aqi_last_30_days": self.avg_aqi_last_30_days,
            "worker_experience_years": self.worker_experience_years,
            "avg_daily_orders": self.avg_daily_orders,
            "avg_weekly_income": self.avg_weekly_income,
            "vehicle_type_encoded": self.vehicle_type_encoded,
            "delivery_category_encoded": self.delivery_category_encoded,
            "trust_score": self.trust_score,
            "traffic_congestion_avg": self.traffic_congestion_avg,
            "working_hours_per_day": self.working_hours_per_day,
            "month": month,
            "is_coastal_city": int(coastal),
            "day_of_week": dow,
        }


class PremiumRequest(BaseModel):
    features: FeaturePayload
    base_premium: float = 70.0
    city_name: Optional[str] = None

    @model_validator(mode="after")
    def merge_city(self):
        if self.city_name and self.features.city_name is None:
            self.features.city_name = self.city_name
        return self


class RiskRequest(BaseModel):
    features: FeaturePayload
    city_name: Optional[str] = None

    @model_validator(mode="after")
    def merge_city(self):
        if self.city_name and self.features.city_name is None:
            self.features.city_name = self.city_name
        return self


app = FastAPI(title="Pheraksha ML", version="2.0.0")

_model_bundle: Optional[dict[str, Any]] = None


def load_model_bundle() -> dict[str, Any]:
    if not MODEL_FILE.exists():
        train()
    data = joblib.load(MODEL_FILE)
    if isinstance(data, dict) and "model" in data:
        return data
    return {"model": data, "features": FEATURE_COLS}


def get_bundle():
    global _model_bundle
    if _model_bundle is None:
        _model_bundle = load_model_bundle()
    return _model_bundle


def reload_bundle():
    global _model_bundle
    _model_bundle = load_model_bundle()
    return _model_bundle


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict-premium")
def predict_premium(body: PremiumRequest):
    bundle = get_bundle()
    model = bundle["model"]
    row = np.array([body.features.to_row_vector()])
    multiplier = float(np.clip(model.predict(row)[0], 0.7, 1.55))
    adjusted = round(body.base_premium * multiplier, 2)
    return {
        "multiplier": multiplier,
        "adjusted_premium": adjusted,
        "base_premium": body.base_premium,
    }


@app.post("/risk-score")
def risk_score(body: RiskRequest):
    if body.city_name and body.features.city_name is None:
        body.features.city_name = body.city_name
    scores = target_risk_score(body.features.to_risk_row_dict())
    return scores


@app.get("/feature-importance")
def feature_importance():
    bundle = get_bundle()
    model = bundle["model"]
    feats = bundle.get("features", FEATURE_COLS)
    pairs = sorted(
        zip(feats, model.feature_importances_.tolist()),
        key=lambda x: -x[1],
    )
    return {
        "importances": {name: float(imp) for name, imp in pairs},
        "ordered": [{"feature": name, "importance": float(imp)} for name, imp in pairs],
    }


@app.post("/retrain")
def retrain():
    metrics = train()
    reload_bundle()
    return {"ok": True, **metrics}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
