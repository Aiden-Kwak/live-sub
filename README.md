# LiveSub

Real-time speech-to-text translation subtitle service. Listen to speech in one language and display translated subtitles in another — live in your browser.

## Features

- **Real-time STT** — Browser-native Web Speech API (no external STT service needed)
- **Dual translation engine** — Google Cloud Translation API or OpenAI LLM
- **LLM model selection** — gpt-4.1-nano (default), gpt-4.1-mini, gpt-4o-mini
- **Context-aware translation** — Provide context to help LLM correct STT errors and choose better terminology
- **Conversation continuity** — Previous translations included in LLM prompt for consistent terminology
- **Chunked translation** — Long speech auto-translates in chunks (5s timeout / 50 char threshold), then replaces with final result
- **API key management** — Input and test API keys in Settings, stored in localStorage
- **Session logging** — Translation history saved to SQLite via session API
- **Customizable display** — Font size, show/hide original text

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, TypeScript, TailwindCSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| STT | Web Speech API (browser-native) |
| Translation | Google Cloud Translation API v2, OpenAI API |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Setup

```bash
# 1. Clone
git clone https://github.com/Aiden-Kwak/live-sub.git
cd live-sub

# 2. Backend env
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys (optional — can also set in UI Settings)

# 3. Run
./start.sh
```

Opens at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### API Keys

You can provide API keys in two ways:
1. **Settings UI** — Click the gear icon → enter keys → Test → Save (stored in browser localStorage)
2. **Server .env** — Set `GOOGLE_CLOUD_API_KEY` and/or `OPENAI_API_KEY` in `backend/.env`

UI keys take priority over server env vars.

## Usage

1. Select source language (speech) and target language (subtitles)
2. Choose engine: **Google** (fast) or **LLM** (context-aware, higher quality)
3. If using LLM, optionally set context (e.g., "Medical conference about cardiology")
4. Click the mic button to start
5. Speak — translations appear in real-time

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── schemas.py           # Pydantic request/response models
│   ├── models.py            # SQLAlchemy ORM models
│   ├── database.py          # Async SQLite engine
│   └── routers/
│       ├── translate.py     # POST /api/translate, GET /api/languages, POST /api/test-key
│       ├── sessions.py      # Session & log CRUD
│       └── health.py        # GET /api/health
├── frontend/
│   └── src/
│       ├── app/page.tsx     # Main page
│       ├── components/      # UI components
│       ├── hooks/           # useSpeechRecognition, useSettings
│       └── lib/             # API client, types
└── start.sh                 # One-command startup script
```

## License

MIT
