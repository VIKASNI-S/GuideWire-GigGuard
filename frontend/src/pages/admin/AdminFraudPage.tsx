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
          className={`rounded-xl bg-white p-5 border shadow-sm transition-all cursor-pointer ${
            selected?.id === a.id ? "ring-2 ring-indigo-500 border-indigo-200" : "border-slate-100 hover:border-slate-300"
          }`}
          onClick={() => setSelected(a)}
        >
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{a.fraudType?.replace(/_/g, " ")}</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  a.severity === "High" ? "bg-red-100 text-red-700" : 
                  a.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {a.severity} Severity
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {a.workerName} · {a.workerCity} · {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-rose-600">₹{a.payoutAmount ?? "0"}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Held Amount</p>
            </div>
          </div>

          {/* Evidence Details */}
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Evidence</p>
               <div className="space-y-1.5">
                 {a.fraudType === "GPS_SPOOFING" && a.evidence && (
                   <>
                     <div className="flex justify-between text-xs">
                       <span className="text-slate-500">Distance Jump</span>
                       <span className="font-bold text-slate-900">{(a.evidence as any).distanceJumpKm} km</span>
                     </div>
                     <div className="flex justify-between text-xs">
                       <span className="text-slate-500">Time Interval</span>
                       <span className="font-bold text-slate-900">{(a.evidence as any).timeDiffMins} mins</span>
                     </div>
                     <div className="flex justify-between text-xs">
                       <span className="text-slate-500">Max Possible</span>
                       <span className="font-bold text-slate-900">{(a.evidence as any).expectedMaxKm} km</span>
                     </div>
                   </>
                 )}
                 {a.fraudType === "CLUSTER_FRAUD" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Nearby Support</span>
                      <span className="font-bold text-slate-900 text-rose-600">0 workers found</span>
                    </div>
                 )}
                 {a.fraudType === "BEHAVIORAL_ANOMALY" && a.evidence && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Recent Claims</span>
                      <span className="font-bold text-slate-900">{(a.evidence as any).thisTypeCount} in 30d</span>
                    </div>
                 )}
                 <p className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-200 pt-2">
                   Reason: {(a.evidence as any)?.reason ?? "Under standard review"}
                 </p>
               </div>
            </div>
            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100/50">
               <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Automated Analysis</p>
               <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-600">Confidence Score</span>
                    <span className="font-black text-indigo-700">{a.confidenceScore}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-600">Decision Rule</span>
                    <span className="text-slate-600 font-medium">Auto-Flag on {a.triggerType}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${a.confidenceScore}%` }}></div>
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
              {a.resolution === "pending" ? (
                <>
                  <button
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await adminApi.post(`/api/admin/fraud-alerts/${a.id}/approve`);
                      toast.success("Payout Approved and Trust Score +5 for Worker");
                      await load();
                    }}
                  >
                    Approve Payout
                  </button>
                  <button
                    className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await adminApi.post(`/api/admin/fraud-alerts/${a.id}/reject`);
                      toast.error("Claim Rejected and Trust Score -20 for Worker");
                      await load();
                    }}
                  >
                    Reject & Penalize
                  </button>
                </>
              ) : (
                <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${
                  a.resolution === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {a.resolution}
                </span>
              )}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
               Trigger ID: {a.id.slice(-8)}
            </div>
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
