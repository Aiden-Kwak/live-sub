"use client";

import { useCallback, useEffect, useState } from "react";
import type { Settings, FontSize, DisplayMode } from "@/lib/types";

const STORAGE_KEY = "livesub-settings";

const DEFAULT_SETTINGS: Settings = {
  fontSize: 20,
  displayMode: "scroll",
  showOriginal: true,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      fontSize: ([14, 20, 28, 40] as FontSize[]).includes(parsed.fontSize as FontSize)
        ? (parsed.fontSize as FontSize)
        : DEFAULT_SETTINGS.fontSize,
      displayMode:
        parsed.displayMode === "subtitle" || parsed.displayMode === "scroll"
          ? parsed.displayMode
          : DEFAULT_SETTINGS.displayMode,
      showOriginal:
        typeof parsed.showOriginal === "boolean"
          ? parsed.showOriginal
          : DEFAULT_SETTINGS.showOriginal,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount (client-side only)
  useEffect(() => {
    setSettingsState(loadSettings());
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback(
    (fontSize: FontSize) => updateSettings({ fontSize }),
    [updateSettings]
  );

  const setDisplayMode = useCallback(
    (displayMode: DisplayMode) => updateSettings({ displayMode }),
    [updateSettings]
  );

  const toggleShowOriginal = useCallback(
    () =>
      setSettingsState((prev) => {
        const next = { ...prev, showOriginal: !prev.showOriginal };
        saveSettings(next);
        return next;
      }),
    []
  );

  return {
    settings,
    isLoaded,
    setFontSize,
    setDisplayMode,
    toggleShowOriginal,
  };
}
