# LiveSub

브라우저에서 실시간으로 음성을 인식하고, 선택한 언어로 번역된 자막을 화면에 띄워주는 서비스입니다.

## 주요 기능

- **실시간 음성 인식** — 브라우저 내장 Web Speech API 사용 (별도 STT 서비스 불필요)
- **이중 번역 엔진** — Google Cloud Translation API 또는 OpenAI LLM 선택
- **LLM 모델 선택** — gpt-4.1-nano (기본), gpt-4.1-mini, gpt-4o-mini
- **맥락 기반 번역** — 맥락 입력으로 STT 오류 보정 및 적절한 용어 선택
- **대화 연속성** — 이전 번역 내용을 LLM 프롬프트에 포함하여 일관된 번역 제공
- **청크 번역** — 긴 발화 시 5초/50자 기준으로 중간 번역 표시 후, 최종 결과로 교체
- **API 키 관리** — Settings에서 API 키 입력/테스트, localStorage에 저장
- **세션 로깅** — 번역 기록을 SQLite에 저장
- **화면 커스터마이징** — 글꼴 크기, 원문 표시 여부 설정

## 기술 스택

| 계층 | 스택 |
|------|------|
| 프론트엔드 | Next.js 15, TypeScript, TailwindCSS |
| 백엔드 | FastAPI, SQLAlchemy (async), SQLite |
| 음성 인식 | Web Speech API (브라우저 내장) |
| 번역 | Google Cloud Translation API v2, OpenAI API |

## 시작하기

### 사전 요구사항

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python 패키지 매니저)

### 설치 및 실행

```bash
# 1. 클론
git clone https://github.com/Aiden-Kwak/live-sub.git
cd live-sub

# 2. 백엔드 환경변수 설정
cp backend/.env.example backend/.env
# backend/.env에 API 키 입력 (선택사항 — UI Settings에서도 설정 가능)

# 3. 실행
./start.sh
```

접속 주소:
- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:8000

### API 키 설정

두 가지 방법으로 API 키를 제공할 수 있습니다:
1. **Settings UI** — 톱니바퀴 아이콘 클릭 → 키 입력 → Test → Save (브라우저 localStorage에 저장)
2. **서버 .env** — `backend/.env`에 `GOOGLE_CLOUD_API_KEY`, `OPENAI_API_KEY` 설정

UI에서 입력한 키가 서버 환경변수보다 우선 적용됩니다.

## 사용법

1. 소스 언어(음성)와 타겟 언어(자막)를 선택
2. 엔진 선택: **Google** (빠름) 또는 **LLM** (맥락 인식, 높은 품질)
3. LLM 사용 시, 맥락 입력 가능 (예: "심장학 관련 의학 컨퍼런스")
4. 마이크 버튼 클릭하여 시작
5. 말하면 실시간으로 번역 자막이 표시됩니다

## 프로젝트 구조

```
├── backend/
│   ├── main.py              # FastAPI 앱 진입점
│   ├── schemas.py           # Pydantic 요청/응답 모델
│   ├── models.py            # SQLAlchemy ORM 모델
│   ├── database.py          # 비동기 SQLite 엔진
│   └── routers/
│       ├── translate.py     # POST /api/translate, GET /api/languages, POST /api/test-key
│       ├── sessions.py      # 세션 및 로그 CRUD
│       └── health.py        # GET /api/health
├── frontend/
│   └── src/
│       ├── app/page.tsx     # 메인 페이지
│       ├── components/      # UI 컴포넌트
│       ├── hooks/           # useSpeechRecognition, useSettings
│       └── lib/             # API 클라이언트, 타입
└── start.sh                 # 원클릭 실행 스크립트
```

## 라이선스

MIT
