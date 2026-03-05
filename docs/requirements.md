# 프로젝트 요구사항

---

## 1. 서비스 개요

**서비스명**: LiveSub (라이브서브)
**한 줄 설명**: 음성을 실시간으로 인식하고 선택한 언어로 번역하여 화면에 자막으로 표시하는 웹 서비스
**목적**: 다국어 대화, 발표, 강연 등에서 언어 장벽을 해소하기 위해, 브라우저만으로 실시간 음성 번역 자막을 제공한다. 별도 앱 설치 없이 웹 브라우저에서 바로 사용 가능한 것이 핵심 가치이다.

---

## 2. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | Next.js 15 (App Router) + TailwindCSS + TypeScript | 단일 페이지 앱, Web Speech API 활용 |
| Backend | Python 3.11+ + FastAPI | 번역 API 프록시 서버 (API 키 보호 목적) |
| Database | SQLite | 세션 기반 번역 로그 임시 저장 (MVP 최소 구성) |
| 패키지 관리 | uv (backend), npm (frontend) | CLAUDE.md PY-2 규칙 참조 |
| STT 엔진 | Web Speech API (브라우저 내장) | 무료, 추가 설정 불필요, Chrome 최적화 |
| 번역 API | Google Cloud Translation API v2 (Basic) | 500,000자/월 무료, 249개 이상 언어 지원 |

**기술 선택 근거:**
- **Web Speech API**: 무료이고 브라우저 내장이라 서버 인프라 불필요. MVP에서 가장 빠르게 STT를 구현할 수 있음
- **FastAPI**: 번역 API 호출 시 API 키를 클라이언트에 노출하지 않기 위한 프록시 서버. 경량이며 비동기 지원
- **Google Cloud Translation v2**: 가장 넓은 언어 지원(249+), 월 500,000자 무료 티어, 빠른 응답 속도
- **SQLite**: MVP에서는 영구 저장이 핵심이 아니므로 최소 구성. 세션 로그 임시 저장 용도

---

## 3. 환경 설정

```
Backend:  http://localhost:8000
Frontend: http://localhost:3000
DB:       livesub.db (SQLite, 프로젝트 루트/backend/livesub.db)
```

### 환경변수 (.env)

```
# Backend
GOOGLE_CLOUD_API_KEY=          # Google Cloud Translation API 키
ALLOWED_ORIGINS=http://localhost:3000
DEBUG=True
```

---

## 4. 데이터 모델

### TranslationSession (번역 세션)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | UUID | PK, auto | 세션 고유 식별자 |
| source_language | String | max_length=10, required | 원본 언어 코드 (예: "ko", "en-US") |
| target_language | String | max_length=10, required | 번역 대상 언어 코드 (예: "en", "ja") |
| created_at | DateTime | auto | 세션 생성 시각 |
| ended_at | DateTime | nullable | 세션 종료 시각 |

### TranslationLog (번역 기록)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | Integer | PK, auto-increment | 기록 고유 식별자 |
| session_id | UUID | FK(TranslationSession.id), required | 소속 세션 |
| original_text | Text | required | 원본 인식 텍스트 |
| translated_text | Text | required | 번역된 텍스트 |
| confidence | Float | nullable, 0.0~1.0 | 음성 인식 신뢰도 |
| created_at | DateTime | auto | 기록 생성 시각 |

### 관계
- TranslationSession 1 : N TranslationLog (하나의 세션에 여러 번역 기록)

```json
{
  "entities": [
    {
      "name": "TranslationSession",
      "fields": [
        { "name": "id", "type": "uuid", "primary_key": true },
        { "name": "source_language", "type": "string", "max_length": 10, "required": true },
        { "name": "target_language", "type": "string", "max_length": 10, "required": true },
        { "name": "created_at", "type": "datetime", "auto": true },
        { "name": "ended_at", "type": "datetime", "nullable": true }
      ]
    },
    {
      "name": "TranslationLog",
      "fields": [
        { "name": "id", "type": "integer", "primary_key": true, "auto_increment": true },
        { "name": "session_id", "type": "uuid", "required": true },
        { "name": "original_text", "type": "text", "required": true },
        { "name": "translated_text", "type": "text", "required": true },
        { "name": "confidence", "type": "float", "nullable": true },
        { "name": "created_at", "type": "datetime", "auto": true }
      ]
    }
  ],
  "relations": [
    { "from": "TranslationLog", "to": "TranslationSession", "type": "many_to_one", "field": "session_id" }
  ]
}
```

