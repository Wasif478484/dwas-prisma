// Web Speech helpers (spec C01, D11, T01). Feature-detect everything and
// never throw when unsupported — typed fallback is mandatory per the spec.
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

// Dictation hook: live interim text in an editable textarea (C01), 30s cap,
// stop on silence handled by the engine. Feature-detect; report denial.
export function useDictation(lang: "ur-PK" | "en-PK") {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Feature-detect through useSyncExternalStore: the server snapshot matches
  // SSR markup and the client snapshot re-renders after hydration (no mismatch).
  const supported = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window === "undefined" ? true : speechSupported()),
    () => true,
  );
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      if (capRef.current) clearTimeout(capRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    if (capRef.current) clearTimeout(capRef.current);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    try {
      recRef.current?.abort();
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        let interimText = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? "";
          if (result.isFinal) finalChunk += transcript;
          else interimText += transcript;
        }
        if (finalChunk) setFinalText((prev) => (prev ? `${prev} ` : "") + finalChunk.trim());
        setInterim(interimText);
      };
      rec.onerror = (event) => {
        setError(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : event.error);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      setError(null);
      setFinalText("");
      setInterim("");
      rec.start();
      recRef.current = rec;
      setListening(true);
      // 30s cap per spec C01.
      capRef.current = setTimeout(() => stop(), 30_000);
    } catch {
      setError("unavailable");
      setListening(false);
    }
  }, [lang, stop]);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
    setError(null);
  }, []);

  return { listening, finalText, interim, error, supported, start, stop, reset, setFinalText };
}

// Read-aloud helper (D11/C21): speechSynthesis first, ur-PK voice when the
// language needs it. No bundled audio pack in this build — the browser voice
// is the fallback and text is always visible on screen.
export function speak(text: string, lang: "ur-PK" | "en-PK" = "ur-PK"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === "ur-PK" ? 0.9 : 1;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
    if (match) utterance.voice = match;
    window.speechSynthesis.speak(utterance);
  } catch {
    // never throw — speech is an enhancement, not a requirement
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
