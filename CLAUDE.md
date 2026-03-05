# LiveSub (라이브서브)

> **아이디어만 있을 때**: `/start-ideation`을 실행하세요. 레퍼런스 조사 → requirements.md 자동 생성.
> **요구사항이 준비되면**: `/start-dev`를 실행하세요. 설계 → 구현 → QA까지 자동 진행.

---

## 프로젝트 개요

음성을 실시간으로 인식하고 선택한 언어로 번역하여 화면에 자막으로 표시하는 웹 서비스.
다국어 대화, 발표, 강연 등에서 언어 장벽을 해소하기 위해, 브라우저만으로 실시간 음성 번역 자막을 제공한다.
별도 앱 설치 없이 웹 브라우저에서 바로 사용 가능한 것이 핵심 가치.

- **STT**: Web Speech API (브라우저 내장, 무료)
- **번역**: Google Cloud Translation API v2 (FastAPI 프록시 경유, API 키 보호)
- **세션/로그**: SQLite에 임시 저장 (MVP 최소 구성)

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | Next.js 15 (App Router) + TailwindCSS + TypeScript | 단일 페이지, Web Speech API |
| Backend | Python 3.11+ + FastAPI | 번역 API 프록시 (API 키 보호) |
| Database | SQLite | 세션/로그 임시 저장 (backend/livesub.db) |
| 패키지 관리 | uv (backend), npm (frontend) | |
| STT | Web Speech API (브라우저 내장) | Chrome 최적화 |
| 번역 | Google Cloud Translation API v2 | 월 500,000자 무료 |

---

## 프로젝트 구조

> 개발이 진행되면서 자동으로 업데이트됩니다.

---

## 에이전트 역할 및 개발 워크플로우

```
[0] requirements-validator →  docs/requirements.md 완성도 검증
                           →  모호성 점수 산정 (≤0.3 PASS, >0.5 FAIL)
                           →  docs/requirements-validation-report.md 생성
                           →  FAIL 시 사용자에게 보완 요청
         ↓
[1] design-agent           →  docs/requirements.md 읽기
                           →  docs/service-flow.md (mermaid 필수)
                           →  docs/api-spec.md + 프로시저, docs/data-model.md
                           →  docs/api-spec.json, docs/data-model.json 생성
         ↓
[1.5] flow-validator       →  설계 문서 간 정합성 검증
                           →  docs/flow-validation-report.md 생성
                           →  FAIL 시 design-agent 재호출 (최대 3회, 이후 접근 전환)
         ↓
[2] planning-agent         →  설계 문서(md + json) 읽기
                           →  개발 태스크 등록 (TaskCreate) + docs/dev-plan.md 생성
         ↓
[3] db-agent               →  설계 문서 + dev-plan 읽기 → 백엔드/DB 구현
    frontend-agent         →  설계 문서 + dev-plan 읽기 → 프론트엔드 구현  (병렬)
         ↓
[4] qa-agent               →  코드 리뷰 + 테스트 작성
                           →  curl E2E 테스트 (서비스 플로우 기반)
                           →  프론트-백 데이터 계약 검증
                           →  docs/qa-report.md 생성
                           →  발견된 교훈을 CLAUDE.md ## 누적 교훈에 기록
```

> 파이프라인은 **체크포인트 기반 resume**을 지원합니다.
> 중단 후 `/start-dev` 재실행 시 `docs/.pipeline-state.json`을 읽어 마지막 완료 단계부터 이어서 진행합니다.

### 에이전트 호출 방법

```
Task(subagent_type: "requirements-validator-agent", prompt: "...")
Task(subagent_type: "design-agent",                 prompt: "...")
Task(subagent_type: "flow-validator-agent",         prompt: "...")
Task(subagent_type: "planning-agent",               prompt: "...")
Task(subagent_type: "db-agent",                     prompt: "...")
Task(subagent_type: "frontend-agent",               prompt: "...")
Task(subagent_type: "qa-agent",                     prompt: "...")
```

### 병렬 실행 (독립적인 작업은 한 번에)

