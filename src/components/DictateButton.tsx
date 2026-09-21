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

const MAX_AUTO_RESTARTS = 8;
const RESTART_DELAY_MIN_MS = 800;
const RESTART_DELAY_MAX_MS = 1200;
const NETWORK_RETRY_MS = 1500;

function restartDelayMs() {
  return (
    RESTART_DELAY_MIN_MS +
    Math.floor(Math.random() * (RESTART_DELAY_MAX_MS - RESTART_DELAY_MIN_MS + 1))
  );
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
  /** Optional voice-note fallback (MediaRecorder data URL). */
  onAudioNote?: (dataUrl: string, mime: string) => void;
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
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [recordingNote, setRecordingNote] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const networkRetryTimerRef = useRef<number | null>(null);
  const langRef = useRef(effectiveLang);
  const restartCountRef = useRef(0);
  const gotFinalRef = useRef(false);
  const networkFailCountRef = useRef(0);
  const networkRetryPendingRef = useRef(false);
  const startingRef = useRef(false);
  const startRecognitionRef = useRef<() => void>(() => {});
  const tRef = useRef(t);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    langRef.current = effectiveLang;
  }, [effectiveLang]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setUnsupported(true);
      setShowVoiceNote(true);
      setHint(t("dictate.unsupported"));
    }
  }, [t]);

  const clearRestartTimer = () => {
    if (restartTimerRef.current != null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const clearNetworkRetryTimer = () => {
    if (networkRetryTimerRef.current != null) {
      window.clearTimeout(networkRetryTimerRef.current);
      networkRetryTimerRef.current = null;
    }
  };

  const stopRecognitionSoft = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    networkRetryPendingRef.current = false;
    clearRestartTimer();
    clearNetworkRetryTimer();
    setInterim("");
    stopRecognitionSoft();
    setListening(false);
    startingRef.current = false;
  }, []);

  useEffect(() => {
    startRecognitionRef.current = () => {
      const Ctor = getSpeechRecognition();
      if (!Ctor) {
        setUnsupported(true);
        setShowVoiceNote(true);
        setHint(tRef.current("dictate.unsupported"));
        wantListeningRef.current = false;
        setListening(false);
        return;
      }
      setUnsupported(false);

      if (startingRef.current) return;
      startingRef.current = true;

      try {
        // Soft-stop previous instance only — never abort()+start in a tight loop
        stopRecognitionSoft();

        const rec = new Ctor();
        rec.lang = langRef.current;
        // Short utterance mode — avoids Chrome continuous/network hammering
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
            gotFinalRef.current = true;
            networkFailCountRef.current = 0;
            onResultRef.current(finalChunk);
            setInterim("");
          } else {
            setInterim(interimChunk.trim());
          }
        };

        rec.onerror = (ev) => {
          const err = ev.error;
          if (err === "no-speech" || err === "aborted") {
            return;
          }
          if (err === "not-allowed") {
            wantListeningRef.current = false;
            clearRestartTimer();
            clearNetworkRetryTimer();
            setHint(tRef.current("dictate.micDenied"));
            setShowVoiceNote(true);
            setListening(false);
            setInterim("");
            return;
          }
          if (err === "service-not-allowed") {
            wantListeningRef.current = false;
            clearRestartTimer();
            clearNetworkRetryTimer();
            setHint(tRef.current("dictate.service"));
            setShowVoiceNote(true);
            setListening(false);
            setInterim("");
            return;
          }
          if (err === "network") {
            networkFailCountRef.current += 1;
            if (networkFailCountRef.current === 1 && wantListeningRef.current) {
              clearNetworkRetryTimer();
              clearRestartTimer();
              networkRetryPendingRef.current = true;
              setHint(tRef.current("dictate.networkRetry"));
              networkRetryTimerRef.current = window.setTimeout(() => {
                networkRetryPendingRef.current = false;
                if (!wantListeningRef.current) return;
                startingRef.current = false;
                stopRecognitionSoft();
                startRecognitionRef.current();
              }, NETWORK_RETRY_MS);
              return;
            }
            wantListeningRef.current = false;
            networkRetryPendingRef.current = false;
            clearRestartTimer();
            clearNetworkRetryTimer();
            setHint(tRef.current("dictate.networkHint"));
            setShowVoiceNote(true);
            setListening(false);
            setInterim("");
            stopRecognitionSoft();
            return;
          }
        };

        rec.onend = () => {
          startingRef.current = false;
          if (!wantListeningRef.current) {
            setListening(false);
            setInterim("");
            return;
          }
          // Network retry owns the next start — do not double-restart from onend
          if (networkRetryPendingRef.current) {
            return;
          }
          if (restartCountRef.current >= MAX_AUTO_RESTARTS) {
            wantListeningRef.current = false;
            setListening(false);
            setInterim("");
            setHint(tRef.current("dictate.tapAgain"));
            return;
          }
          gotFinalRef.current = false;
          clearRestartTimer();
          restartTimerRef.current = window.setTimeout(() => {
            if (!wantListeningRef.current) return;
            restartCountRef.current += 1;
            startRecognitionRef.current();
          }, restartDelayMs());
        };

        recRef.current = rec;
        rec.start();
        setListening(true);
        startingRef.current = false;
      } catch {
        startingRef.current = false;
        setUnsupported(true);
        setShowVoiceNote(true);
        setHint(tRef.current("dictate.unsupported"));
        wantListeningRef.current = false;
        setListening(false);
      }
    };
  }, []);

  const start = useCallback(() => {
    setHint("");
    setInterim("");
    restartCountRef.current = 0;
    networkFailCountRef.current = 0;
    networkRetryPendingRef.current = false;
    gotFinalRef.current = false;
    clearRestartTimer();
    clearNetworkRetryTimer();
    wantListeningRef.current = true;
    startRecognitionRef.current();
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    const tmr = window.setTimeout(() => start(), 400);
    return () => window.clearTimeout(tmr);
  }, [autoStart, start]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      clearNetworkRetryTimer();
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      try {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // Language change while listening: soft stop — onend restarts with new lang
  useEffect(() => {
    if (!wantListeningRef.current) return;
    clearRestartTimer();
    stopRecognitionSoft();
  }, [effectiveLang]);

  const stopVoiceNote = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startVoiceNote = useCallback(async () => {
    if (!onAudioNote) return;
    if (recordingNote) {
      stopVoiceNote();
      return;
    }
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const usedMime = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type: usedMime });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || "");
          if (dataUrl) onAudioNote(dataUrl, usedMime);
          setHint(t("dictate.voiceNoteSaved"));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((tr) => tr.stop());
        mediaStreamRef.current = null;
        setRecordingNote(false);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordingNote(true);
      setHint(t("dictate.voiceNoteRecording"));
    } catch {
      setHint(t("dictate.micDenied"));
      setRecordingNote(false);
    }
  }, [onAudioNote, recordingNote, stop, stopVoiceNote, t]);

  if (unsupported && !listening && !onAudioNote) {
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
      {!unsupported && (
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
      )}
      {interim && listening && (
        <p
          className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2 italic truncate px-2"
          aria-live="polite"
        >
          {interim}
        </p>
      )}
      {hint && (
        <p className="text-xs text-amber-800 dark:text-amber-300 text-center mt-2">
          {hint}
        </p>
      )}
      {append && !showVoiceNote && (
        <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-1.5">
          {t("dictate.appendHint")}
        </p>
      )}
      {onAudioNote && (showVoiceNote || unsupported) && (
        <button
          type="button"
          onClick={startVoiceNote}
          aria-pressed={recordingNote}
          className={`w-full min-h-[48px] mt-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            recordingNote
              ? "bg-rose-600 text-white border-rose-700 animate-pulse"
              : "bg-card text-foreground border-border hover:border-rose-300"
          }`}
        >
          {recordingNote
            ? t("dictate.voiceNoteStop")
            : t("dictate.voiceNote")}
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
