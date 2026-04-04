import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import type { PayoutHistoryRow } from "../../types";

export function AlertsPage() {
  const [items, setItems] = useState<PayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ items: PayoutHistoryRow[] }>(
          "/api/payout/history?limit=30"
        );
        if (!cancelled) setItems(data.items);
      } catch {
        toast.error("Could not load alerts");
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
      <div className="p-8 text-center text-slate-600">Loading alerts…</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-600 text-sm mt-1">
          Recent payout events and review status from automated triggers.
        </p>
      </div>

      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 text-sm">
            No recent events yet.
          </li>
        )}
        {items.map((h) => (
          <li
            key={h.id}
            className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <p className="font-medium text-slate-900">{h.reason ?? "Payout event"}</p>
              <p className="text-xs text-slate-500 mt-1">
                {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800">₹{h.amount ?? "—"}</span>
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