---

## 5. API 엔드포인트

```
POST   /api/translate               # 텍스트 번역 요청
GET    /api/languages                # 지원 언어 목록 조회
POST   /api/sessions                 # 번역 세션 생성
PATCH  /api/sessions/{session_id}    # 세션 종료 (ended_at 갱신)
GET    /api/sessions/{session_id}    # 세션 상세 조회 (번역 로그 포함)
POST   /api/sessions/{session_id}/logs  # 번역 로그 추가
GET    /api/sessions/{session_id}/logs  # 세션의 번역 로그 목록 조회
GET    /api/health                   # 서버 상태 확인
```

### 상세 스펙

**POST /api/translate**
- 설명: 텍스트를 지정 언어로 번역
- Request Body:
  ```json
  {
    "text": "안녕하세요",
    "source_language": "ko",
    "target_language": "en"
  }
  ```
- Response 200:
  ```json
  {
    "translated_text": "Hello",
    "source_language": "ko",
    "target_language": "en"
  }
  ```
- Error 400: text가 비어있거나 언어 코드가 유효하지 않은 경우
- Error 500: Google Translation API 호출 실패

**GET /api/languages**
- 설명: 지원되는 언어 목록 반환
- Response 200:
  ```json
  {
    "languages": [
      { "code": "ko", "name": "Korean" },
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "Japanese" }
    ]
  }
  ```

**POST /api/sessions**
- 설명: 새 번역 세션 생성
- Request Body:
  ```json
  {
    "source_language": "ko",
    "target_language": "en"
  }
  ```
- Response 201:
  ```json
  {
    "id": "uuid-string",
    "source_language": "ko",
    "target_language": "en",
    "created_at": "2026-03-05T10:00:00Z"
  }
  ```

**POST /api/sessions/{session_id}/logs**
- 설명: 번역 결과를 세션 로그에 저장
- Request Body:
  ```json
  {
    "original_text": "안녕하세요",
    "translated_text": "Hello",
    "confidence": 0.95
  }
  ```
- Response 201: 생성된 로그 객체 반환

---

## 6. 서비스 플로우

### 주요 시나리오

**시나리오 1: 실시간 음성 번역 자막 시작**
1. 사용자가 웹 페이지에 접속한다
2. 사용자가 원본 언어(음성 인식 언어)를 드롭다운에서 선택한다 (기본값: 한국어)
3. 사용자가 번역 대상 언어를 드롭다운에서 선택한다 (기본값: 영어)
4. 사용자가 "번역 시작" 버튼을 클릭한다
5. 브라우저가 마이크 접근 권한을 요청하고, 사용자가 허용한다
6. 시스템이 백엔드에 세션 생성 요청을 보낸다 (POST /api/sessions)
7. Web Speech API가 continuous 모드로 음성 인식을 시작한다
8. 결과: 마이크가 활성화되고 화면에 "듣는 중..." 상태 표시

**시나리오 2: 실시간 번역 및 자막 표시**
1. 사용자가 말을 하면 Web Speech API가 interim 결과(임시 인식 텍스트)를 반환한다
2. 화면 상단에 원본 텍스트 영역에 interim 텍스트가 흐릿하게 표시된다
3. 음성 인식이 final 결과를 반환하면, 시스템이 백엔드 번역 API(POST /api/translate)를 호출한다
4. 백엔드가 Google Translation API를 호출하여 번역 결과를 반환한다
5. 화면 하단에 번역된 텍스트가 자막 스타일로 표시된다
6. 시스템이 번역 로그를 세션에 저장한다 (POST /api/sessions/{id}/logs)
7. 새로운 자막이 추가되면 화면이 자동 스크롤된다
8. 결과: 원본 텍스트 + 번역 텍스트가 실시간으로 화면에 표시

