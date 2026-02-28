# /start-dev — 범용 자동 개발 파이프라인

`docs/requirements.md`를 읽고 설계 → 플로우 검증 → 구현 → QA를 자동으로 진행합니다.

---

## 시작 전 체크

**먼저 `docs/requirements.md`가 있는지 확인하세요.**

```bash
ls docs/requirements.md 2>/dev/null || echo "없음"
```

없다면 사용자에게 안내:
```
docs/requirements.md 파일이 없습니다.
docs/requirements.example.md를 복사하여 요구사항을 작성해주세요:

  cp docs/requirements.example.md docs/requirements.md
  # requirements.md 편집 후 다시 /start-dev 실행
```

있다면 아래 단계를 순서대로 진행합니다.

---

## Step 1: 설계

```
Task(
  subagent_type: "design-agent",
  prompt: "먼저 기존 코드가 있으면 프로젝트 구조를 파악한 뒤,
          CLAUDE.md와 docs/requirements.md를 읽고 서비스 전체를 설계해줘.
          필수 산출물:
          1. docs/service-flow.md — mermaid 플로우차트 + 시퀀스 다이어그램 + ERD
          2. docs/api-spec.md — 모든 엔드포인트 + 프로시저(처리 절차) 포함
          3. docs/data-model.md — ERD, 필드 설명, 인덱스 전략
          4. docs/api-spec.json — API JSON 스펙
          5. docs/data-model.json — 데이터 모델 JSON 스펙
          작업 완료 후 발견된 교훈을 CLAUDE.md ## 누적 교훈에 기록해줘."
)
```

완료 확인: `docs/service-flow.md`, `docs/api-spec.md`, `docs/data-model.md`, `docs/api-spec.json`, `docs/data-model.json` 존재 여부

---

## Step 1.5: 서비스 플로우 정합성 검증

```
Task(
  subagent_type: "flow-validator-agent",
  prompt: "설계 문서 간 정합성을 검증해줘.
          1. mermaid 시퀀스 다이어그램의 API 호출이 api-spec에 모두 존재하는지
          2. 프로시저에서 참조하는 엔티티/필드가 data-model에 존재하는지
          3. requirements.md의 기능이 service-flow에 모두 반영되었는지
          4. .md와 .json 파일 간 내용이 일치하는지
          5. mermaid 문법 유효성
          docs/flow-validation-report.md를 생성해줘."
)
```

완료 확인: `docs/flow-validation-report.md` 존재 + 최종 판정이 PASS인지 확인

> ⚠️ **FAIL인 경우**: design-agent를 다시 호출하여 불일치 항목을 수정한 뒤 flow-validator-agent를 재실행합니다. PASS가 될 때까지 반복합니다.

---

## Step 2: 개발 계획 수립

```
Task(
  subagent_type: "planning-agent",
  prompt: "docs/ 폴더의 모든 문서(md + json)를 읽고 개발 계획을 수립해줘.
          특히 api-spec.json과 data-model.json을 참조하여 정확한 태스크 범위를 산정해줘.
          flow-validation-report.md에 FAIL 항목이 있으면 수정 태스크를 우선 등록해줘.
          TaskCreate로 모든 개발 태스크를 등록하고 의존성을 설정해줘.
          docs/dev-plan.md를 생성해줘.
          백엔드와 프론트엔드 초기화는 병렬로 실행 가능하다고 명시해줘."
)
```

완료 확인: `docs/dev-plan.md` 존재, TaskList로 태스크 등록 확인

---

## Step 2.5: 설계 체크포인트 커밋

```bash
git add docs/
git commit -m "docs(design): API 스펙, 서비스 플로우, 데이터 모델 설계"
```

> 구현 중 문제 발생 시 이 시점으로 롤백 가능

---

## Step 3 + 4: 백엔드 & 프론트엔드 병렬 구현

> **중요**: 두 Task를 한 메시지에 동시에 호출하여 병렬 실행

