import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { adminApi } from "../../services/adminApi";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

type Alert = {
  id: string;
  workerName: string;
  workerCity: string;
  workerPlan: string;
  fraudType: string;
  severity: string;
  confidenceScore: number;
  evidence: Record<string, unknown> | null;
  clusterData: Record<string, unknown> | null;
  resolution: string;
  createdAt: string;
  triggerType: string;
  payoutAmount: string;
};

export function AdminFraudPage() {
  const [items, setItems] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Alert | null>(null);

  async function load() {
    try {
      const { data } = await adminApi.get<{ alerts: Alert[]; stats: Record<string, number> }>(
        `/api/admin/fraud-alerts?type=${encodeURIComponent(type)}`
      );
      setItems(data.alerts ?? []);
      setStats(data.stats ?? {});
      if (!selected && data.alerts.length > 0) setSelected(data.alerts[0]);
    } catch {
      setItems([]);
      setStats({});
      toast.error("Failed to load fraud alerts");
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(id);
  }, [type]);
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-4 gap-3">
        <Stat title="Total Flagged" value={stats.total ?? 0} />
        <Stat title="GPS Spoofing" value={stats.gps_spoofing ?? 0} />
        <Stat title="Neighbor Mismatch" value={stats.neighbor_mismatch ?? 0} />
        <Stat title="Amount Held" value={`₹${Math.round(stats.amountHeld ?? 0)}`} />
      </div>

      <div className="rounded-xl bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <p className="font-semibold">Fraud Detection Cluster Map</p>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All</option>
            <option value="GPS_SPOOFING">GPS_SPOOFING</option>
            <option value="NEIGHBOR_MISMATCH">NEIGHBOR_MISMATCH</option>
            <option value="BEHAVIOR_ANOMALY">BEHAVIOR_ANOMALY</option>
            <option value="DUPLICATE_CLAIM">DUPLICATE_CLAIM</option>
          </select>
        </div>
        <div className="h-72 rounded-lg overflow-hidden">
          <MapContainer center={[13.0827, 80.2707]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Circle center={[13.0827, 80.2707]} radius={2000} pathOptions={{ color: "#ef4444", dashArray: "5 5" }} />
            <Marker position={[13.0827, 80.2707]}>
              <Popup>
                FRAUD: {selected?.fraudType ?? "—"} | {selected?.confidenceScore ?? 0}% confidence
              </Popup>
            </Marker>
            <Polyline positions={[[13.0827, 80.2707], [13.095, 80.282]]} pathOptions={{ color: "#22c55e" }} />
          </MapContainer>
        </div>
      </div>

      {items.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl bg-white p-4 border ${
            a.fraudType === "GPS_SPOOFING"
              ? "border-red-300"
              : a.fraudType === "NEIGHBOR_MISMATCH"
                ? "border-orange-300"
                : a.fraudType === "BEHAVIOR_ANOMALY"
                  ? "border-yellow-300"
                  : "border-purple-300"
          }`}
          onClick={() => setSelected(a)}
        >
          <div className="flex justify-between gap-3">
            <p className="font-semibold">{a.fraudType}</p>
            <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-800 mt-1">
            {a.workerName} — {a.workerPlan} — {a.workerCity}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Trigger: {a.triggerType} | Payout Held: ₹{a.payoutAmount ?? "0"}
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="rounded bg-amber-100 px-2 py-0.5">{a.severity}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">{a.resolution}</span>
            <span className="rounded bg-red-50 px-2 py-0.5">Confidence: {a.confidenceScore}%</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded bg-emerald-600 text-white px-3 py-1 text-xs"
              onClick={async (e) => {
                e.stopPropagation();
                await adminApi.post(`/api/admin/fraud-alerts/${a.id}/approve`);
                await load();
              }}
            >
              Approve Payout
            </button>
            <button
              className="rounded bg-rose-600 text-white px-3 py-1 text-xs"
              onClick={async (e) => {
                e.stopPropagation();
                await adminApi.post(`/api/admin/fraud-alerts/${a.id}/reject`);
                await load();
              }}
            >
              Reject & Penalize
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white p-4 border border-slate-200">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
