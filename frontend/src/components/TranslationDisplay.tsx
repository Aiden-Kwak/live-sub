"use client";

import { useRef } from "react";
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
  const historyRef = useRef<HTMLDivElement>(null);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const history = entries.slice(0, -1);

  return (
    <div className="flex flex-col h-full">
      {/* Center: latest translation */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {interimText ? (
          <div className="text-center max-w-2xl">
            {showOriginal && (
              <p
                className="text-gray-500 italic mb-3"
                style={{ fontSize: `${Math.max(fontSize - 4, 12)}px` }}
              >
                {interimText}
              </p>
            )}
            <p
              className="text-gray-600 animate-pulse"
              style={{ fontSize: `${fontSize}px` }}
            >
              ...
            </p>
          </div>
        ) : latest ? (
          <div className="text-center max-w-2xl transition-all duration-300">
            {showOriginal && (
              <p
                className="text-gray-400 mb-3"
                style={{ fontSize: `${Math.max(fontSize - 4, 12)}px` }}
              >
                {latest.originalText}
              </p>
            )}
            <p
              className="text-white font-semibold leading-relaxed"
              style={{ fontSize: `${fontSize}px` }}
            >
              {latest.translatedText}
            </p>
          </div>
        ) : (
          <p className="text-gray-600 text-lg">
            Translations will appear here
          </p>
        )}
      </div>

      {/* Bottom: scrollable history */}
      {history.length > 0 && (
        <div
          ref={historyRef}
          className="border-t border-gray-800/50 max-h-40 overflow-y-auto px-4 py-3"
        >
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">
            History
          </p>
          <div className="space-y-1.5">
            {history.map((entry) => (
              <div key={entry.id} className="flex gap-3 text-sm">
                {showOriginal && (
                  <span className="text-gray-500 truncate flex-1">
                    {entry.originalText}
                  </span>
                )}
                <span className="text-gray-300 truncate flex-1">
                  {entry.translatedText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
