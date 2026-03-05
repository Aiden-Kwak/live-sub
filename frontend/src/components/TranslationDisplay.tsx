"use client";

import { useEffect, useRef } from "react";
import type { TranslationEntry, FontSize } from "@/lib/types";

type TranslationDisplayProps = {
  entries: TranslationEntry[];
  interimText: string;
  showOriginal: boolean;
  fontSize: FontSize;
};

export function TranslationDisplay({
  entries,
  interimText,
  showOriginal,
  fontSize,
}: TranslationDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [entries.length, interimText]);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const history = entries.slice(0, -1);

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Top spacer */}
      <div className="flex-1 min-h-[30%]" />

      {/* History entries */}
      {history.map((entry) => (
        <div key={entry.id} className="px-6 py-3 text-center opacity-40 hover:opacity-70 transition-opacity">
          {showOriginal && (
            <p
              className="text-gray-500 mb-1"
              style={{ fontSize: `${Math.max(fontSize - 6, 11)}px` }}
            >
              {entry.originalText}
            </p>
          )}
          <p
            className="text-gray-400"
            style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
          >
            {entry.translatedText}
          </p>
        </div>
      ))}

      {/* Latest translation — always visible in green until replaced */}
      {latest && (
        <div className="px-6 py-8 text-center">
          <div className="max-w-2xl mx-auto transition-all duration-300">
            {showOriginal && (
              <p
                className="text-gray-400 mb-3"
                style={{ fontSize: `${Math.max(fontSize - 4, 12)}px` }}
              >
                {latest.originalText}
              </p>
            )}
            <p
              className={`font-semibold leading-relaxed ${latest.provisional ? "text-yellow-400/80" : "text-emerald-400"}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {latest.translatedText}
              {latest.provisional && (
                <span className="inline-block ml-2 text-xs text-yellow-500/60 font-normal align-middle">...</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Interim text — shown below the latest while recognizing */}
      <div ref={bottomRef} className="px-6 py-4 text-center min-h-[3em]">
        {interimText ? (
          <div className="max-w-2xl mx-auto">
            <p
              className="text-gray-500 italic animate-pulse"
              style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
            >
              {interimText}
            </p>
          </div>
        ) : !latest ? (
          <p className="text-gray-600 text-lg">
            Translations will appear here
          </p>
        ) : null}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1 min-h-[30%]" />
    </div>
  );
}
