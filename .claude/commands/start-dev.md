# /start-dev — 범용 자동 개발 파이프라인

`docs/requirements.md`를 읽고 요구사항 검증 → 설계 → 플로우 검증 → 구현 → QA를 자동으로 진행합니다.

---

## 파이프라인 Resume 시스템

**이 파이프라인은 체크포인트 기반 resume을 지원합니다.**

### 시작 시 체크포인트 확인

```bash
cat docs/.pipeline-state.json 2>/dev/null || echo "없음"
```

**체크포인트 파일이 있는 경우:**

1. `docs/.pipeline-state.json`을 읽어 마지막 완료 단계를 확인
2. 사용자에게 알림:
   ```
   ⏩ 이전 파이프라인 상태가 발견되었습니다.
   마지막 완료 단계: Step [N] — [단계명]
   다음 실행 단계: Step [N+1] — [단계명]

   이어서 진행하시겠습니까? (처음부터 다시 시작하려면 '처음부터'라고 입력)
   ```
3. 사용자가 동의하면 해당 단계부터 resume
4. '처음부터'를 선택하면 체크포인트 삭제 후 Step 0부터 시작

**체크포인트 파일이 없는 경우:** Step 0부터 시작

### 체크포인트 기록 방법

**각 단계 완료 시** `docs/.pipeline-state.json`을 업데이트:

```json
{
  "pipeline_version": "2.0",
  "project": "[프로젝트명 — CLAUDE.md에서 읽기]",
  "started_at": "[파이프라인 시작 시각]",
  "last_updated": "[현재 시각]",
  "current_step": "[현재 단계 번호]",
  "steps": {
    "0": { "name": "requirements-validation", "status": "completed", "completed_at": "[시각]" },
    "1": { "name": "design", "status": "completed", "completed_at": "[시각]" },
    "1.5": { "name": "flow-validation", "status": "completed", "completed_at": "[시각]" },
    "2": { "name": "planning", "status": "pending" },
    "2.5": { "name": "design-commit", "status": "pending" },
    "3": { "name": "implementation", "status": "pending" },
    "4.5": { "name": "impl-commit", "status": "pending" },
    "5": { "name": "server-start", "status": "pending" },
    "6": { "name": "qa", "status": "pending" },
    "7": { "name": "lessons-merge", "status": "pending" },
    "8": { "name": "qa-commit-push", "status": "pending" }
  }
}
```

> 중요: 각 Step이 성공적으로 완료될 때마다 해당 step의 status를 "completed"로, completed_at을 현재 시각으로 업데이트하세요.

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

있다면 아래 단계를 순서대로 진행합니다. (resume 시 완료된 단계는 건너뜁니다)

---

## Step 0: 요구사항 검증 (Ambiguity Gate)

> 설계에 들어가기 전, 요구사항의 완성도를 정량적으로 평가합니다.
> 모호한 요구사항으로 설계를 시작하면 뒤에서 전부 엎어야 합니다.

```
Task(
  subagent_type: "requirements-validator-agent",
  prompt: "docs/requirements.md의 완성도를 검증해줘.
          docs/requirements.example.md와 비교하여 플레이스홀더가 남아있는지 확인하고,
          7개 차원(서비스 목적, 기술 스택, 데이터 모델, API 엔드포인트, 서비스 플로우, 비즈니스 규칙, 범위 정의)에 대해
          모호성 점수를 산정해줘.
          docs/requirements-validation-report.md를 생성해줘."
)
```

완료 확인: `docs/requirements-validation-report.md` 존재 + 최종 판정 확인

### 판정별 처리

**PASS (모호성 ≤ 0.3)**:
→ 체크포인트 기록 후 Step 1로 진행

**WARNING (0.3 < 모호성 ≤ 0.5)**:
→ 사용자에게 리포트 요약을 보여주고 확인:
```
⚠️ 요구사항에 보완이 권고되는 항목이 있습니다.
모호성 점수: [값] (0.3 초과)

보완 권고 항목:
- [항목 1]
- [항목 2]

이대로 진행하시겠습니까? (보완 후 재검증하려면 '보완'이라고 입력)
```
→ 사용자가 '진행' 선택 시 Step 1로
→ 사용자가 '보완' 선택 시 requirements.md 수정 대기 → Step 0 재실행

