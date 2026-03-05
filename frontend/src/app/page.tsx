"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, TranslationEntry } from "@/lib/types";
import { getLanguages, translate, createSession, endSession, createLog } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSettings } from "@/hooks/useSettings";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MicButton } from "@/components/MicButton";
import { StatusIndicator } from "@/components/StatusIndicator";
import { TranslationDisplay } from "@/components/TranslationDisplay";
import { SettingsPanel } from "@/components/SettingsPanel";
import { BrowserNotSupported } from "@/components/BrowserNotSupported";
import { ToastContainer, useToasts } from "@/components/Toast";

// Common Speech Recognition language codes (Web Speech API)
const SPEECH_LANGUAGES: Language[] = [
  { code: "ko-KR", name: "Korean" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru-RU", name: "Russian" },
  { code: "ar-SA", name: "Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "vi-VN", name: "Vietnamese" },
  { code: "th-TH", name: "Thai" },
  { code: "it-IT", name: "Italian" },
];

export default function Home() {
  // --- State ---
  const [sourceLanguage, setSourceLanguage] = useState("ko-KR");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [interimText, setInterimText] = useState("");
  const [entries, setEntries] = useState<TranslationEntry[]>([]);

  const [isOnline, setIsOnline] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { toasts, addToast, dismissToast } = useToasts();
  const { settings, isLoaded, setFontSize, setDisplayMode, toggleShowOriginal } =
    useSettings();

  // Refs for values needed in callbacks without causing re-renders
  const sessionIdRef = useRef<string | null>(null);
  const sourceLanguageRef = useRef(sourceLanguage);
  const targetLanguageRef = useRef(targetLanguage);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    sourceLanguageRef.current = sourceLanguage;
  }, [sourceLanguage]);
  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
  }, [targetLanguage]);

  // Track mount for SSR safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Fetch target languages from backend ---
  useEffect(() => {
    let cancelled = false;

    async function fetchLanguages() {
      try {
        const data = await getLanguages();
        if (!cancelled) {
          setTargetLanguages(data.languages);
          setIsLoadingLanguages(false);
        }
      } catch {
        if (!cancelled) {
          // Fallback languages if backend is not available
          setTargetLanguages([
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
            { code: "ja", name: "Japanese" },
            { code: "zh", name: "Chinese" },
            { code: "es", name: "Spanish" },
            { code: "fr", name: "French" },
            { code: "de", name: "German" },
          ]);
          setIsLoadingLanguages(false);
          addToast("Could not fetch languages from server. Using defaults.");
        }
      }
    }

    fetchLanguages();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Online/offline detection ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      addToast("Network connection lost. Translation may not work.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Speech recognition result handler ---
  const handleSpeechResult = useCallback(
    async (result: { transcript: string; isFinal: boolean; confidence: number }) => {
      if (!result.isFinal) {
        setInterimText(result.transcript);
        return;
      }

      // Final result
      setInterimText("");

      const text = result.transcript.trim();
      if (!text) return;

      // Extract the short language code for translation API (e.g., "ko-KR" -> "ko")
      const sourceLangCode = sourceLanguageRef.current.split("-")[0];

      try {
        const translated = await translate({
          text,
          source_language: sourceLangCode,
          target_language: targetLanguageRef.current,
        });

        const entry: TranslationEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          originalText: text,
          translatedText: translated.translated_text,
          confidence: result.confidence,
          timestamp: Date.now(),
        };

        setEntries((prev) => [...prev, entry]);

        // Save log to backend (fire-and-forget)
        const currentSessionId = sessionIdRef.current;
        if (currentSessionId) {
          createLog(currentSessionId, {
            original_text: text,
            translated_text: translated.translated_text,
            confidence: result.confidence ?? null,
          }).catch(() => {
            // Log save failure is not critical
          });
        }
      } catch (err) {
        // Show original text even if translation fails
        const entry: TranslationEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          originalText: text,
          translatedText: `[Translation failed] ${text}`,
          confidence: result.confidence,
          timestamp: Date.now(),
        };
        setEntries((prev) => [...prev, entry]);

        const message =
          err instanceof Error ? err.message : "Translation request failed";
        addToast(message, "error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSpeechError = useCallback(
    (error: string) => {
      addToast(error, "error");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { start: startRecognition, stop: stopRecognition, micStatus, isSupported } =
    useSpeechRecognition({
      language: sourceLanguage,
      onResult: handleSpeechResult,
      onError: handleSpeechError,
    });

  // --- Start / Stop translation ---
  const handleToggle = useCallback(async () => {
    if (isTranslating) {
      // Stop
      stopRecognition();
      setIsTranslating(false);

      if (sessionIdRef.current) {
        try {
          await endSession(sessionIdRef.current);
        } catch {
          // Session end failure is not critical
        }
        setSessionId(null);
      }
    } else {
      // Start
      try {
        const session = await createSession({
          source_language: sourceLanguage.split("-")[0],
          target_language: targetLanguage,
        });
        setSessionId(session.id);
        setIsTranslating(true);
        setEntries([]);
        setInterimText("");
        startRecognition();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create session";
        addToast(message, "error");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranslating, sourceLanguage, targetLanguage, startRecognition, stopRecognition]);

  // --- Browser not supported ---
  if (isMounted && !isSupported) {
    return <BrowserNotSupported />;
  }

  // --- Render ---
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <h1 className="text-lg font-bold text-white tracking-tight">
          LiveSub
        </h1>

        <div className="flex items-center gap-3">
          <StatusIndicator micStatus={micStatus} isOnline={isOnline} />

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            aria-label="Open settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Controls */}
      <section className="px-4 py-4 border-b border-gray-800/50">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          {/* Language selectors */}
          <div className="flex gap-3 flex-1 w-full sm:w-auto">
            <div className="flex-1">
              <LanguageSelector
                label="Source (Speech)"
                languages={SPEECH_LANGUAGES}
                value={sourceLanguage}
                onChange={setSourceLanguage}
                disabled={isTranslating}
              />
            </div>

            {/* Arrow */}
            <div className="flex items-end pb-2.5 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            <div className="flex-1">
              <LanguageSelector
                label="Target (Translation)"
                languages={
                  isLoadingLanguages
                    ? [{ code: "en", name: "Loading..." }]
                    : targetLanguages
                }
                value={targetLanguage}
                onChange={setTargetLanguage}
                disabled={isTranslating || isLoadingLanguages}
              />
            </div>
          </div>

          {/* Mic button */}
          <MicButton
            micStatus={isTranslating ? micStatus : (micStatus === "listening" ? "listening" : "idle")}
            onToggle={handleToggle}
          />
        </div>
      </section>

      {/* Translation display */}
      <section className="flex-1 flex flex-col px-4 py-4 min-h-0">
        <div className="max-w-3xl mx-auto flex-1 flex flex-col w-full min-h-0">
          {isLoaded && (
            <TranslationDisplay
              entries={entries}
              interimText={interimText}
              showOriginal={settings.showOriginal}
              displayMode={settings.displayMode}
              fontSize={settings.fontSize}
            />
          )}
        </div>
      </section>

      {/* Settings panel */}
      <SettingsPanel
        settings={settings}
        onFontSizeChange={setFontSize}
        onDisplayModeChange={setDisplayMode}
        onToggleShowOriginal={toggleShowOriginal}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