**시나리오 3: 번역 중지 및 세션 종료**
1. 사용자가 "번역 중지" 버튼을 클릭한다
2. Web Speech API 음성 인식이 중지된다
3. 시스템이 세션 종료 요청을 보낸다 (PATCH /api/sessions/{id})
4. 화면에 "번역 종료" 상태가 표시된다
5. 사용자는 해당 세션의 전체 번역 기록을 화면에서 스크롤하여 확인할 수 있다
6. 결과: 세션이 종료되고 번역 기록이 화면에 유지

**시나리오 4: 자막 표시 설정 변경**
1. 사용자가 설정 패널을 연다
2. 폰트 크기를 조절한다 (소/중/대/특대)
3. 표시 모드를 선택한다 (자막 모드: 하단 고정 / 스크롤 모드: 전체 기록 표시)
4. 변경 사항이 즉시 화면에 반영된다
5. 결과: 사용자 선호에 맞는 자막 표시

### 비즈니스 규칙

- Web Speech API의 ~60초 제한 대응: 인식이 끊기면 자동으로 재시작 (onend 이벤트에서 자동 restart)
- 번역 요청은 final 결과에 대해서만 수행 (interim 결과는 번역하지 않아 API 호출 최소화)
- 빈 텍스트("")나 공백만 있는 인식 결과는 번역하지 않음
- 번역 API 호출 실패 시 원본 텍스트만 표시하고 에러 메시지를 사용자에게 알림

---

## 7. 프론트엔드 기능

### 메인 페이지 (/)
- [x] 원본 언어 선택 드롭다운 (Web Speech API 지원 언어)
- [x] 번역 대상 언어 선택 드롭다운 (Google Translation API 지원 언어)
- [x] 번역 시작/중지 토글 버튼 (마이크 아이콘)
- [x] 마이크 상태 표시 (듣는 중 / 중지됨 / 에러)
- [x] 원본 텍스트 실시간 표시 영역 (interim 결과는 반투명, final 결과는 확정)
- [x] 번역 텍스트 실시간 표시 영역 (자막 스타일)
- [x] 자동 스크롤 (새 텍스트 추가 시)
- [x] 번역 기록 누적 표시 (스크롤 가능한 로그)

### 설정 패널
- [x] 폰트 크기 조절 (14px / 20px / 28px / 40px)
- [x] 표시 모드 전환 (자막 모드: 최근 2줄만 표시 / 스크롤 모드: 전체 기록)
- [x] 원본 텍스트 표시 여부 토글

### 에러 처리 UI
- [x] 마이크 권한 거부 시 안내 메시지
- [x] 브라우저 미지원 시 안내 메시지 (Web Speech API 미지원 브라우저)
- [x] 번역 API 오류 시 토스트 알림
- [x] 네트워크 연결 끊김 시 상태 표시

---

## 8. 비기능 요구사항

- [x] CORS 설정: FastAPI에서 프론트엔드 origin(http://localhost:3000) 허용
- [x] 환경변수 분리: Google Cloud API 키를 .env로 관리, 클라이언트에 노출 금지
- [x] 입력값 유효성 검사:
  - 백엔드: 번역 요청 시 text 비어있는지, 언어 코드 유효한지 검증
  - 프론트엔드: 언어 선택 없이 시작 불가
- [x] 에러 처리: 번역 API 실패 시 사용자에게 토스트 알림, 원본 텍스트는 유지
- [x] 반응형 디자인: 모바일에서도 자막 화면이 잘 보이도록 (발표장에서 태블릿/폰 사용 가능)
- [x] 다크 모드 지원: 자막 가독성을 위해 기본 다크 배경

---

## 9. 제외 범위 (Out of Scope)

> 이번 MVP에서는 구현하지 않는 기능:

- [x] 사용자 인증/권한 (JWT, OAuth) - 누구나 바로 사용 가능하게
- [x] 음성 합성 (TTS) - 번역된 텍스트를 음성으로 읽어주는 기능
- [x] 다중 화자 분리 (Speaker Diarization)
- [x] 녹음 파일 업로드 및 배치 번역
- [x] SRT/자막 파일 내보내기
- [x] 번역 히스토리 영구 저장 및 검색
- [x] WebSocket 기반 실시간 통신 (번역은 REST API로 충분)
- [x] 커스텀 용어집/글로서리 관리
- [x] 다국어 UI (서비스 자체의 다국어 지원)
