"use client";

import type { Settings, FontSize, DisplayMode } from "@/lib/types";

type SettingsPanelProps = {
  settings: Settings;
  onFontSizeChange: (size: FontSize) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onToggleShowOriginal: () => void;
  isOpen: boolean;
  onClose: () => void;
};

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 14, label: "S" },
  { value: 20, label: "M" },
  { value: 28, label: "L" },
  { value: 40, label: "XL" },
];

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "subtitle", label: "Subtitle (last 2)" },
  { value: "scroll", label: "Scroll (all)" },
];

export function SettingsPanel({
  settings,
  onFontSizeChange,
  onDisplayModeChange,
  onToggleShowOriginal,
  isOpen,
  onClose,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close settings"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Font size */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Font Size</label>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onFontSizeChange(opt.value)}
                  className={`
                    flex-1 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                      settings.fontSize === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {settings.fontSize}px
            </p>
          </div>

          {/* Display mode */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Display Mode
            </label>
            <div className="flex gap-2">
              {DISPLAY_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onDisplayModeChange(opt.value)}
                  className={`
                    flex-1 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                      settings.displayMode === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Show original toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-gray-300">
                Show Original Text
              </label>
              <p className="text-xs text-gray-500">
                Display the recognized speech text
              </p>
            </div>
            <button
              onClick={onToggleShowOriginal}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.showOriginal ? "bg-blue-600" : "bg-gray-600"}
              `}
              role="switch"
              aria-checked={settings.showOriginal}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.showOriginal ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
