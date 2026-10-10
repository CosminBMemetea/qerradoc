import MapReplay from "@/components/flota/MapReplay";
export default function Harta() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Hartă flotă</h1>
      <p className="text-sm text-slate-500">Poziții simulate pentru 15 octombrie 2026. Mută cursorul sau apasă „Redă ziua”; apasă pe un camion pentru detalii.</p>
      <MapReplay />
    </div>
  );
}