**FAIL (모호성 > 0.5)**:
→ 사용자에게 리포트를 보여주고 보완 요청:
```
❌ 요구사항이 불충분하여 설계를 시작할 수 없습니다.
모호성 점수: [값] (0.5 초과)

필수 보완 항목:
- [항목 1]
- [항목 2]

docs/requirements.md를 수정한 후 다시 /start-dev를 실행해주세요.
```
→ 파이프라인 중단 (체크포인트는 Step 0 미완료 상태로 유지)

> ✅ 체크포인트 기록: Step 0 완료

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

> ✅ 체크포인트 기록: Step 1 완료

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

> ⚠️ **FAIL인 경우**: design-agent를 다시 호출하여 불일치 항목을 수정한 뒤 flow-validator-agent를 재실행합니다. **최대 3회 반복.** 3회 째에도 FAIL이면 접근 방식을 변경하여 재설계를 지시합니다:
> ```
> "이전 설계 접근이 3회 검증 실패했습니다.
>  이전 불일치 목록: [flow-validation-report.md의 불일치 목록]
>  다른 아키텍처 패턴이나 단순화된 접근 방식으로 재설계해주세요.
>  특히 [가장 많이 실패한 항목]에 집중하여 근본 원인을 해결해주세요."
> ```

> ✅ 체크포인트 기록: Step 1.5 완료

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

> ✅ 체크포인트 기록: Step 2 완료

---

## Step 2.5: 설계 체크포인트 커밋

```bash
git add docs/
git commit -m "docs(design): API 스펙, 서비스 플로우, 데이터 모델 설계"
```

> 구현 중 문제 발생 시 이 시점으로 롤백 가능

> ✅ 체크포인트 기록: Step 2.5 완료

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

> ✅ 체크포인트 기록: Step 3 완료

---

## Step 4.5: 구현 체크포인트 커밋

```bash
git add backend/ frontend/ docs/lessons-backend.md docs/lessons-frontend.md
git commit -m "feat(backend): 백엔드 구현

feat(frontend): 프론트엔드 구현"
```

> QA에서 치명적 이슈 발견 시 이 시점으로 롤백 가능

> ✅ 체크포인트 기록: Step 4.5 완료

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

> ✅ 체크포인트 기록: Step 5 완료

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

> ✅ 체크포인트 기록: Step 6 완료

---

## Step 7: 교훈 통합

> 병렬 실행 에이전트들의 교훈을 CLAUDE.md에 통합합니다 (동시 쓰기 충돌 방지).

```
# docs/lessons-*.md 파일들을 읽어서 CLAUDE.md ## 누적 교훈에 통합
# 대상: docs/lessons-backend.md, docs/lessons-frontend.md, docs/lessons-qa.md
```

각 파일의 교훈을 `CLAUDE.md`의 `## 누적 교훈` 섹션에 병합한 뒤, lessons-*.md 파일들은 유지합니다 (기록 보존).

> ✅ 체크포인트 기록: Step 7 완료

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

> ✅ 체크포인트 기록: Step 8 완료

---

## 파이프라인 완료

모든 단계가 완료되면:

```
🎉 파이프라인 완료!
전체 소요 단계: Step 0 ~ Step 8
체크포인트 파일: docs/.pipeline-state.json (기록 보존)
```

> docs/.pipeline-state.json은 삭제하지 않습니다. 다음 /start-dev 실행 시 이전 상태를 감지하여 resume 여부를 묻습니다. 새 프로젝트를 시작하려면 '처음부터'를 선택하세요.

---

## 최종 산출물 체크리스트

```
✅ docs/requirements.md                    — 요구사항 (사용자 작성)
✅ docs/requirements-validation-report.md  — 요구사항 검증 리포트 (모호성 점수)
✅ docs/service-flow.md                    — mermaid 서비스 플로우 다이어그램
✅ docs/api-spec.md                        — REST API 스펙 + 프로시저
✅ docs/api-spec.json                      — API JSON 스펙
✅ docs/data-model.md                      — 데이터 모델 & ERD
✅ docs/data-model.json                    — 데이터 모델 JSON 스펙
✅ docs/flow-validation-report.md          — 플로우 정합성 검증 (PASS)
✅ docs/dev-plan.md                        — 개발 계획
✅ backend/                                — 백엔드 구현
✅ frontend/                               — 프론트엔드 구현
✅ docs/qa-report.md                       — QA 최종 리포트 (E2E + 계약 검증 포함)
✅ CLAUDE.md (누적 교훈)                   — 교훈 통합 완료
✅ start.sh                                — 원클릭 실행 스크립트
✅ docs/.pipeline-state.json               — 파이프라인 체크포인트
```
