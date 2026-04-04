import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function FixIcon() {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);
  return null;
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 12);
  }, [map, lat, lon]);
  return null;
}

export function RiskMap(props: {
  lat: number;
  lon: number;
  riskLevel: "Low" | "Medium" | "High";
  label: string;
  planName: string;
}) {
  const color = useMemo(() => {
    if (props.riskLevel === "Low") return "#10b981";
    if (props.riskLevel === "Medium") return "#f59e0b";
    return "#ef4444";
  }, [props.riskLevel]);

  const pulse = props.riskLevel === "High";

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={[props.lat, props.lon]}
        zoom={12}
        className="h-full w-full z-0"
        scrollWheelZoom={false}
      >
        <FixIcon />
        <Recenter lat={props.lat} lon={props.lon} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[props.lat, props.lon]}
          radius={5000}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.15,
            className: pulse ? "animate-risk-pulse" : undefined,
          }}
        />
        <Marker position={[props.lat, props.lon]}>
          <Popup>
            {props.label} | {props.planName} | Risk: {props.riskLevel}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
