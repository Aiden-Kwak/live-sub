"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicStatus } from "@/lib/types";

// Uses global types from src/types/speech-recognition.d.ts

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

type SpeechResult = {
  transcript: string;
  isFinal: boolean;
  confidence: number;
};

type UseSpeechRecognitionOptions = {
  language: string;
  onResult: (result: SpeechResult) => void;
  onError?: (error: string) => void;
};

type UseSpeechRecognitionReturn = {
  start: () => void;
  stop: () => void;
  micStatus: MicStatus;
  isSupported: boolean;
};

export function useSpeechRecognition({
  language,
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const isSupported = typeof window !== "undefined" && getSpeechRecognitionCtor() !== null;

  // Store latest callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setMicStatus("stopped");
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicStatus("error");
      onErrorRef.current?.("Speech recognition is not supported in this browser.");
      return;
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIdx = event.results.length - 1;
      const result = event.results[lastIdx];
      const alt = result[0];

      onResultRef.current({
        transcript: alt.transcript,
        isFinal: result.isFinal,
        confidence: alt.confidence,
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setMicStatus("error");
        onErrorRef.current?.("Microphone access was denied. Please allow microphone access.");
        shouldRestartRef.current = false;
        return;
      }
      if (event.error === "no-speech") {
        // Silence detected, keep listening
        return;
      }
      if (event.error === "aborted") {
        return;
      }
      onErrorRef.current?.(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart for the ~60s limit
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // If restart fails, try creating a new instance
          setMicStatus("error");
          onErrorRef.current?.("Failed to restart speech recognition.");
        }
      } else {
        setMicStatus("stopped");
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
      setMicStatus("listening");
    } catch {
      setMicStatus("error");
      onErrorRef.current?.("Failed to start speech recognition.");
    }
  }, [language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { start, stop, micStatus, isSupported };
}
