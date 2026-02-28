# AI 에이전트 자동 개발 파이프라인

요구사항 문서 하나만 작성하면 설계 → 구현 → QA까지 자동으로 진행되는 Claude Code 기반 개발 템플릿입니다.

---

## 수정할 사항(메모)
- mermaid chart 작성 강제화
- 프로시저 작성 강제화
- 위 두가지 사항 확인후 서비스 플로우 정합성 체크하는 에이전트 분리.
- qa agent 역할 추가 (서비스 플로우 따라서 curl을 통해 api 전부 호출)
- md 비정형적인 사항들 json으로 정리

## 시작하기

### 1. 요구사항 작성

```bash
cp docs/requirements.example.md docs/requirements.md
```

`docs/requirements.md`를 열어 아래 내용을 채웁니다:

- **서비스 개요** — 무엇을 만드는지
- **기술 스택** — Next.js, Django, PostgreSQL 등
- **데이터 모델** — DB 테이블 구조
- **API 엔드포인트** — 필요한 API 목록
- **프론트엔드 기능** — 화면 및 기능 목록

### 2. 자동 개발 시작

Claude Code에서 실행:

```
/start-dev
```

에이전트들이 순서대로 자동 실행됩니다:

```
design-agent    → API 설계, 데이터 모델 설계 문서 생성
     ↓
planning-agent  → 개발 태스크 분해 및 계획 수립
     ↓
db-agent        → 백엔드/DB 구현  ┐ (병렬 실행)
frontend-agent  → 프론트엔드 구현 ┘
     ↓
qa-agent        → 전체 테스트 및 검증
```

### 3. 서버 실행

```bash
./start.sh
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 | http://localhost:8000 |
| PostgreSQL | localhost:5432 (Docker 자동 시작) |

### 4. 회고 (선택)

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
├── CLAUDE.md                    # 에이전트 규칙 및 누적 교훈
├── start.sh                     # 서버 실행 스크립트
├── docs/
│   ├── requirements.example.md  # 요구사항 템플릿
│   └── requirements.md          # 직접 작성할 파일 (시작점)
├── backend/                     # 에이전트가 자동 생성
└── frontend/                    # 에이전트가 자동 생성
```

---

## 기술 스택 (기본값)

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 + TailwindCSS + TypeScript |
| Backend | Python + Django + Django REST Framework |
| Database | PostgreSQL 15 (Docker) |

`docs/requirements.md`에서 원하는 스택으로 변경할 수 있습니다.

---

## 요구사항

- Python 3.11+
- Node.js + npm
- Docker (PostgreSQL 자동 실행용)
- [Claude Code](https://claude.ai/code)
