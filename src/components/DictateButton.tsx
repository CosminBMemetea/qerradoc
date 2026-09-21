"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

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

const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "network",
]);

export default function DictateButton({
  onResult,
  append = false,
  autoStart = false,
  className = "",
  lang,
}: {
  onResult: (text: string) => void;
  append?: boolean;
  autoStart?: boolean;
  className?: string;
  /** BCP-47 speech language; defaults to app locale speech lang */
  lang?: string;
}) {
  const { t, speechLang } = useI18n();
  const effectiveLang = lang || speechLang;

  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [hint, setHint] = useState("");
  const [interim, setInterim] = useState("");

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const langRef = useRef(effectiveLang);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    langRef.current = effectiveLang;
  }, [effectiveLang]);

  const clearRestartTimer = () => {
    if (restartTimerRef.current != null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    clearRestartTimer();
    setInterim("");
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      setHint(t("dictate.unsupported"));
      wantListeningRef.current = false;
      setListening(false);
      return;
    }
    setUnsupported(false);

    try {
      // Abort any previous instance before creating a new one
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }

      const rec = new Ctor();
      rec.lang = langRef.current;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (ev) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const piece = r[0]?.transcript || "";
          if (r.isFinal) finalChunk += piece;
          else interimChunk += piece;
        }
        finalChunk = finalChunk.trim();
        if (finalChunk) {
          onResultRef.current(finalChunk);
          setInterim("");
        } else {
          setInterim(interimChunk.trim());
        }
      };

      rec.onerror = (ev) => {
        const err = ev.error;
        // Ignore benign ends — Chrome fires these often during continuous listen
        if (err === "no-speech" || err === "aborted") {
          return;
        }
        if (err === "not-allowed") {
          wantListeningRef.current = false;
          setHint(t("dictate.micDenied"));
          setListening(false);
          setInterim("");
          return;
        }
        if (err === "service-not-allowed") {
          wantListeningRef.current = false;
          setHint(t("dictate.service"));
          setListening(false);
          setInterim("");
          return;
        }
        if (err === "network") {
          wantListeningRef.current = false;
          setHint(t("dictate.network"));
          setListening(false);
          setInterim("");
          return;
        }
        // Other non-fatal errors: keep wanting listen; onend will restart
        if (FATAL_ERRORS.has(err)) {
          wantListeningRef.current = false;
          setListening(false);
          setInterim("");
        }
      };

      rec.onend = () => {
        // Chrome drops recognition after silence — auto-restart if user still wants it
        if (wantListeningRef.current) {
          clearRestartTimer();
          restartTimerRef.current = window.setTimeout(() => {
            if (!wantListeningRef.current) return;
            try {
              startRecognition();
            } catch {
              wantListeningRef.current = false;
              setListening(false);
              setInterim("");
            }
          }, 250);
        } else {
          setListening(false);
          setInterim("");
        }
      };

      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setUnsupported(true);
      setHint(t("dictate.unsupported"));
      wantListeningRef.current = false;
      setListening(false);
    }
  }, [t]);

  const start = useCallback(() => {
    setHint("");
    setInterim("");
    wantListeningRef.current = true;
    startRecognition();
  }, [startRecognition]);

  useEffect(() => {
    if (!autoStart) return;
    const tmr = window.setTimeout(() => start(), 400);
    return () => window.clearTimeout(tmr);
  }, [autoStart, start]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // If speech language changes while listening, abort; onend auto-restarts with langRef
  useEffect(() => {
    if (!wantListeningRef.current) return;
    clearRestartTimer();
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, [effectiveLang]);

  if (unsupported && !listening) {
    return (
      <p
        className={`text-sm text-stone-500 dark:text-stone-400 text-center py-2 ${className}`}
        role="status"
      >
        {hint || t("dictate.unsupported")}
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-pressed={listening}
        aria-label={
          listening ? t("dictate.stopAria") : t("dictate.startAria")
        }
        className={`w-full min-h-[56px] rounded-2xl border px-4 py-3 text-base font-semibold inline-flex items-center justify-center gap-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
          listening
            ? "bg-indigo-600 text-white border-indigo-700 shadow-md animate-pulse"
            : "bg-card text-foreground border-border hover:border-indigo-300 active:bg-stone-50 dark:active:bg-stone-800"
        }`}
      >
        <MicIcon listening={listening} />
        {listening ? t("dictate.listening") : t("dictate.listen")}
      </button>
      {interim && listening && (
        <p
          className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2 italic truncate px-2"
          aria-live="polite"
        >
          {interim}
        </p>
      )}
      {hint && !unsupported && (
        <p className="text-xs text-amber-800 dark:text-amber-300 text-center mt-2">
          {hint}
        </p>
      )}
      {append && (
        <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-1.5">
          {t("dictate.appendHint")}
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
