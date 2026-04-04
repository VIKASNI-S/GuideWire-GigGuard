import { useEffect, useState } from "react";
import { api } from "../../services/api";

const EXPLAIN: Record<
  string,
  { title: string; hint: string; risk: boolean }
> = {
  city_flood_risk_score: {
    title: "City flood risk",
    hint: "Based on your city's historical flood exposure",
    risk: true,
  },
  month: {
    title: "Monthly season",
    hint: "June–Sept monsoon season increases risk",
    risk: true,
  },
  avg_rainfall_last_30_days: {
    title: "Avg rainfall",
    hint: "Recent rainfall patterns in your area",
    risk: true,
  },
  avg_aqi_last_30_days: {
    title: "AQI level",
    hint: "Air quality affects health and ride safety",
    risk: true,
  },
  traffic_congestion_avg: {
    title: "Traffic congestion",
    hint: "Dense traffic increases incident exposure",
    risk: true,
  },
  trust_score: {
    title: "Trust score",
    hint: "Higher trust can reduce your premium",
    risk: false,
  },
  worker_experience_years: {
    title: "Worker experience",
    hint: "Experienced riders may see lower premiums",
    risk: false,
  },
  avg_temperature_last_30_days: {
    title: "Temperature",
    hint: "Heat extremes affect rider fatigue risk",
    risk: true,
  },
  working_hours_per_day: {
    title: "Working hours",
    hint: "Longer shifts correlate with exposure time",
    risk: true,
  },
  avg_daily_orders: {
    title: "Daily orders",
    hint: "Activity volume on the road",
    risk: true,
  },
  vehicle_type_encoded: {
    title: "Vehicle type",
    hint: "Vehicle class affects risk profile",
    risk: true,
  },
  delivery_category_encoded: {
    title: "Delivery category",
    hint: "Food vs grocery vs e-commerce patterns",
    risk: true,
  },
  avg_weekly_income: {
    title: "Weekly income",
    hint: "Income level used for exposure calibration",
    risk: false,
  },
  is_coastal_city: {
    title: "Coastal city",
    hint: "Coastal metros face cyclone and flood risk",
    risk: true,
  },
  day_of_week: {
    title: "Day of week",
    hint: "Weekend vs weekday traffic patterns",
    risk: true,
  },
};

type Row = { feature: string; importance: number };

export function PremiumFactorsCard() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ ordered: Row[] }>(
          "/api/ml/feature-importance"
        );
        if (!cancelled) setRows(data.ordered.slice(0, 6));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-64 flex items-center justify-center text-sm text-slate-500">
        Premium factors unavailable (ML service off?)
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-1">What Affects Your Premium</h3>
      <p className="text-xs text-slate-500 mb-4">
        Top factors from the Random Forest model (feature importance)
      </p>
      <ul className="space-y-3">
        {rows.map((r) => {
          const meta = EXPLAIN[r.feature] ?? {
            title: r.feature.replace(/_/g, " "),
            hint: "Model input feature",
            risk: true,
          };
          const pct = Math.round(r.importance * 100);
          const barColor = meta.risk ? "bg-orange-400" : "bg-teal-500";
          return (
            <li key={r.feature}>
              <div className="flex justify-between text-xs font-medium text-slate-800">
                <span>{meta.title}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{meta.hint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
