import DriverTracker from "@/components/flota/DriverTracker";
export const metadata = { title: "Querra Flotă — șofer (demo)" };
export default function Sofer() {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Aplicația șoferului</h1>
      <p className="text-sm text-slate-600">Planul <b>Start</b>: poziția vine din telefonul șoferului, cât timp pagina e deschisă. Fără aparat GPS montat.</p>
      <DriverTracker />
    </div>
  );
}
