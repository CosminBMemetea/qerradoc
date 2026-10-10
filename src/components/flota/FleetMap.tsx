"use client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { STATUS_COLOR } from "./colors";
import type { MapTruck, MapPoint } from "./MapReplay";

const pinIcon = (plate: string, color: string, selected: boolean) => L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<div style="position:relative"><div class="flota-pin" style="background:${color};${selected ? "outline:3px solid #2563eb;outline-offset:2px" : ""}">🚚</div><div class="flota-pin-label">${plate}</div></div>`,
});

function Markers({ trucks, points, selected, onSelect, cluster }: { trucks: MapTruck[]; points: Record<string, MapPoint | undefined>; selected?: string; onSelect: (id: string) => void; cluster: boolean }) {
  const map = useMap();
  const group = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  useEffect(() => {
    const g = cluster
      ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, iconCreateFunction: (c) => L.divIcon({ className: "", iconSize: [38, 38], html: `<div class="flota-cluster" style="width:38px;height:38px">${c.getChildCount()}</div>` }) })
      : L.layerGroup();
    g.addTo(map);
    group.current = g;
    return () => { g.remove(); markers.current = {}; };
  }, [map, cluster]);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const tr of trucks) {
      const p = points[tr.id];
      if (!p) continue;
      const icon = pinIcon(tr.plate, STATUS_COLOR[p.status], tr.id === selected);
      let m = markers.current[tr.id];
      if (!m) {
        m = L.marker([p.lat, p.lng], { icon }).on("click", () => onSelect(tr.id));
        markers.current[tr.id] = m;
        g.addLayer(m);
      } else { m.setLatLng([p.lat, p.lng]); m.setIcon(icon); }
    }
    if (cluster) (g as L.MarkerClusterGroup).refreshClusters();
  }, [trucks, points, selected, onSelect, cluster]);
  return null;
}

export default function FleetMap({ trucks, points, single, height = 480, pings = [], selected, onSelect, phoneLabel }: { trucks: MapTruck[]; points: Record<string, MapPoint | undefined>; single: boolean; height?: number; pings?: { id: string; driver: string; lat: number; lng: number; demo: boolean }[]; selected?: string; onSelect: (id: string) => void; phoneLabel: string }) {
  const first = points[trucks[0]?.id];
  const center: [number, number] = single && first ? [first.lat, first.lng] : [46.4, 23.2];
  return (
    <MapContainer center={center} zoom={single ? 7 : 6} style={{ height, width: "100%", borderRadius: 16 }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trucks.map((tr) => <Polyline key={`r-${tr.id}`} positions={tr.route} pathOptions={{ color: tr.id === selected ? "#2563eb" : "#1e3a8a", weight: tr.id === selected ? 4 : 2, opacity: tr.id === selected ? 0.8 : 0.3, dashArray: "4 6" }} />)}
      <Markers trucks={trucks} points={points} selected={selected} onSelect={onSelect} cluster={!single} />
      {pings.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: "#7c3aed", fillColor: "#a78bfa", fillOpacity: 0.9 }}>
          <Tooltip>{p.driver} ({phoneLabel}{p.demo ? ", demo" : ""})</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
