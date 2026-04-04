import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";
import type { PlanRow } from "../types";
import { Shield } from "../components/ui/Icons";

export function PlansPage() {
  const nav = useNavigate();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPlan, setModalPlan] = useState<PlanRow | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ plans: PlanRow[] }>("/api/policy/plans");
        if (!cancelled) setPlans(data.plans);
      } catch {
        toast.error("Could not load plans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmSubscribe() {
    if (!modalPlan) return;
    setSubscribing(true);
    try {
      await api.post("/api/policy/subscribe", { planId: modalPlan.id });
      toast.success(`Subscribed to ${modalPlan.name}!`);
      setModalPlan(null);
      nav("/dashboard");
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error ?? "Subscribe failed");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-teal-500" />
          <span className="font-semibold text-slate-900">Phoeraksha</span>
        </Link>
        <Link to="/dashboard" className="text-sm text-teal-600 font-medium">
          Dashboard →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Choose your plan</h1>
        <p className="text-slate-600 mt-2">
          One active policy at a time. Coverage runs for 7 days.
        </p>

        {loading ? (
          <p className="mt-10 text-slate-500">Loading plans…</p>
        ) : (
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const popular = p.name.toLowerCase() === "standard";
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border bg-white p-6 shadow-sm flex flex-col ${
                    popular ? "ring-2 ring-teal-400 border-teal-300" : "border-slate-200"
                  }`}
                >
                  {popular && (
                    <span className="self-start rounded-full bg-teal-100 text-teal-800 text-xs font-semibold px-3 py-1">
                      Most Popular
                    </span>
                  )}
                  <h2 className="mt-3 text-xl font-bold text-slate-900">{p.name}</h2>
                  <p className="text-3xl font-bold mt-2 text-slate-900">
                    ₹{p.weeklyPremium}
                    <span className="text-base font-normal text-slate-500">/week</span>
                  </p>
                  <ul className="mt-4 text-sm text-slate-600 space-y-2 flex-1">
                    <li>Rainfall trigger &gt; {p.rainfallTriggerMm} mm</li>
                    <li>Heat &gt; {p.heatTriggerCelsius}°C</li>
                    <li>AQI &gt; {p.aqiTrigger}</li>
                    <li>Congestion &gt; {p.trafficCongestionTrigger}</li>
                    <li className="font-semibold text-teal-700">
                      Payout up to ₹{p.payoutAmount}
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setModalPlan(p)}
                    className="mt-6 w-full rounded-lg bg-slate-900 text-white py-2.5 font-semibold hover:bg-slate-800"
                  >
                    Select Plan
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modalPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm subscription</h3>
            <p className="text-slate-600 text-sm mt-2">
              You are subscribing to <strong>{modalPlan.name}</strong> at ₹
              {modalPlan.weeklyPremium}/week. ML-adjusted premium will be shown on your
              dashboard.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 text-slate-600"
                onClick={() => setModalPlan(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={subscribing}
                onClick={confirmSubscribe}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-60"
              >
                {subscribing ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
