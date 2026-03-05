import type {
  TranslateRequest,
  TranslateResponse,
  LanguagesResponse,
  CreateSessionRequest,
  Session,
  SessionWithLogs,
  CreateLogRequest,
  TranslationLog,
  LogsResponse,
  HealthResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const API_KEY_STORAGE = {
  google: "livesub_google_api_key",
  openai: "livesub_openai_api_key",
} as const;

export function getStoredApiKey(provider: "google" | "openai"): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE[provider]) ?? "";
}

export function setStoredApiKey(provider: "google" | "openai", key: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.setItem(API_KEY_STORAGE[provider], key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE[provider]);
  }
}

function getApiKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const google = getStoredApiKey("google");
  const openai = getStoredApiKey("openai");
  if (google) headers["X-Google-API-Key"] = google;
  if (openai) headers["X-OpenAI-API-Key"] = openai;
  return headers;
}

class ApiRequestError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getApiKeyHeaders(),
      ...options?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // body may not be JSON
    }
    throw new ApiRequestError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// --- Translate ---

export function translate(data: TranslateRequest): Promise<TranslateResponse> {
  return request<TranslateResponse>("/api/translate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Languages ---

export function getLanguages(): Promise<LanguagesResponse> {
  return request<LanguagesResponse>("/api/languages");
}

// --- Sessions ---

export function createSession(data: CreateSessionRequest): Promise<Session> {
  return request<Session>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function endSession(sessionId: string): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}`, {
    method: "PATCH",
  });
}

export function getSession(sessionId: string): Promise<SessionWithLogs> {
  return request<SessionWithLogs>(`/api/sessions/${sessionId}`);
}

// --- Translation Logs ---

export function createLog(
  sessionId: string,
  data: CreateLogRequest
): Promise<TranslationLog> {
  return request<TranslationLog>(`/api/sessions/${sessionId}/logs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getLogs(sessionId: string): Promise<LogsResponse> {
  return request<LogsResponse>(`/api/sessions/${sessionId}/logs`);
}

// --- Health ---

export function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function testApiKey(provider: "google" | "openai", key: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (provider === "google") headers["X-Google-API-Key"] = key;
  if (provider === "openai") headers["X-OpenAI-API-Key"] = key;
  return request<Record<string, string>>("/api/test-key", {
    method: "POST",
    headers,
  });
}

export { ApiRequestError };
