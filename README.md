# AI 에이전트 자동 개발 파이프라인

아이디어 한 줄이면 레퍼런스 조사 → 요구사항 생성 → 설계 → 구현 → QA까지 자동으로 진행되는 Claude Code 기반 개발 템플릿입니다.

---

## 전체 워크플로우

```
/start-ideation          /start-dev                      /retrospect
 아이디어 → 요구사항      요구사항 → 설계 → 구현 → QA      회고 → 교훈 축적
```

---

## 시작하기

### 방법 A: 아이디어만 있을 때 (추천)

```
/start-ideation
```

한 줄 설명만 입력하면 자동으로:
1. 유사 서비스를 웹 검색하여 참고 기능/구현 방법 조사
2. `docs/requirements.md` 원샷 생성
3. 모호성 점수 검증 → 미달 시 자동 수정 반복 (최대 3회)
4. 완성된 요구사항 문서를 사용자에게 리뷰 요청

리뷰 완료 후 `/start-dev`로 개발을 시작합니다.

### 방법 B: 요구사항을 직접 작성

```bash
cp docs/requirements.example.md docs/requirements.md
# docs/requirements.md 편집
```

작성할 내용:
- **서비스 개요** — 무엇을 만드는지
- **기술 스택** — Next.js, Django, PostgreSQL 등
- **데이터 모델** — DB 테이블 구조
- **API 엔드포인트** — 필요한 API 목록
- **서비스 플로우** — 사용자 시나리오
- **프론트엔드 기능** — 화면 및 기능 목록

### 자동 개발 실행

```
/start-dev
```

에이전트들이 순서대로 자동 실행됩니다:

```
requirements-validator   → 요구사항 모호성 점수 검증 (게이트)
     ↓
design-agent             → 설계 문서 생성 (mermaid + 프로시저 + JSON 스펙)
     ↓
flow-validator           → 설계 문서 간 정합성 검증 (FAIL 시 재설계, 최대 3회)
     ↓
planning-agent           → 개발 태스크 분해 및 계획 수립
     ↓
db-agent                 → 백엔드/DB 구현  ┐ (병렬 실행)
frontend-agent           → 프론트엔드 구현 ┘
     ↓
qa-agent                 → 테스트 + curl E2E + 프론트-백 계약 검증
```

파이프라인은 **체크포인트 기반 resume**을 지원합니다. 중단 후 재실행하면 마지막 완료 단계부터 이어서 진행합니다.

### 서버 실행

```bash
./start.sh
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 | http://localhost:8000 |
| PostgreSQL | localhost:5432 (Docker 자동 시작) |

### 회고 (선택)

```
/retrospect
```

작업 중 발견된 교훈을 `CLAUDE.md`에 자동 기록합니다.

---

## 단축 명령어

Claude Code 세션에서 아래 키워드를 입력하면 정해진 검토 프롬프트가 실행됩니다.

| 명령어 | 동작 |
|--------|------|
| `qplan` | 계획이 코드베이스와 일관성 있는지 분석 |
| `qcheck` | 함수·테스트·구현 규칙 전체 검토 |
| `qux` | 사용자 관점의 테스트 시나리오 목록 생성 |
| `qgit` | Conventional Commits 형식으로 커밋 생성 |

---

## 프로젝트 구조

```
universal-dev/
├── CLAUDE.md                              # 에이전트 규칙 및 누적 교훈
├── start.sh                               # 서버 실행 스크립트
├── .claude/
│   ├── settings.json                      # 권한 및 환경 설정
│   ├── agents/
│   │   ├── ideation-agent.md              # 아이디어 → 요구사항 변환
│   │   ├── requirements-validator-agent.md # 요구사항 모호성 검증
│   │   ├── design-agent.md                # API/DB/플로우 설계
│   │   ├── flow-validator-agent.md        # 설계 정합성 검증
│   │   ├── planning-agent.md              # 개발 계획 수립
│   │   ├── db-agent.md                    # 백엔드 구현
│   │   ├── frontend-agent.md              # 프론트엔드 구현
│   │   └── qa-agent.md                    # 테스트 및 품질 검증
│   └── commands/
│       ├── start-ideation.md              # 아이디어 → 요구사항 파이프라인
│       ├── start-dev.md                   # 설계 → 구현 → QA 파이프라인
│       └── retrospect.md                  # 프로젝트 회고
├── docs/
│   ├── requirements.example.md            # 요구사항 템플릿
│   ├── requirements.md                    # 요구사항 (시작점)
│   ├── ideation-research.md               # 레퍼런스 조사 (자동 생성)
│   ├── ideation-decisions.md              # AI 판단 기록 (자동 생성)
│   ├── requirements-validation-report.md  # 모호성 검증 리포트 (자동 생성)
│   ├── service-flow.md                    # mermaid 서비스 플로우 (자동 생성)
│   ├── api-spec.md / api-spec.json        # API 스펙 + 프로시저 (자동 생성)
│   ├── data-model.md / data-model.json    # 데이터 모델 (자동 생성)
│   ├── flow-validation-report.md          # 플로우 정합성 검증 (자동 생성)
│   ├── dev-plan.md                        # 개발 계획 (자동 생성)
│   └── qa-report.md                       # QA 리포트 (자동 생성)
├── backend/                               # 에이전트가 자동 생성
└── frontend/                              # 에이전트가 자동 생성
```

---

## 기술 스택 (기본값)

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 15 + TailwindCSS + TypeScript |
| Backend | Python 3.11+ + Django 5.2 + Django REST Framework |
| Database | PostgreSQL 15 (Docker) |

`docs/requirements.md`에서 원하는 스택으로 변경할 수 있습니다.

---

## 요구사항

- Python 3.11+
- Node.js + npm
- Docker (PostgreSQL 자동 실행용)
- [Claude Code](https://claude.ai/code)