```
# 한 메시지에 두 Task를 동시에 호출하면 병렬 실행됨
Task(db-agent, run_in_background: true)
Task(frontend-agent, run_in_background: true)
```

---

## 구현 베스트 프랙티스

### 0 — 목적

이 규칙은 유지보수성, 안전성, 개발 속도를 보장합니다.
**MUST** 규칙은 반드시 준수하며, **SHOULD** 규칙은 강력히 권장합니다.

---

### 1 — 코딩 전

- **BP-1 (MUST)** 작업 시작 전 `docs/requirements.md`와 모든 설계 문서를 먼저 읽을 것.
- **BP-2 (MUST)** 복잡한 작업은 접근 방식을 먼저 정리하고 확인할 것.
- **BP-3 (SHOULD)** 2가지 이상의 접근법이 있으면 장단점을 명시하고 선택 근거를 남길 것.

---

### 2 — 코딩 중

- **C-1 (MUST)** TDD 순서 준수: 스텁 작성 → 실패 테스트 작성 → 구현.
- **C-2 (MUST)** 기존 코드베이스의 도메인 용어와 일관된 함수/변수명 사용.
- **C-3 (SHOULD NOT)** 작은 함수로 충분한 경우 클래스 도입 금지.
- **C-4 (SHOULD)** 단순하고 조합 가능하며 테스트 가능한 함수 선호.
- **C-5 (SHOULD NOT)** 재사용, 독립적 테스트, 가독성 개선 목적이 아니면 함수 추출 금지.
- **C-6 (SHOULD NOT)** 자명한 코드에 주석 추가 금지. 핵심 주의사항에만 사용.

#### Backend (Python)

- **PY-1 (MUST)** PEP8 준수, 모든 함수에 type hints 작성.
- **PY-2 (MUST)** 패키지 관리는 `uv` 사용. `pip` 직접 호출 금지.
  ```bash
  uv add django-environ          # 패키지 추가
  uv add --dev pytest            # 개발 의존성
  uv sync                        # requirements 설치
  ```
- **PY-3 (MUST)** 의존성은 반드시 `requirements.txt`에 기록. `uv pip compile pyproject.toml -o requirements.txt`로 생성.
- **PY-4 (MUST)** 비밀 키 관리는 `django-environ`으로 통일. `python-dotenv` 사용 금지.
  ```python
  # settings.py
  import environ
  env = environ.Env()
  environ.Env.read_env(BASE_DIR / ".env")

  SECRET_KEY = env("SECRET_KEY")
  DATABASE_URL = env.db("DATABASE_URL")
  DEBUG = env.bool("DEBUG", default=False)
  ```
- **PY-5 (MUST)** `.env`는 절대 커밋 금지. `.env.example`에 키 이름만 남기고 값은 비울 것.
  ```
  # .env.example
  SECRET_KEY=
  DATABASE_URL=
  DEBUG=
  ALLOWED_HOSTS=
  ```
- **PY-6 (MUST)** `SECRET_KEY`, `DATABASE_URL`, API 키 등 민감 정보를 코드에 하드코딩 금지. 위반 시 즉시 교체.
- **PY-7 (SHOULD)** DB 쿼리는 ORM 우선 사용. Raw SQL은 성능 이슈가 명확할 때만 허용.

#### Frontend (TypeScript)

- **TS-1 (MUST)** 모든 컴포넌트와 함수에 TypeScript 타입 정의. `any` 사용 금지.
- **TS-2 (MUST)** API 호출은 `src/lib/api.ts` 단일 파일로 집중 관리.
- **TS-3 (MUST)** `import type { … }` 구문으로 타입 전용 임포트 분리.
- **TS-4 (SHOULD)** TailwindCSS 클래스 사용. 인라인 `style` 지양.
- **TS-5 (SHOULD)** `type` 기본 사용. 인터페이스 병합이 필요할 때만 `interface` 사용.

---

### 3 — 테스트

