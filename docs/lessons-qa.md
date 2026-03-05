# QA Lessons Learned

### 2026-03-05 | LiveSub (Realtime Translation)
**Agent**: qa-agent
**Problem**: React 19 + Next.js 16 strict ESLint rules flagged 3 errors that were common patterns in React 18: (1) updating refs during render (`ref.current = value` directly in hook body), (2) calling `setState` inside `useEffect` for mount-time initialization.
**Fix**: (1) Wrapped ref updates in `useEffect` with dependency arrays. (2) Replaced `useEffect(() => { setIsLoaded(true) }, [])` pattern with `useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)` for SSR hydration detection.
**Lesson**: React 19's ESLint plugin (`react-hooks/refs`, `react-hooks/set-state-in-effect`) is significantly stricter than React 18. The common pattern of `ref.current = callback` in a custom hook body is no longer allowed. Always wrap ref assignments in `useEffect`. For SSR hydration flags, prefer `useSyncExternalStore` over `useState` + `useEffect` to avoid unnecessary re-renders and lint violations.

### 2026-03-05 | LiveSub (Realtime Translation)
**Agent**: qa-agent
**Problem**: API spec documents show datetime values with `Z` suffix (ISO 8601 UTC), but FastAPI/Pydantic actually serializes `datetime.now(timezone.utc)` without the `Z` suffix.
**Fix**: Not fixed (cosmetic only, no functional impact since frontend treats timestamps as opaque strings).
**Lesson**: When designing APIs, explicitly configure datetime serialization format. For FastAPI/Pydantic v2, use `model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat() + "Z"})` or use `AwareDatetime` type to ensure consistent output. Always verify actual serialized output matches the API spec during QA.

### 2026-03-05 | LiveSub (Realtime Translation)
**Agent**: qa-agent
**Problem**: No issues found in front-back data contract. All field names, types, and structures matched perfectly between api-spec.json, frontend TypeScript types, and backend Pydantic schemas.
**Fix**: N/A
**Lesson**: Using snake_case consistently across all layers (API spec, frontend types, backend schemas) eliminates the most common source of front-back contract mismatches. When the frontend uses the same naming convention as the backend (no camelCase conversion), contract verification becomes trivial. This is a good pattern for projects where the frontend team controls both sides.
