// ============================================================
// API Request / Response types (based on docs/api-spec.json)
// ============================================================

// --- Translate ---

export type TranslateEngine = "google" | "llm";

export type LlmModel = "gpt-4o-mini" | "gpt-4.1-mini" | "gpt-4.1-nano";

export type TranslateRequest = {
  text: string;
  source_language: string;
  target_language: string;
  engine?: TranslateEngine;
  model?: LlmModel;
  context?: string;
  previous_translations?: string[];
};

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type TranslateResponse = {
  translated_text: string;
  source_language: string;
  target_language: string;
  token_usage: TokenUsage | null;
};

// --- Languages ---

export type Language = {
  code: string;
  name: string;
};

export type LanguagesResponse = {
  languages: Language[];
};

// --- Session ---

export type CreateSessionRequest = {
  source_language: string;
  target_language: string;
};

export type Session = {
  id: string;
  source_language: string;
  target_language: string;
  created_at: string;
  ended_at: string | null;
};

export type SessionWithLogs = Session & {
  logs: TranslationLog[];
};

// --- Translation Log ---

export type CreateLogRequest = {
  original_text: string;
  translated_text: string;
  confidence: number | null;
};

export type TranslationLog = {
  id: number;
  session_id: string;
  original_text: string;
  translated_text: string;
  confidence: number | null;
  created_at: string;
};

export type LogsResponse = {
  logs: TranslationLog[];
};

// --- Health ---

export type HealthResponse = {
  status: string;
  timestamp: string;
};

// --- API Error ---

export type ApiError = {
  detail: string;
};

// --- Frontend-only types ---

export type DisplayMode = "subtitle" | "scroll";

export type FontSize = 14 | 20 | 28 | 40;

export type MicStatus = "idle" | "listening" | "stopped" | "error";

export type Settings = {
  fontSize: FontSize;
  displayMode: DisplayMode;
  showOriginal: boolean;
};

export type TranslationEntry = {
  id: string;
  originalText: string;
  translatedText: string;
  confidence: number | null;
  timestamp: number;
  provisional?: boolean;
};