- **T-1 (MUST)** 순수 로직 단위 테스트와 DB 연동 통합 테스트를 반드시 분리할 것.
- **T-2 (MUST)** API 변경 시 통합 테스트 추가 또는 수정.
- **T-3 (SHOULD)** 과도한 목킹보다 통합 테스트 선호.
- **T-4 (SHOULD)** 복잡한 알고리즘은 단위 테스트로 철저히 검증.
- **T-5 (SHOULD)** 테스트에 설명 없는 리터럴(`42`, `"foo"`) 직접 삽입 금지. 변수로 명명할 것.
- **T-6 (SHOULD NOT)** 타입 체커가 잡는 조건은 테스트하지 말 것.
- **T-7 (SHOULD)** 엣지 케이스, 경계값, 예상치 못한 입력을 테스트할 것.

---

### 4 — Git

- **GH-1 (MUST)** Conventional Commits 형식 사용 (scope 포함):
  ```
  <type>(<scope>): <description>

  type:  feat | fix | docs | refactor | test | chore
  scope: backend | frontend | design | qa | infra
  ```
  예시: `feat(backend): 주문 API CRUD 구현`, `docs(design): API 스펙 및 서비스 플로우 설계`
- **GH-2 (SHOULD NOT)** 커밋 메시지에 Claude 또는 Anthropic 언급 금지.
- **GH-3 (MUST)** main 브랜치 단일 운영. 별도 feature 브랜치 생성 금지.
- **GH-4 (MUST)** 파이프라인 중간 커밋은 체크포인트 용도로 생성하되, push는 QA 통과 후 1회만.
- **GH-5 (MUST)** 파이프라인 커밋 순서:
  1. `docs(design): ...` — 설계 완료 후
  2. `feat(backend): ...` + `feat(frontend): ...` — 구현 완료 후
  3. `test(qa): ...` — QA 완료 후
  4. `git push` — 최종 1회

---

## 함수 작성 체크리스트

구현한 함수를 검토할 때 아래를 확인하세요:

1. 함수 흐름을 쉽게 따라갈 수 있는가? 그렇다면 여기서 멈춰도 됨.
2. 순환 복잡도(중첩 if-else 수)가 지나치게 높지 않은가?
3. 더 적합한 자료구조나 알고리즘(스택, 큐, 파서 등)이 있지 않은가?
4. 사용되지 않는 파라미터가 있지 않은가?
5. 불필요한 타입 캐스트가 있지 않은가?
6. 모킹 없이 단위 테스트 가능한가? 불가능하다면 통합 테스트로 커버 가능한가?
7. 숨겨진 비자명한 의존성이 있지 않은가?
8. 함수명이 코드베이스 맥락에서 가장 적절한가? 대안 3개를 떠올려보고 비교할 것.

> 별도 함수 추출은 재사용, 독립적 테스트, 극단적 가독성 개선 중 하나를 만족할 때만 허용.

---

## 테스트 작성 체크리스트

작성한 테스트를 검토할 때 아래를 확인하세요:

1. 입력값은 변수로 명명되어 있는가? 설명 없는 리터럴 금지.
2. 실제 결함을 발견할 수 있는 테스트인가? 자명한 단언(`expect(2).toBe(2)`) 금지.
3. 테스트 설명과 `expect` 단언이 일치하는가?
4. 기대값은 함수 결과와 독립적으로 계산되었는가?
5. 단언은 강한 것을 사용하는가? (`toEqual(1)` > `toBeGreaterThanOrEqual(1)`)
6. 엣지 케이스, 경계값, 예상치 못한 입력이 포함되어 있는가?

---

## 환경 설정

> `docs/requirements.md`에서 포트/DB 정보를 정의하면 에이전트가 자동으로 채웁니다.

---

## 개발 시작

```bash
# 방법 A: 아이디어만 있을 때 (자동 요구사항 생성)
/start-ideation
# → 레퍼런스 조사 → requirements.md 자동 생성 → 검증 루프
# → 완성된 requirements.md 확인 후 /start-dev 실행

# 방법 B: 요구사항을 직접 작성
cp docs/requirements.example.md docs/requirements.md
# docs/requirements.md 편집

# 전체 자동 파이프라인 실행
/start-dev

# 서버 실행
./start.sh

# 작업 회고 및 교훈 기록
/retrospect
```

