# Frontend Lessons Learned

### [2026-03-05] | LiveSub
**Agent**: frontend-agent
**Problem**: `SpeechRecognition` type not found - TypeScript cannot find the Web Speech API types (`SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`) even with `"lib": ["dom"]` in tsconfig.
**Solution**: Created a custom type declaration file at `src/types/speech-recognition.d.ts` with all necessary Web Speech API interfaces (`SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`, etc.) and extended the `Window` interface to include `webkitSpeechRecognition`.
**Lesson**: The Web Speech API types are NOT part of the standard TypeScript DOM lib. Always create a `.d.ts` declaration file for browser APIs that TypeScript does not include by default. Do not try to use `@types/dom-speech-recognition` or similar packages -- they may not exist or may be outdated.

### [2026-03-05] | LiveSub
**Agent**: frontend-agent
**Problem**: `create-next-app` prompts for "Would you like to use React Compiler?" interactively, causing the command to hang.
**Solution**: Pipe `echo "no"` to the command: `echo "no" | npx create-next-app@latest frontend ...`
**Lesson**: Next.js 16+ (or latest create-next-app) adds a React Compiler prompt that is not covered by existing CLI flags. Always pipe input or use `--yes` type flags when available to avoid interactive hangs.

### [2026-03-05] | LiveSub
**Agent**: frontend-agent
**Problem**: Using `useCallback` with async API calls that reference state values (sourceLanguage, targetLanguage) can cause stale closures if those values are in the dependency array, leading to unnecessary re-creation of the speech recognition instance.
**Solution**: Store mutable state values in `useRef` and read from refs inside callbacks. This avoids stale closures without requiring the callback to be re-created when state changes.
**Lesson**: For hooks that wrap browser APIs with event handlers (like Web Speech API), prefer using refs for values that change frequently but should not trigger re-initialization. Only put truly structural dependencies in `useCallback` deps.
