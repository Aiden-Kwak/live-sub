"use client";

import { useEffect, useRef } from "react";
import type { TranslationEntry, DisplayMode, FontSize } from "@/lib/types";

type TranslationDisplayProps = {
  entries: TranslationEntry[];
  interimText: string;
  showOriginal: boolean;
  displayMode: DisplayMode;
  fontSize: FontSize;
};

export function TranslationDisplay({
  entries,
  interimText,
  showOriginal,
  displayMode,
  fontSize,
}: TranslationDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, interimText]);

  const visibleEntries =
    displayMode === "subtitle" ? entries.slice(-2) : entries;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Original text area (interim) */}
      {showOriginal && (
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Original
          </p>
          <div
            className="min-h-[2em]"
            style={{ fontSize: `${Math.max(fontSize - 4, 12)}px` }}
          >
            {interimText ? (
              <p className="text-gray-400 italic">{interimText}</p>
            ) : entries.length > 0 ? (
              <p className="text-gray-200">
                {entries[entries.length - 1].originalText}
              </p>
            ) : (
              <p className="text-gray-600">
                Waiting for speech...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Translated text area */}
      <div
        ref={scrollRef}
        className={`
          bg-gray-900/80 rounded-xl p-4 border border-gray-700/50 flex-1 min-h-0
          ${displayMode === "scroll" ? "overflow-y-auto" : "overflow-hidden flex flex-col justify-end"}
        `}
      >
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          Translation
        </p>

        {visibleEntries.length === 0 && !interimText ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-center" style={{ fontSize: `${fontSize}px` }}>
              Translations will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="space-y-1">
                {showOriginal && displayMode === "scroll" && (
                  <p
                    className="text-gray-400 text-sm"
                    style={{ fontSize: `${Math.max(fontSize - 6, 11)}px` }}
                  >
                    {entry.originalText}
                  </p>
                )}
                <p
                  className="text-white font-medium leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {entry.translatedText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