```
# 동시에 실행 (run_in_background: true)
Task(
  subagent_type: "db-agent",
  run_in_background: true,
  prompt: "CLAUDE.md와 docs/ 설계 문서(md + json)를 읽고 백엔드를 완전히 구현해줘.
          docs/api-spec.json의 엔드포인트 스펙과 docs/data-model.json의 모델 정의를 참조해줘.
          각 엔드포인트의 프로시저(docs/api-spec.md)를 따라 비즈니스 로직을 구현해줘.
          작업 완료 후 발견된 교훈을 docs/lessons-backend.md에 기록해줘.
          (CLAUDE.md에는 직접 쓰지 말 것 — 동시 쓰기 충돌 방지)"
)

Task(
  subagent_type: "frontend-agent",
  run_in_background: true,
  prompt: "CLAUDE.md와 docs/ 설계 문서(md + json)를 읽고 프론트엔드를 완전히 구현해줘.
          docs/api-spec.json을 참조하여 API 클라이언트의 요청/응답 타입을 정확히 맞춰줘.
          npm run build가 성공해야 완료.
          작업 완료 후 발견된 교훈을 docs/lessons-frontend.md에 기록해줘.
          (CLAUDE.md에는 직접 쓰지 말 것 — 동시 쓰기 충돌 방지)"
)
```

완료 확인: 두 에이전트의 완료 알림 대기

---

## Step 4.5: 구현 체크포인트 커밋

```bash
git add backend/ frontend/ docs/lessons-backend.md docs/lessons-frontend.md
git commit -m "feat(backend): 백엔드 구현

feat(frontend): 프론트엔드 구현"
```

> QA에서 치명적 이슈 발견 시 이 시점으로 롤백 가능

---

## Step 5: 서버 시작 (QA 사전 준비)

> curl E2E 테스트를 위해 QA 전에 서버를 먼저 실행합니다.

```bash
./start.sh
```

서버 정상 동작 확인:
```bash
curl -s http://localhost:8000/ >/dev/null 2>&1 && echo "Backend OK" || echo "Backend FAIL"
curl -s http://localhost:3000/ >/dev/null 2>&1 && echo "Frontend OK" || echo "Frontend FAIL"
```

---

## Step 6: QA 검증

```
Task(
  subagent_type: "qa-agent",
  prompt: "구현된 서비스 전체를 검증해줘.
          1. 백엔드/프론트엔드 코드 리뷰
          2. 백엔드 테스트 작성 및 실행 (SQLite 테스트 설정 사용)
          3. 프론트엔드 tsc, lint, build 확인
          4. 서비스 플로우 기반 curl E2E 테스트 (docs/service-flow.md 시퀀스 순서대로)
          5. 프론트-백 데이터 계약 검증 (api-spec.json 기준 삼자 대조 중심)
          6. docs/bug-report.md, docs/qa-report.md 작성
          7. 발견된 교훈을 docs/lessons-qa.md에 기록"
)
```

완료 확인: `docs/qa-report.md` 존재

---

## Step 7: 교훈 통합

> 병렬 실행 에이전트들의 교훈을 CLAUDE.md에 통합합니다 (동시 쓰기 충돌 방지).

```
# docs/lessons-*.md 파일들을 읽어서 CLAUDE.md ## 누적 교훈에 통합
# 대상: docs/lessons-backend.md, docs/lessons-frontend.md, docs/lessons-qa.md
```

각 파일의 교훈을 `CLAUDE.md`의 `## 누적 교훈` 섹션에 병합한 뒤, lessons-*.md 파일들은 유지합니다 (기록 보존).

---

## Step 8: QA 커밋 + 푸시

```bash
# QA 결과 커밋
git add docs/qa-report.md docs/bug-report.md docs/lessons-qa.md CLAUDE.md
git add backend/ frontend/  # 테스트 파일 포함
git commit -m "test(qa): E2E 테스트 및 계약 검증 완료"

# QA 통과 확인 후 푸시 (1회)
git push
```

> ⚠️ QA 리포트가 FAIL이면 푸시하지 말 것. 이슈 수정 후 QA 재실행.

---

## 최종 산출물 체크리스트

```
✅ docs/requirements.md          — 요구사항 (사용자 작성)
✅ docs/service-flow.md          — mermaid 서비스 플로우 다이어그램
✅ docs/api-spec.md              — REST API 스펙 + 프로시저
✅ docs/api-spec.json            — API JSON 스펙
✅ docs/data-model.md            — 데이터 모델 & ERD
✅ docs/data-model.json          — 데이터 모델 JSON 스펙
✅ docs/flow-validation-report.md — 플로우 정합성 검증 (PASS)
✅ docs/dev-plan.md              — 개발 계획
✅ backend/                      — 백엔드 구현
✅ frontend/                     — 프론트엔드 구현
✅ docs/qa-report.md             — QA 최종 리포트 (E2E + 계약 검증 포함)
✅ CLAUDE.md (누적 교훈)         — 교훈 통합 완료
✅ start.sh                      — 원클릭 실행 스크립트
```