---

## 단축 명령어

### QPLAN

"qplan"을 입력하면:

```
코드베이스의 유사한 부분을 분석하고 현재 계획이:
- 기존 코드베이스와 일관성이 있는지
- 최소한의 변경만 도입하는지
- 기존 코드를 최대한 재사용하는지
확인하라.
```

### QCHECK

"qcheck"를 입력하면:

```
회의적인 시니어 개발자 관점에서 모든 주요 코드 변경사항에 대해:
1. 함수 작성 체크리스트 (CLAUDE.md)
2. 테스트 작성 체크리스트 (CLAUDE.md)
3. 구현 베스트 프랙티스 (CLAUDE.md)
를 검토하라.
```

### QUX

"qux"를 입력하면:

```
구현한 기능의 실제 사용자라고 가정하고,
우선순위 순으로 테스트할 시나리오 목록을 작성하라.
```

### QGIT

"qgit"를 입력하면:

```
모든 변경사항을 스테이징하고 커밋을 생성하라.

커밋 메시지 규칙:
- Conventional Commits 형식 사용
- Claude 또는 Anthropic 언급 금지
- 형식: <type>[optional scope]: <description>
  [optional body]
  [optional footer]
- type: feat, fix, docs, refactor, test, chore 중 선택
```

---

## 누적 교훈

<!-- ⚠️ 이 섹션은 에이전트가 자동으로 관리합니다. 직접 수정 시 포맷을 유지하세요. -->
<!--
포맷:
### [YYYY-MM-DD] | [프로젝트/작업명]
**에이전트**: [에이전트 이름]
**문제**: [발생한 문제 설명]
**해결**: [해결 방법]
**교훈**: [다음에 기억할 핵심 내용]
-->

### 2026-03-05 | LiveSub 설계
**에이전트**: design-agent
**문제**: SQLite에 네이티브 UUID 타입이 없어 TEXT로 저장해야 하며, DATETIME도 TEXT 기반이므로 ISO 8601 형식을 명시적으로 강제해야 함. 또한 PRAGMA foreign_keys = ON을 연결 시 매번 설정하지 않으면 FK 제약조건이 동작하지 않음
**해결**: DDL과 SQLAlchemy 모델에 TEXT 타입 명시, data-model.json의 database.pragmas에 foreign_keys 설정 포함
**교훈**: SQLite 사용 시 UUID/DATETIME 타입 매핑과 FK pragma 설정을 설계 단계에서 명확히 문서화해야 구현 에이전트가 실수하지 않는다

### 2026-03-05 | LiveSub 설계
**에이전트**: design-agent
**문제**: PATCH /api/sessions/{session_id}의 요청 바디에 ended_at을 클라이언트가 보내는 것과 서버가 자동 설정하는 것 중 선택 필요
**해결**: 서버에서 현재 UTC 시각을 자동 설정하도록 결정. 클라이언트 시각은 신뢰할 수 없고, 종료 시점은 서버 기준이 정확함
**교훈**: 타임스탬프 갱신은 서버 측에서 자동 설정하는 것이 데이터 일관성 측면에서 안전하다. 클라이언트에 불필요한 책임을 부여하지 말 것

### 2026-03-05 | LiveSub 설계 검증
**에이전트**: flow-validator-agent
**문제**: 보조 엔드포인트(GET /api/languages, GET /api/sessions/{id}, GET /api/sessions/{id}/logs, GET /api/health)가 시퀀스 다이어그램에 표현되지 않아 구현 시 호출 타이밍이 불명확할 수 있음
**해결**: 핵심 플로우에 직접 관여하지 않는 보조 엔드포인트이므로 경고 수준으로 판정. 구현 단계에서 프론트엔드 개발자가 판단 가능한 수준
**교훈**: 시퀀스 다이어그램은 핵심 시나리오에 집중하되, 페이지 초기 로드 시퀀스(언어 목록 로딩 등)를 별도로 추가하면 구현자의 판단 부담을 줄일 수 있다
