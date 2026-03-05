# 개발 계획 - LiveSub

## 개요
- **총 태스크**: 16개
- **예상 병렬 실행 가능 구간**: Phase 1 (백엔드/프론트엔드 초기화), Phase 3 (백엔드 View 3개), Phase 4 (프론트엔드 훅 3개)
- **flow-validation-report**: PASS (FAIL 항목 없음, 수정 태스크 불필요)

## 기술 스택
| 레이어 | 기술 |
|--------|------|
| Backend | Python 3.11+ FastAPI + SQLite + uv |
| Frontend | Next.js 15 (App Router) + TailwindCSS + TypeScript + npm |
| STT | Web Speech API (프론트엔드) |
| 번역 | Google Cloud Translation API v2 (백엔드 프록시) |
| DB | SQLite (backend/livesub.db) |

---

## Phase 1 -- 기반 설정 (병렬 가능)
- [ ] #1 백엔드 프로젝트 초기화 (FastAPI + uv + SQLite)
- [ ] #2 프론트엔드 프로젝트 초기화 (Next.js 15 + TailwindCSS + TypeScript) -- #1과 병렬 가능

## Phase 2 -- 백엔드 모델 + 스키마
- [ ] #3 DB 모델 구현 (TranslationSession, TranslationLog) 및 마이그레이션 (의존: #1)
- [ ] #4 Pydantic 스키마 구현 (Request/Response 모델) (의존: #1) -- #3과 병렬 가능

## Phase 3 -- 백엔드 API View (병렬 가능)
- [ ] #5 번역 API 구현 (POST /api/translate, GET /api/languages) (의존: #3, #4)
- [ ] #6 세션 API 구현 (POST/GET/PATCH /api/sessions) (의존: #3, #4) -- #5와 병렬 가능
- [ ] #7 번역 로그 API 구현 (POST/GET /api/sessions/{session_id}/logs) (의존: #3, #4) -- #5, #6과 병렬 가능

## Phase 4 -- 백엔드 통합 + 프론트엔드 컴포넌트
- [ ] #8 백엔드 라우터 통합 및 Health 엔드포인트 (의존: #5, #6, #7)
- [ ] #9 프론트엔드 TypeScript 타입 및 API 클라이언트 구현 (의존: #2)
- [ ] #10 Web Speech API 훅 구현 (useSpeechRecognition) (의존: #2) -- #9와 병렬 가능
- [ ] #11 설정 관리 훅 구현 (useSettings) (의존: #2) -- #9, #10과 병렬 가능

## Phase 5 -- 프론트엔드 페이지
- [ ] #12 메인 페이지 UI 구현 (언어 선택, 번역 시작/중지, 자막 표시) (의존: #9, #10, #11)
- [ ] #13 설정 패널 UI 구현 (의존: #11, #12)
- [ ] #14 에러 처리 UI 구현 (토스트 알림, 브라우저 미지원 안내) (의존: #12)

## Phase 6 -- QA
- [ ] #15 백엔드 테스트 작성 (API 통합 테스트) (의존: #8)
- [ ] #16 프론트엔드 빌드 검증 및 E2E 통합 확인 (의존: #8, #14)

---

## 의존성 그래프

```
Phase 1 (병렬):
  #1 백엔드 초기화  ──┬──> #3 DB 모델 ──┬──> #5 번역 API ──┐
                      │                  │                   │
                      └──> #4 스키마 ───┼──> #6 세션 API ──┼──> #8 라우터 통합 ──> #15 테스트
                                         │                   │                      │
                                         └──> #7 로그 API ──┘                      │
                                                                                    │
  #2 프론트 초기화 ──┬──> #9 API 클라이언트 ──┐                                    │
                     │                         │                                    │
                     ├──> #10 Speech 훅 ──────┼──> #12 메인 페이지 ──┬──> #14 에러 UI ──> #16 빌드 검증
                     │                         │                     │
                     └──> #11 설정 훅 ─────────┘                     └──> #13 설정 패널
```

## 병렬 실행 계획

| 구간 | 병렬 태스크 | 비고 |
|------|------------|------|
| Phase 1 | #1 백엔드 초기화 + #2 프론트엔드 초기화 | 완전 독립, 동시 실행 가능 |
| Phase 2 | #3 DB 모델 + #4 Pydantic 스키마 | 둘 다 #1에만 의존, 병렬 가능 |
| Phase 3 | #5 번역 API + #6 세션 API + #7 로그 API | 셋 다 #3, #4에 의존, 병렬 가능 |
| Phase 4 (FE) | #9 API 클라이언트 + #10 Speech 훅 + #11 설정 훅 | 셋 다 #2에만 의존, 병렬 가능 |
| Phase 5 | #13 설정 패널 + #14 에러 UI | 둘 다 #12에 의존, 병렬 가능 |
| Phase 6 | #15 백엔드 테스트 + #16 빌드 검증 | #15는 #8만, #16은 #8+#14 의존 |

## 에이전트 할당 권고

| 에이전트 | 담당 태스크 |
|----------|------------|
| db-agent | #1, #3, #4, #5, #6, #7, #8, #15 |
| frontend-agent | #2, #9, #10, #11, #12, #13, #14, #16 |
| qa-agent | #15, #16 (또는 독립 수행) |

## 커밋 계획 (GH-5 준수)

1. `docs(design): API 스펙 및 서비스 플로우 설계` -- 이미 완료
2. `feat(backend): FastAPI 백엔드 구현 (모델, API, 라우팅)` -- Phase 1~4 백엔드 완료 후
3. `feat(frontend): Next.js 프론트엔드 구현 (음성 인식, 번역, 자막)` -- Phase 1~5 프론트엔드 완료 후
4. `test(qa): 백엔드 통합 테스트 및 빌드 검증` -- Phase 6 완료 후
5. `git push` -- 최종 1회
