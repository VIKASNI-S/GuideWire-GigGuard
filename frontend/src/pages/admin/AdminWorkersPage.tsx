import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";

type Worker = {
  id: string;
  fullName: string;
  email: string;
  city: string;
  platform: string;
  trustScore: number;
  planName: string;
  status: string;
};

export function AdminWorkersPage() {
  const [items, setItems] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<Worker | null>(null);
  const [tab, setTab] = useState<"profile" | "fraud" | "location" | "payouts">("profile");
  const [fraudItems, setFraudItems] = useState<Array<{ fraudType: string; confidenceScore: number; createdAt: string }>>([]);
  const [trust, setTrust] = useState<{ overall: number; components: Record<string, number>; reasons: string[] } | null>(null);
  const [location, setLocation] = useState<Array<{ latitude: string; longitude: string; recordedAt: string }>>([]);
  const [payouts, setPayouts] = useState<Array<{ amount: string; status: string; createdAt: string }>>([]);

  useEffect(() => {
    void adminApi.get<{ items: Worker[] }>("/api/admin/workers").then((r) => setItems(r.data.items));
  }, []);

  useEffect(() => {
    if (!selected) return;
    void adminApi.get<{ items: Array<{ fraudType: string; confidenceScore: number; createdAt: string }> }>(`/api/admin/workers/${selected.id}/fraud-analysis`).then((r) => setFraudItems(r.data.items));
    void adminApi.get<{ trust: { overall: number; components: Record<string, number>; reasons: string[] } }>(`/api/admin/workers/${selected.id}/trust`).then((r) => setTrust(r.data.trust));
    void adminApi.get<{ items: Array<{ latitude: string; longitude: string; recordedAt: string }> }>(`/api/admin/workers/${selected.id}/location`).then((r) => setLocation(r.data.items));
    void adminApi.get<{ items: Array<{ amount: string; status: string; createdAt: string }> }>(`/api/admin/workers/${selected.id}/payouts`).then((r) => setPayouts(r.data.items));
  }, [selected]);

  return (
    <div className="rounded-xl bg-white p-4 overflow-x-auto relative">
      <p className="font-semibold mb-3">Workers</p>
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-500 border-b">
          <tr><th className="py-2">Worker</th><th>Platform</th><th>City</th><th>Plan</th><th>Trust</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id} className="border-b hover:bg-teal-50">
              <td className="py-2">{w.fullName}<div className="text-xs text-slate-500">{w.email}</div></td>
              <td>{w.platform}</td><td>{w.city}</td><td>{w.planName}</td><td>{w.trustScore}</td>
              <td>
                <button className="rounded bg-slate-900 text-white px-2 py-1 text-xs" onClick={() => setSelected(w)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="fixed right-0 top-0 h-full w-[460px] bg-white border-l border-slate-200 shadow-2xl z-50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-lg">{selected.fullName}</p>
            <button className="text-slate-500" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            {(["profile", "fraud", "location", "payouts"] as const).map((t) => (
              <button
                key={t}
                className={`rounded px-2 py-1 ${tab === t ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "profile" && (
            <div className="mt-4 space-y-2 text-sm">
              <p>Email: {selected.email}</p>
              <p>Platform: {selected.platform}</p>
              <p>City: {selected.city}</p>
              <p>Plan: {selected.planName}</p>
            </div>
          )}
          {tab === "fraud" && (
            <div className="mt-4 space-y-3 text-sm">
              <p className="font-medium">Trust Score: {trust?.overall ?? "—"}/100</p>
              {trust?.components && Object.entries(trust.components).map(([k, v]) => <p key={k}>{k}: {v}</p>)}
              <div className="pt-2 border-t">
                {fraudItems.map((f, i) => (
                  <p key={`${f.createdAt}-${i}`}>{f.fraudType} ({f.confidenceScore}%) — {new Date(f.createdAt).toLocaleString()}</p>
                ))}
              </div>
            </div>
          )}
          {tab === "location" && (
            <div className="mt-4 space-y-2 text-xs">
              {location.map((l, i) => <p key={`${l.recordedAt}-${i}`}>{l.latitude}, {l.longitude} · {new Date(l.recordedAt).toLocaleString()}</p>)}
            </div>
          )}
          {tab === "payouts" && (
            <div className="mt-4 space-y-2 text-xs">
              {payouts.map((p, i) => <p key={`${p.createdAt}-${i}`}>₹{p.amount} · {p.status} · {new Date(p.createdAt).toLocaleString()}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
