"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from "react-leaflet";
import { STATUS_COLOR } from "./colors";
import type { MapTruck, MapPoint } from "./MapReplay";

export default function FleetMap({ trucks, points, single, height = 480, pings = [] }: { trucks: MapTruck[]; points: Record<string, MapPoint | undefined>; single: boolean; height?: number; pings?: { id: string; driver: string; lat: number; lng: number; demo: boolean }[] }) {
  const first = points[trucks[0]?.id];
  const center: [number, number] = single && first ? [first.lat, first.lng] : [46.3, 23.0];
  return (
    <MapContainer center={center} zoom={single ? 7 : 6} style={{ height, width: "100%", borderRadius: 12 }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trucks.map((t) => <Polyline key={`r-${t.id}`} positions={t.route} pathOptions={{ color: "#1e3a8a", weight: 2, opacity: 0.35, dashArray: "4 6" }} />)}
      {trucks.map((t) => {
        const p = points[t.id];
        if (!p) return null;
        return (
          <CircleMarker key={t.id} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: "#fff", weight: 2, fillColor: STATUS_COLOR[p.status], fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} permanent={!single}>{t.plate}</Tooltip>
            <Popup>
              <b>{t.plate}</b> · {t.driver}<br />{p.status} · lângă {p.place}<br />Traseu: {t.routeName}<br />
              {!single && <a href={`/flota/camion/${t.id}`}>Deschide camionul →</a>}
            </Popup>
          </CircleMarker>
        );
      })}
      {pings.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: "#7c3aed", fillColor: "#a78bfa", fillOpacity: 0.9 }}>
          <Tooltip>{p.driver} (telefon{p.demo ? ", demo" : ""})</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
