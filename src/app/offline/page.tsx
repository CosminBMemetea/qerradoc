export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#F7F7F5] text-center">
      <h1 className="text-2xl font-semibold tracking-tight mb-2 text-stone-900">
        Offline
      </h1>
      <p className="text-stone-500 mb-6 max-w-xs leading-relaxed">
        Nu există conexiune. Fișele salvate local rămân disponibile după
        reconectare.
      </p>
      <a
        href="/"
        className="text-indigo-600 font-semibold min-h-[48px] inline-flex items-center px-4"
      >
        Reîncearcă
      </a>
    </div>
  );
}
