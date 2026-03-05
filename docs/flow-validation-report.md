# 플로우 정합성 검증 리포트

**날짜**: 2026-03-05
**최종 판정**: PASS

## 1. 산출물 존재 여부

| 파일 | 상태 | 비고 |
|------|------|------|
| docs/service-flow.md | OK | mermaid flowchart, sequenceDiagram, erDiagram 포함 |
| docs/api-spec.md (프로시저) | OK | 8개 엔드포인트, 모든 엔드포인트에 프로시저 포함 |
| docs/api-spec.json | OK | 8개 엔드포인트 정의 |
| docs/data-model.md | OK | 2개 엔티티, DDL, SQLAlchemy 모델 포함 |
| docs/data-model.json | OK | 2개 엔티티, 관계, 인덱스 정의 |

## 2. 시퀀스 다이어그램 <-> API 스펙

### 시퀀스 다이어그램에서 추출한 API 호출

| 다이어그램 내 API 호출 | 위치 | api-spec.md 존재 | api-spec.json 존재 | 판정 |
|----------------------|------|-----------------|-------------------|------|
| POST /api/sessions | 시나리오 1 (번역 시작) | Y | Y | OK |
| POST /api/translate | 시나리오 2 (실시간 번역) | Y | Y | OK |
| POST /api/sessions/{session_id}/logs | 시나리오 2 (실시간 번역) | Y | Y | OK |
| PATCH /api/sessions/{session_id} | 시나리오 3 (번역 중지) | Y | Y | OK |

### 플로우차트에서 추출한 API 호출

| 플로우차트 내 API 호출 | api-spec.md 존재 | api-spec.json 존재 | 판정 |
|----------------------|-----------------|-------------------|------|
| POST /api/sessions | Y | Y | OK |
| POST /api/translate | Y | Y | OK |
| POST /api/sessions/id/logs | Y | Y | OK |
| PATCH /api/sessions/id | Y | Y | OK |

### api-spec에 있지만 시퀀스 다이어그램에 없는 엔드포인트

| 엔드포인트 | 사유 | 판정 |
|-----------|------|------|
| GET /api/languages | 프론트엔드에서 드롭다운 목록 로딩 시 사용. 시퀀스 다이어그램에서 명시적 호출로 표현되지 않았으나, 언어 선택 UI의 데이터 소스로 암묵적 필요 | OK (경고) |
| GET /api/sessions/{session_id} | 세션 상세 조회. 시나리오 3에서 "번역 기록 스크롤 확인" 시 사용 가능하나, 프론트엔드 로컬 상태로도 충분 | OK (경고) |
| GET /api/sessions/{session_id}/logs | 세션 로그 목록 조회. GET /api/sessions/{session_id}와 역할 중복 가능하나, 별도 목록 조회용으로 유효 | OK (경고) |
| GET /api/health | 서버 상태 확인. 에러 처리 플로우의 "네트워크 끊김" 감지에 사용 가능 | OK (경고) |

**판정**: 시퀀스 다이어그램의 모든 API 호출이 api-spec에 존재함. api-spec에만 있는 4개 엔드포인트는 UI 데이터 로딩, 조회, 헬스체크 용도로 시퀀스 흐름에서 생략 가능한 보조 엔드포인트임.

## 3. 프로시저 <-> 데이터 모델

### POST /api/translate

| 참조 항목 | 모델 존재 | 판정 |
|----------|---------|------|
| (DB 참조 없음 - Google API 프록시) | N/A | OK |

### GET /api/languages

| 참조 항목 | 모델 존재 | 판정 |
|----------|---------|------|
| (DB 참조 없음 - Google API 프록시) | N/A | OK |

### POST /api/sessions

| 참조 엔티티/필드 | data-model.md 존재 | data-model.json 존재 | 판정 |
|----------------|-------------------|---------------------|------|
| TranslationSession | Y | Y | OK |
| TranslationSession.source_language | Y (VARCHAR(10), NOT NULL) | Y (string, max_length: 10) | OK |
| TranslationSession.target_language | Y (VARCHAR(10), NOT NULL) | Y (string, max_length: 10) | OK |
| TranslationSession.id (UUID v4) | Y (UUID, PK) | Y (uuid, primary_key) | OK |
| TranslationSession.created_at | Y (DATETIME, NOT NULL) | Y (datetime, auto) | OK |

