"use client";

export function BrowserNotSupported() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md text-center">
        <div className="text-4xl mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mx-auto text-yellow-500"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-white mb-3">
          Browser Not Supported
        </h2>

        <p className="text-gray-400 mb-6">
          Your browser does not support the Web Speech API, which is required
          for real-time speech recognition. Please use one of the following
          browsers:
        </p>

        <ul className="text-gray-300 space-y-2 text-sm">
          <li className="flex items-center justify-center gap-2">
            <span className="font-medium">Google Chrome</span>
            <span className="text-gray-500">(recommended)</span>
          </li>
          <li className="flex items-center justify-center gap-2">
            <span className="font-medium">Microsoft Edge</span>
          </li>
          <li className="flex items-center justify-center gap-2">
            <span className="font-medium">Safari 14.1+</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
