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
  isForced?: boolean;
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

const FORCE_TIMEOUT_MS = 5000;
const FORCE_CHAR_THRESHOLD = 50;

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
  const onErrorRef = useRef(onError);

  // Chunked translation: timer and tracking
  const forceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimStartTimeRef = useRef<number | null>(null);
  const lastForcedTextRef = useRef<string>("");
  const latestInterimRef = useRef<string>("");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearForceTimer = useCallback(() => {
    if (forceTimerRef.current) {
      clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
  }, []);

  const resetInterimTracking = useCallback(() => {
    clearForceTimer();
    interimStartTimeRef.current = null;
    lastForcedTextRef.current = "";
    latestInterimRef.current = "";
  }, [clearForceTimer]);

  const forceEmitInterim = useCallback(() => {
    const text = latestInterimRef.current.trim();
    if (!text || text === lastForcedTextRef.current) return;

    lastForcedTextRef.current = text;
    onResultRef.current({
      transcript: text,
      isFinal: true,
      confidence: 0.5,
      isForced: true,
    });

    // Reset timer for next chunk
    interimStartTimeRef.current = Date.now();
    clearForceTimer();
    forceTimerRef.current = setTimeout(forceEmitInterim, FORCE_TIMEOUT_MS);
  }, [clearForceTimer]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    resetInterimTracking();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setMicStatus("stopped");
  }, [resetInterimTracking]);

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
    resetInterimTracking();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIdx = event.results.length - 1;
      const result = event.results[lastIdx];
      const alt = result[0];

      if (result.isFinal) {
        // Real final result from Web Speech API
        clearForceTimer();
        const finalText = alt.transcript.trim();
        // Reset tracking for next utterance
        interimStartTimeRef.current = null;
        latestInterimRef.current = "";

        onResultRef.current({
          transcript: alt.transcript,
          isFinal: true,
          confidence: alt.confidence,
          isForced: false,
        });
        lastForcedTextRef.current = "";
      } else {
        // Interim result
        latestInterimRef.current = alt.transcript;

        // Start timer on first interim
        if (interimStartTimeRef.current === null) {
          interimStartTimeRef.current = Date.now();
          forceTimerRef.current = setTimeout(forceEmitInterim, FORCE_TIMEOUT_MS);
        }

        // Force emit if character threshold exceeded
        const newText = alt.transcript.trim();
        const forcedText = lastForcedTextRef.current;
        const delta = forcedText ? newText.slice(forcedText.length).trim() : newText;
        if (delta.length >= FORCE_CHAR_THRESHOLD) {
          forceEmitInterim();
        }

        // Still send interim for display
        onResultRef.current({
          transcript: alt.transcript,
          isFinal: false,
          confidence: alt.confidence,
        });
      }
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
  }, [language, resetInterimTracking, clearForceTimer, forceEmitInterim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      resetInterimTracking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [resetInterimTracking]);

  return { start, stop, micStatus, isSupported };
}