### PATCH /api/sessions/{session_id}

| 참조 엔티티/필드 | data-model.md 존재 | data-model.json 존재 | 판정 |
|----------------|-------------------|---------------------|------|
| TranslationSession.id | Y | Y | OK |
| TranslationSession.ended_at | Y (DATETIME, Nullable) | Y (datetime, nullable: true) | OK |

### GET /api/sessions/{session_id}

| 참조 엔티티/필드 | data-model.md 존재 | data-model.json 존재 | 판정 |
|----------------|-------------------|---------------------|------|
| TranslationSession (전체 필드) | Y | Y | OK |
| TranslationLog (session_id로 조회) | Y | Y | OK |

### POST /api/sessions/{session_id}/logs

| 참조 엔티티/필드 | data-model.md 존재 | data-model.json 존재 | 판정 |
|----------------|-------------------|---------------------|------|
| TranslationSession.id (FK 확인) | Y | Y | OK |
| TranslationLog.session_id | Y (UUID, FK, NOT NULL) | Y (uuid, foreign_key) | OK |
| TranslationLog.original_text | Y (TEXT, NOT NULL) | Y (text, nullable: false) | OK |
| TranslationLog.translated_text | Y (TEXT, NOT NULL) | Y (text, nullable: false) | OK |
| TranslationLog.confidence | Y (REAL, Nullable, CHECK 0.0~1.0) | Y (float, nullable: true, check) | OK |
| TranslationLog.created_at | Y (DATETIME, NOT NULL) | Y (datetime, auto) | OK |

### GET /api/sessions/{session_id}/logs

| 참조 엔티티/필드 | data-model.md 존재 | data-model.json 존재 | 판정 |
|----------------|-------------------|---------------------|------|
| TranslationSession.id (FK 확인) | Y | Y | OK |
| TranslationLog (session_id, created_at 정렬) | Y | Y | OK |

### GET /api/health

| 참조 항목 | 모델 존재 | 판정 |
|----------|---------|------|
| (DB 참조 없음) | N/A | OK |

## 4. 요구사항 <-> 플로우

### 시나리오 매핑

| 요구사항 기능 (requirements.md) | 플로우 반영 (service-flow.md) | 판정 |
|-------------------------------|------------------------------|------|
| 시나리오 1: 실시간 음성 번역 자막 시작 | 시나리오 1 시퀀스 다이어그램 + 플로우차트 노드 A~G | OK |
| 시나리오 2: 실시간 번역 및 자막 표시 | 시나리오 2 시퀀스 다이어그램 + 플로우차트 노드 H~L | OK |
| 시나리오 3: 번역 중지 및 세션 종료 | 시나리오 3 시퀀스 다이어그램 + 플로우차트 노드 N~R | OK |
| 시나리오 4: 자막 표시 설정 변경 | 시나리오 4 시퀀스 다이어그램 + 플로우차트 노드 S~T | OK |

### 기능 요구사항 매핑

| 요구사항 기능 | 플로우 반영 | 판정 |
|-------------|-----------|------|
| 원본 언어 선택 드롭다운 | 플로우차트 노드 B1 "원본 언어 선택" | OK |
| 번역 대상 언어 선택 드롭다운 | 플로우차트 노드 B2 "번역 대상 언어 선택" | OK |
| 번역 시작/중지 토글 버튼 | 플로우차트 노드 C + 노드 N | OK |
| 마이크 권한 요청 | 플로우차트 판단 노드 D "마이크 권한?" | OK |
| interim 결과 반투명 표시 | 플로우차트 노드 I + 시나리오 2 시퀀스 | OK |
| final 결과 번역 요청 | 플로우차트 노드 J + 시나리오 2 시퀀스 | OK |
| 번역 자막 표시 | 플로우차트 노드 K + 시나리오 2 시퀀스 | OK |
| 번역 로그 저장 | 플로우차트 노드 L + 시나리오 2 시퀀스 | OK |
| 자동 스크롤 | 시나리오 2 시퀀스 "자동 스크롤" 언급 | OK |
| ~60초 인식 끊김 자동 재시작 | 플로우차트 노드 M + 시나리오 2 시퀀스 | OK |
| 세션 종료 | 플로우차트 노드 O + 시나리오 3 시퀀스 | OK |
| 번역 기록 스크롤 확인 | 플로우차트 노드 R | OK |
| 폰트 크기 변경 | 플로우차트 노드 S1 + 시나리오 4 시퀀스 | OK |
| 표시 모드 변경 | 플로우차트 노드 S2 + 시나리오 4 시퀀스 | OK |
| 원본 텍스트 표시 토글 | 플로우차트 노드 S3 + 시나리오 4 시퀀스 | OK |

