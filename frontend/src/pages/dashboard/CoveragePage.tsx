import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import type { PlanRow, PolicyRow } from "../../types";

export function CoveragePage() {
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          policy: PolicyRow | null;
          plan: PlanRow | null;
        }>("/api/policy/current");
        if (!cancelled) {
          setPolicy(data.policy);
          setPlan(data.plan);
        }
      } catch {
        toast.error("Could not load coverage");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600">Loading coverage…</div>
    );
  }

  if (!policy || !plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="text-xl font-bold text-amber-900">No active plan</h1>
          <p className="mt-2 text-amber-800 text-sm">
            Choose a plan to activate weekly parametric coverage.
          </p>
          <Link
            to="/plans"
            className="mt-6 inline-flex rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  const premium = policy.adjustedPremium ?? plan.weeklyPremium;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coverage</h1>
        <p className="text-slate-600 text-sm mt-1">
          Policy period, triggers, and payout for your current week.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{plan.name} plan</h2>
          <p className="text-3xl font-bold text-teal-700 mt-2">₹{(Number(premium) - 50).toFixed(0)}/week</p>
          <p className="text-xs text-slate-500 mt-1">ML-adjusted premium</p>
          <p className="text-sm text-slate-600 mt-4">
            Status:{" "}
            <span className="font-medium text-emerald-700 capitalize">
              {policy.status ?? "active"}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Policy window</h2>
          <p className="text-sm text-slate-600 mt-3">
            Start: <span className="font-medium">{policy.startDate}</span>
          </p>
          <p className="text-sm text-slate-600 mt-1">
            End: <span className="font-medium">{policy.endDate}</span>
          </p>
          <p className="text-xs text-slate-500 mt-4">
            One active policy at a time · 7-day rolling coverage
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Trigger thresholds</h2>
        <ul className="text-sm text-slate-700 space-y-2">
          <li>Rainfall (1h) above {plan.rainfallTriggerMm} mm</li>
          <li>
            Heat above {plan.heatTriggerCelsius ?? "—"}°C (plan tier)
          </li>
          <li>AQI above {plan.aqiTrigger ?? "—"}</li>
          <li>
            Traffic congestion above{" "}
            {plan.trafficCongestionTrigger
              ? `${(parseFloat(plan.trafficCongestionTrigger) * 100).toFixed(0)}%`
              : "—"}
          </li>
        </ul>
        <p className="text-xs text-slate-500 mt-4">
          Payout amount per qualifying event: ₹{plan.payoutAmount} (subject to weekly
          limits and fraud checks).
        </p>
      </div>
    </div>
  );
}
