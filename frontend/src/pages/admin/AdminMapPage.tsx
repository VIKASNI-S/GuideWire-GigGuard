import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { adminApi } from "../../services/adminApi";

type Row = {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  riskLevel: number;
  planName: string;
  lastPayoutAt: string | null;
  fraudFlags: number;
};

export function AdminMapPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void adminApi.get<{ workers: Row[] }>("/api/admin/live-map").then((r) => setRows(r.data.workers));
  }, []);
  return (
    <div className="rounded-xl bg-white p-3 h-[calc(100vh-64px)]">
      <MapContainer center={[13.0827, 80.2707]} zoom={11} className="h-full w-full rounded-lg">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {rows.map((r) => (
          <CircleMarker
            key={r.id}
            center={[Number(r.latitude), Number(r.longitude)]}
            radius={7}
            pathOptions={{
              color: r.riskLevel > 65 || r.fraudFlags > 0 ? "#ef4444" : r.riskLevel >= 35 ? "#f59e0b" : "#22c55e",
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              {r.name} · {r.planName ?? "No plan"}<br />
              Last payout: {r.lastPayoutAt ? new Date(r.lastPayoutAt).toLocaleString() : "—"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
