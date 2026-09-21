"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function DictateButton({
  onResult,
  append = false,
  autoStart = false,
  className = "",
}: {
  onResult: (text: string) => void;
  append?: boolean;
  autoStart?: boolean;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [hint, setHint] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const appendRef = useRef(append);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    appendRef.current = append;
  }, [append]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      setHint("Dictarea nu e disponibilă pe acest browser");
      return;
    }
    setUnsupported(false);
    setHint("");
    try {
      const rec = new Ctor();
      rec.lang = "ro-RO";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (ev) => {
        let chunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) chunk += r[0].transcript;
        }
        chunk = chunk.trim();
        if (chunk) onResultRef.current(chunk);
      };
      rec.onerror = (ev) => {
        if (ev.error === "not-allowed") {
          setHint("Permite accesul la microfon pentru dictare.");
        } else if (ev.error !== "aborted" && ev.error !== "no-speech") {
          setHint("Dictarea s-a oprit. Încearcă din nou.");
        }
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setUnsupported(true);
      setHint("Dictarea nu e disponibilă pe acest browser");
      setListening(false);
    }
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    const t = window.setTimeout(() => start(), 400);
    return () => window.clearTimeout(t);
  }, [autoStart, start]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (unsupported && !listening) {
    return (
      <p
        className={`text-sm text-stone-500 text-center py-2 ${className}`}
        role="status"
      >
        {hint || "Dictarea nu e disponibilă pe acest browser"}
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-pressed={listening}
        aria-label={listening ? "Oprește dictarea" : "Pornește dictarea"}
        className={`w-full min-h-[56px] rounded-2xl border px-4 py-3 text-base font-semibold inline-flex items-center justify-center gap-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          listening
            ? "bg-indigo-600 text-white border-indigo-700 shadow-md animate-pulse"
            : "bg-white text-stone-800 border-stone-200 hover:border-indigo-300 active:bg-stone-50"
        }`}
      >
        <MicIcon listening={listening} />
        {listening ? "Ascult… · Atinge pentru stop" : "Dictează (ro)"}
      </button>
      {hint && !unsupported && (
        <p className="text-xs text-amber-800 text-center mt-2">{hint}</p>
      )}
      {append && (
        <p className="text-[11px] text-stone-400 text-center mt-1.5">
          Textul se adaugă la finalul câmpului
        </p>
      )}
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill={listening ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