### 비즈니스 규칙 매핑

| 비즈니스 규칙 | 플로우 반영 | 판정 |
|-------------|-----------|------|
| ~60초 인식 끊김 자동 재시작 | 플로우차트 노드 M + 시나리오 2 "onend -> restart" | OK |
| final 결과에서만 번역 요청 | 플로우차트 분기: interim->표시만, final->번역 요청 | OK |
| 빈 텍스트 번역 방지 | 시나리오 2 시퀀스 "빈 텍스트 여부 검증" | OK |
| 번역 실패 시 원본 텍스트 유지 | 에러 처리 플로우 노드 E | OK |

### 에러 처리 매핑

| 에러 처리 요구사항 | 플로우 반영 | 판정 |
|------------------|-----------|------|
| 마이크 권한 거부 안내 | 에러 처리 플로우 노드 C + 플로우차트 노드 F | OK |
| 브라우저 미지원 안내 | 에러 처리 플로우 노드 D | OK |
| 번역 API 오류 토스트 | 에러 처리 플로우 노드 E | OK |
| 네트워크 연결 끊김 표시 | 에러 처리 플로우 노드 F | OK |

## 5. .md <-> .json 정합성

### API 스펙 (api-spec.md vs api-spec.json)

| 항목 | .md 개수 | .json 개수 | 판정 |
|------|---------|-----------|------|
| 엔드포인트 | 8 | 8 | OK |

**엔드포인트 상세 대조:**

| 엔드포인트 | .md | .json | 판정 |
|-----------|-----|-------|------|
| POST /api/translate | Y | Y (POST /translate) | OK |
| GET /api/languages | Y | Y (GET /languages) | OK |
| POST /api/sessions | Y | Y (POST /sessions) | OK |
| PATCH /api/sessions/{session_id} | Y | Y (PATCH /sessions/{session_id}) | OK |
| GET /api/sessions/{session_id} | Y | Y (GET /sessions/{session_id}) | OK |
| POST /api/sessions/{session_id}/logs | Y | Y (POST /sessions/{session_id}/logs) | OK |
| GET /api/sessions/{session_id}/logs | Y | Y (GET /sessions/{session_id}/logs) | OK |
| GET /api/health | Y | Y (GET /health) | OK |

**비고**: api-spec.json의 path는 base_url("/api")을 제외한 상대 경로로 기술되어 있으며, api-spec.md는 전체 경로("/api/...")를 사용. base_url 결합 시 일치하므로 문제 없음.

### 데이터 모델 (data-model.md vs data-model.json)

| 항목 | .md 개수 | .json 개수 | 판정 |
|------|---------|-----------|------|
| 엔티티 | 2 | 2 | OK |
| 관계 | 1 | 1 | OK |

**엔티티 필드 상세 대조:**

| 엔티티 | 필드명 | .md 타입 | .json 타입 | 판정 |
|--------|--------|---------|-----------|------|
| TranslationSession | id | UUID, PK | uuid, primary_key: true | OK |
| TranslationSession | source_language | VARCHAR(10), NOT NULL | string, max_length: 10, nullable: false | OK |
| TranslationSession | target_language | VARCHAR(10), NOT NULL | string, max_length: 10, nullable: false | OK |
| TranslationSession | created_at | DATETIME, NOT NULL | datetime, nullable: false, auto: true | OK |
| TranslationSession | ended_at | DATETIME, Nullable | datetime, nullable: true | OK |
| TranslationLog | id | INTEGER, PK, AUTOINCREMENT | integer, primary_key: true, auto_increment: true | OK |
| TranslationLog | session_id | UUID, FK, NOT NULL | uuid, nullable: false, foreign_key | OK |
| TranslationLog | original_text | TEXT, NOT NULL | text, nullable: false | OK |
| TranslationLog | translated_text | TEXT, NOT NULL | text, nullable: false | OK |
| TranslationLog | confidence | REAL, Nullable, CHECK | float, nullable: true, check | OK |
| TranslationLog | created_at | DATETIME, NOT NULL | datetime, nullable: false, auto: true | OK |

