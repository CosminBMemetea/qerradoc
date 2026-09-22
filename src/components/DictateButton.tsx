"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";

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

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export default function DictateButton({
  onResult,
  onAudioNote,
  append = false,
  autoStart = false,
  className = "",
  lang,
}: {
  onResult: (text: string) => void;
  /** Optional: keep recorded audio on the fișă as a data URL. */
  onAudioNote?: (dataUrl: string, mime: string) => void;
  append?: boolean;
  autoStart?: boolean;
  className?: string;
  /** Optional BCP-47 override for browser-speech fallback only */
  lang?: string;
}) {
  const { t, locale, speechLang } = useI18n();
  const apiLang: Locale =
    locale === "en" || locale === "pl" || locale === "ro" ? locale : "ro";
  const browserSpeechLang = lang || speechLang;

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hint, setHint] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [browserMode, setBrowserMode] = useState(false);
  const [browserListening, setBrowserListening] = useState(false);
  const [interim, setInterim] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stopRequestedRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onAudioNoteRef = useRef(onAudioNote);
  const tRef = useRef(t);
  const apiLangRef = useRef(apiLang);
  const speechRecRef = useRef<SpeechRecognitionLike | null>(null);
  const wantBrowserRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onAudioNoteRef.current = onAudioNote;
  }, [onAudioNote]);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  useEffect(() => {
    apiLangRef.current = apiLang;
  }, [apiLang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
      setHint(t("dictate.unsupported"));
    }
  }, [t]);

  const cleanupStream = () => {
    mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const transcribeBlob = useCallback(async (blob: Blob, mime: string) => {
    setTranscribing(true);
    setHint("");
    try {
      if (onAudioNoteRef.current) {
        try {
          const dataUrl = await blobToDataUrl(blob);
          if (dataUrl) onAudioNoteRef.current(dataUrl, mime);
        } catch {
          /* audio note is best-effort */
        }
      }

      const form = new FormData();
      const ext = mime.includes("mp4")
        ? "mp4"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("wav")
            ? "wav"
            : "webm";
      form.append("file", blob, `dictate.${ext}`);
      form.append("language", apiLangRef.current);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      let data: { text?: string; error?: string; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }

      if (res.status === 503 && data.error === "missing_key") {
        setHint(tRef.current("dictate.missingKey"));
        return;
      }
      if (!res.ok) {
        setHint(
          data.message ||
            tRef.current("dictate.network")
        );
        return;
      }
      const text = (data.text || "").trim();
      if (text) onResultRef.current(text);
      else setHint(tRef.current("dictate.emptyTranscript"));
    } catch {
      setHint(tRef.current("dictate.network"));
    } finally {
      setTranscribing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopRequestedRef.current = true;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        cleanupStream();
        setRecording(false);
      }
    } else {
      cleanupStream();
      setRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (transcribing || recording) return;
    setHint("");
    setInterim("");
    setBrowserMode(false);
    wantBrowserRef.current = false;
    try {
      speechRecRef.current?.abort();
    } catch {
      /* ignore */
    }

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
      setHint(t("dictate.unsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = pickRecorderMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaChunksRef.current = [];
      stopRequestedRef.current = false;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const usedMime = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type: usedMime });
        cleanupStream();
        setRecording(false);
        if (!stopRequestedRef.current) return;
        if (blob.size < 64) {
          setHint(tRef.current("dictate.emptyTranscript"));
          return;
        }
        void transcribeBlob(blob, usedMime);
      };

      mediaRecorderRef.current = mr;
      mr.start(250);
      setRecording(true);
    } catch {
      setHint(t("dictate.micDenied"));
      cleanupStream();
      setRecording(false);
    }
  }, [recording, t, transcribeBlob, transcribing]);

  const togglePrimary = useCallback(() => {
    if (transcribing) return;
    if (recording) stopRecording();
    else void startRecording();
  }, [recording, startRecording, stopRecording, transcribing]);

  // autoStart → MediaRecorder primary path
  useEffect(() => {
    if (!autoStart) return;
    const tmr = window.setTimeout(() => {
      void startRecording();
    }, 400);
    return () => window.clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / autoStart flip
  }, [autoStart]);

  useEffect(() => {
    return () => {
      stopRequestedRef.current = false;
      try {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      cleanupStream();
      wantBrowserRef.current = false;
      try {
        speechRecRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stopBrowserSpeech = useCallback(() => {
    wantBrowserRef.current = false;
    try {
      speechRecRef.current?.stop();
    } catch {
      /* ignore */
    }
    setBrowserListening(false);
    setInterim("");
  }, []);

  const startBrowserSpeech = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setHint(t("dictate.unsupported"));
      return;
    }
    // Stop MediaRecorder path if active
    if (recording) stopRecording();
    setBrowserMode(true);
    setHint("");
    setInterim("");
    wantBrowserRef.current = true;

    try {
      const rec = new Ctor();
      rec.lang = browserSpeechLang;
      rec.continuous = false;
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
        if (ev.error === "not-allowed") {
          setHint(tRef.current("dictate.micDenied"));
          wantBrowserRef.current = false;
          setBrowserListening(false);
          return;
        }
        if (ev.error === "network") {
          setHint(tRef.current("dictate.network"));
          wantBrowserRef.current = false;
          setBrowserListening(false);
          return;
        }
      };
      rec.onend = () => {
        setBrowserListening(false);
        wantBrowserRef.current = false;
      };
      speechRecRef.current = rec;
      rec.start();
      setBrowserListening(true);
    } catch {
      setHint(t("dictate.unsupported"));
      setBrowserListening(false);
      wantBrowserRef.current = false;
    }
  }, [browserSpeechLang, recording, stopRecording, t]);

  if (unsupported && !recording && !transcribing) {
    return (
      <p
        className={`text-sm text-stone-500 dark:text-stone-400 text-center py-2 ${className}`}
        role="status"
      >
        {hint || t("dictate.unsupported")}
      </p>
    );
  }

  const primaryBusy = recording || transcribing;
  const primaryLabel = transcribing
    ? t("dictate.transcribing")
    : recording
      ? t("dictate.listening")
      : t("dictate.listen");

  return (
    <div className={className}>
      <button
        type="button"
        onClick={togglePrimary}
        disabled={transcribing}
        aria-pressed={recording}
        aria-busy={transcribing}
        aria-label={
          recording ? t("dictate.stopAria") : t("dictate.startAria")
        }
        className={`w-full min-h-[56px] rounded-2xl border px-4 py-3 text-base font-semibold inline-flex items-center justify-center gap-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 disabled:opacity-70 ${
          recording
            ? "bg-indigo-600 text-white border-indigo-700 shadow-md animate-pulse"
            : transcribing
              ? "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-100 dark:border-indigo-800"
              : "bg-card text-foreground border-border hover:border-indigo-300 active:bg-stone-50 dark:active:bg-stone-800"
        }`}
      >
        <MicIcon listening={recording} />
        {primaryLabel}
      </button>

      {hint && (
        <p className="text-xs text-amber-800 dark:text-amber-300 text-center mt-2">
          {hint}
        </p>
      )}

      {append && !hint && !primaryBusy && (
        <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-1.5">
          {t("dictate.appendHint")}
        </p>
      )}

      {browserMode && browserListening && interim && (
        <p
          className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2 italic truncate px-2"
          aria-live="polite"
        >
          {interim}
        </p>
      )}

      {browserMode && browserListening && (
        <button
          type="button"
          onClick={stopBrowserSpeech}
          className="w-full min-h-[44px] mt-2 rounded-2xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-100 px-3 py-2 text-sm font-medium"
        >
          {t("dictate.stopAria")}
        </button>
      )}

      {!browserListening && !recording && !transcribing && (
        <button
          type="button"
          onClick={startBrowserSpeech}
          className="block w-full text-center text-[11px] text-stone-400 dark:text-stone-500 mt-2 underline-offset-2 hover:underline"
        >
          {t("dictate.tryBrowserSpeech")}
        </button>
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
