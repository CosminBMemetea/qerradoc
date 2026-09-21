export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-100 text-center">
      <h1 className="text-2xl font-bold mb-2">Offline</h1>
      <p className="text-slate-600 mb-4">
        Nu există conexiune. Fișele salvate local rămân disponibile după
        reconectare.
      </p>
      <a href="/" className="text-blue-700 font-bold underline">
        Reîncearcă
      </a>
    </div>
  );
}