**인덱스 대조:**

| 인덱스 | .md | .json | 판정 |
|--------|-----|-------|------|
| idx_session_created_at | Y | Y | OK |
| idx_log_session_id | Y | Y | OK |
| idx_log_created_at | Y | Y | OK |

## 6. mermaid 문법

| 다이어그램 | 타입 | 블록 열기/닫기 | 참가자 일관성 | 판정 |
|-----------|------|--------------|-------------|------|
| 전체 서비스 플로우 | flowchart TD | OK | N/A (flowchart) | OK |
| 시나리오 1: 번역 시작 | sequenceDiagram | OK | U, F, B, DB - 일관 | OK |
| 시나리오 2: 실시간 번역 | sequenceDiagram | OK | U, WSA, F, B, G, DB - 일관 | OK |
| 시나리오 3: 번역 중지 | sequenceDiagram | OK | U, WSA, F, B, DB - 일관 | OK |
| 시나리오 4: 설정 변경 | sequenceDiagram | OK | U, F - 일관 | OK |
| 데이터 모델 ERD | erDiagram | OK | 2 엔티티, 관계 정의 일관 | OK |
| 에러 처리 플로우 | flowchart TD | OK | N/A (flowchart) | OK |

**검증 세부 사항:**
- 모든 ```mermaid 블록이 ```으로 정상 종료됨
- flowchart, sequenceDiagram, erDiagram 모두 유효한 다이어그램 타입
- 시퀀스 다이어그램의 participant 정의가 다이어그램 간 일관적 (동일 약어 사용: U=User, F=Frontend, B=Backend, DB=SQLite)
- 플로우차트의 노드 ID가 중복 없이 고유하게 사용됨

## 불일치 목록 (수정 필요)

**불일치 0건** - 모든 검증 항목을 통과하였습니다.

## 경고 사항 (참고)

1. **GET /api/languages가 시퀀스 다이어그램에 미표현**: 언어 선택 드롭다운의 데이터를 로딩하는 시점이 시퀀스 다이어그램에 명시되지 않았습니다. 기능적으로 문제는 없으나, 구현 시 "페이지 로드 시 GET /api/languages 호출" 타이밍을 프론트엔드 개발자가 자체 판단해야 합니다.

2. **GET /api/sessions/{session_id} 및 GET /api/sessions/{session_id}/logs가 시퀀스 다이어그램에 미표현**: 세션 상세 조회와 로그 목록 조회 엔드포인트가 시퀀스에 호출되지 않습니다. 현재 플로우에서는 프론트엔드가 로컬 상태로 번역 기록을 관리하므로 실제 호출이 불필요할 수 있으나, 페이지 새로고침 시 세션 복원 등에 활용될 수 있습니다.

3. **GET /api/health가 시퀀스 다이어그램에 미표현**: 에러 처리 플로우에서 "네트워크 끊김" 감지 시 활용 가능하나, 구체적 호출 타이밍이 시퀀스에 없습니다.

## 권고사항

- 현재 설계 문서 간 정합성은 매우 우수합니다. 모든 핵심 플로우의 API 호출, 데이터 모델 참조, 요구사항 반영이 일관되게 유지되고 있습니다.
- 경고 사항으로 언급한 보조 엔드포인트(languages, session 조회, health)의 호출 타이밍은 구현 단계에서 프론트엔드 개발자가 자연스럽게 결정할 수 있는 수준이므로, 설계 수정 없이 진행해도 무방합니다.
- 필요 시 "페이지 초기 로드" 시퀀스 다이어그램을 추가하여 GET /api/languages 호출 타이밍을 명시할 수 있습니다.
