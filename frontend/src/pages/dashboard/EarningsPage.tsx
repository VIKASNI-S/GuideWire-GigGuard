import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import type { PayoutHistoryRow } from "../../types";

export function EarningsPage() {
  const [history, setHistory] = useState<PayoutHistoryRow[]>([]);
  const [stats, setStats] = useState({ totalEarnedWeek: 0, triggersThisWeek: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hist, st] = await Promise.all([
          api.get<{ items: PayoutHistoryRow[] }>("/api/payout/history?limit=50"),
          api.get<{ totalEarnedWeek: number; triggersThisWeek: number }>(
            "/api/payout/stats"
          ),
        ]);
        if (!cancelled) {
          setHistory(hist.data.items);
          setStats(st.data);
        }
      } catch {
        toast.error("Could not load earnings");
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
      <div className="p-8 text-center text-slate-600">Loading earnings…</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-slate-600 text-sm mt-1">
          Auto-credited payouts from parametric triggers this week.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">This week</p>
          <p className="text-3xl font-bold text-emerald-700 mt-2">
            ₹{stats.totalEarnedWeek.toFixed(0)}
          </p>
          <p className="text-sm text-slate-600 mt-1">Total credited</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Triggers</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {stats.triggersThisWeek}
          </p>
          <p className="text-sm text-slate-600 mt-1">Auto-detected events</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
        <h2 className="font-semibold text-slate-900 mb-4">Payout history</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Trigger</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 whitespace-nowrap">
                  {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                </td>
                <td className="py-2 pr-4">{h.reason ?? "—"}</td>
                <td className="py-2 pr-4">₹{h.amount ?? "—"}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      h.status === "credited"
                        ? "bg-emerald-100 text-emerald-800"
                        : h.status === "Under Review"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {h.status ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
