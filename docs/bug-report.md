# Bug Report - LiveSub

---

## Bug #1

**Severity**: Medium
**Location**: `frontend/src/hooks/useSpeechRecognition.ts:44-46`
**Category**: Code Defect (Lint Error)
**Status**: FIXED
**Problem**: Ref values (`onResultRef.current`, `onErrorRef.current`) were being updated directly during render, which violates React 19's strict hooks rules. This could cause components to not update as expected because React may skip re-renders if it detects ref access during render.
**Fix Applied**: Wrapped ref updates in `useEffect` hooks with proper dependency arrays.

---

## Bug #2

**Severity**: Low
**Location**: `frontend/src/hooks/useSettings.ts:53-55`
**Category**: Code Defect (Lint Error)
**Status**: FIXED
**Problem**: `setState` (`setIsLoaded(true)`) was called synchronously inside a `useEffect`, violating the `react-hooks/set-state-in-effect` rule. This causes an unnecessary cascading re-render on mount.
**Fix Applied**: Replaced `useEffect` + `useState` pattern with `useSyncExternalStore` for SSR/client hydration detection, which avoids the re-render entirely.

---

## Bug #3

**Severity**: Low
**Location**: Backend datetime serialization (all endpoints)
**Category**: Minor Inconsistency (Not a functional bug)
**Status**: NOT FIXED (cosmetic only)
**Problem**: The API spec (`api-spec.md`) shows datetime values with `Z` suffix (e.g., `"2026-03-05T10:00:00Z"`), but actual responses omit the `Z` suffix (e.g., `"2026-03-05T04:56:21.505333"`). This is because FastAPI/Pydantic serializes timezone-aware UTC datetimes without the `Z` indicator by default.
**Impact**: No functional impact since the frontend treats `created_at` as an opaque string and does not parse it. However, if a consumer were to parse these timestamps, they might interpret them as local time instead of UTC.
**Recommended Fix**: Configure Pydantic model serialization to include timezone info, or document that all datetimes are UTC.

---

## Bug #4

**Severity**: Low
**Location**: `backend/main.py:3` (python-dotenv usage)
**Category**: Convention Violation
**Status**: NOT FIXED (non-critical)
**Problem**: The requirements specify `django-environ` for environment variable management (PY-4), but this is a FastAPI project, not Django. The project uses `python-dotenv` via `load_dotenv()`, which is the standard approach for FastAPI. This is not a real bug but a mismatch between the general CLAUDE.md conventions (written for Django) and the actual tech stack (FastAPI).
**Impact**: None. Using `python-dotenv` in a FastAPI project is correct.
