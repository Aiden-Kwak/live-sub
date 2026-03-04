# /start-ideation — 아이디어 → 요구사항 자동 변환 파이프라인

막연한 아이디어를 입력하면 레퍼런스 조사 → requirements.md 생성 → 검증 → 자동 수정을 반복하여
`/start-dev`에 바로 투입 가능한 완성된 요구사항 문서를 만듭니다.

---

## 파이프라인 흐름

```
[Phase 1] 씨앗 수집           사용자의 아이디어 입력 (한 줄이면 충분)
     ↓
[Phase 2] 레퍼런스 조사       유사 서비스 탐색 → 참고 기능/구현 방법 정리
     ↓
[Phase 3] requirements.md    원샷 자동 생성
     ↓
[Phase 4] 검증 루프           requirements-validator로 모호성 점수 검사
     ↓                        FAIL → 자동 수정 → 재검증 (최대 3회)
[Phase 5] 완료               사용자에게 리뷰 요청 → /start-dev 안내
```

---

## Phase 1: 씨앗 수집

사용자 입력($ARGUMENTS)을 읽습니다.

**입력이 있는 경우:** 바로 Phase 2로 진행

**입력이 없는 경우:** 사용자에게 질문:
```
어떤 서비스를 만들고 싶으세요?
한 줄~두 줄로 자유롭게 설명해주세요.

예시:
- "할 일 관리 앱인데 습관 트래킹도 같이 되는 거"
- "레시피 공유 사이트, 재료 기반으로 검색 가능"
- "팀 프로젝트 일정 관리 도구"
```

---

## Phase 2: 레퍼런스 조사 + requirements.md 원샷 생성

```
Task(
  subagent_type: "ideation-agent",
  prompt: "사용자 아이디어: [Phase 1에서 받은 입력]

          1. 유사 서비스를 웹 검색하여 참고할 기능과 구현 방법을 조사해줘.
             - 차별점 분석은 불필요. 참고 기능과 구현 패턴에 집중.
             - docs/ideation-research.md에 조사 결과 기록

          2. 조사 결과 + 사용자 아이디어를 기반으로 docs/requirements.md를 생성해줘.
             - docs/requirements.example.md 템플릿을 정확히 따를 것
             - 플레이스홀더([서비스 이름] 등) 절대 남기지 말 것
             - 모든 필드에 구체적 타입, 제약조건 명시
             - MVP에 집중하되, 레퍼런스에서 발견한 핵심 기능 반영

          3. 판단이 필요했던 결정 사항을 docs/ideation-decisions.md에 기록해줘."
)
```

완료 확인: `docs/ideation-research.md`, `docs/requirements.md`, `docs/ideation-decisions.md` 존재 여부

---

## Phase 3: 검증 루프 (Generate → Validate → Fix)

> Ouroboros의 진화적 루프에서 영감:
> 한 번에 완벽하게 만들려 하지 말고, 생성 → 검증 → 수정을 반복하여 수렴시킨다.

### 검증 실행

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

### 판정별 처리

**PASS (모호성 ≤ 0.3)**:
→ Phase 4로 진행

**WARNING (0.3 < 모호성 ≤ 0.5)** 또는 **FAIL (모호성 > 0.5)**:
→ 자동 수정 루프 진입:

```
Task(
  subagent_type: "ideation-agent",
  prompt: "docs/requirements-validation-report.md를 읽고 지적된 미비 사항을 수정해줘.
          docs/requirements.md를 직접 수정할 것.

          수정 원칙:
          - 검증 리포트의 '보완이 필요한 항목'을 하나씩 해결
          - 모호한 부분은 레퍼런스 조사 결과(docs/ideation-research.md)를 참고하여 구체화
          - 새로운 결정이 필요하면 docs/ideation-decisions.md에 추가 기록
          - 플레이스홀더나 빈 섹션이 있으면 반드시 채울 것

          수정 완료 후 어떤 항목을 어떻게 수정했는지 간단히 보고해줘."
)
```

→ 수정 후 requirements-validator-agent 재실행
→ **최대 3회 반복**
→ 3회 째에도 PASS가 안 되면 현재 상태에서 사용자에게 판단 위임:

```
⚠️ 3회 자동 수정 후에도 모호성 점수가 [값]입니다.
남은 미비 사항:
- [항목 1]
- [항목 2]

이대로 진행하시겠습니까? 또는 직접 수정하시겠습니까?
```

---

## Phase 4: 완료 및 안내

모든 산출물을 사용자에게 요약 보고:

```
✅ 아이데이션 완료!

📄 생성된 문서:
  - docs/ideation-research.md    — 유사 서비스 조사 결과
  - docs/requirements.md         — 요구사항 문서 (모호성 점수: [값])
  - docs/ideation-decisions.md   — AI 판단 기록 (확인 필요)
  - docs/requirements-validation-report.md — 검증 리포트

📋 사용자 확인 사항:
  - docs/ideation-decisions.md의 '사용자에게 확인받을 사항' 섹션을 확인해주세요
  - docs/requirements.md를 리뷰하고 필요한 부분을 수정해주세요

🚀 다음 단계:
  requirements.md 확인이 끝나면 /start-dev를 실행하세요.
```

---

## 최종 산출물 체크리스트

```
✅ docs/ideation-research.md              — 레퍼런스 조사 (유사 서비스, 참고 기능)
✅ docs/requirements.md                   — 구조화된 요구사항 (검증 통과)
✅ docs/ideation-decisions.md             — AI 결정 사항 + 사용자 확인 목록
✅ docs/requirements-validation-report.md — 모호성 점수 및 검증 결과
```
