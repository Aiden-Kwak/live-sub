# 아이데이션 결정 기록

**날짜**: 2026-03-05
**원본 아이디어**: "음성으로 실시간 대화나 발표를 듣고 선택 언어로 번역해 실시간으로 화면에 자막을 띄워주는 서비스"

## 주요 결정 사항

### 결정 1: STT 엔진 - Web Speech API 선택
- **선택지**: Web Speech API vs OpenAI Whisper vs Deepgram vs AssemblyAI
- **선택**: Web Speech API
- **근거**:
  - 완전 무료이며 브라우저 내장이라 별도 서버 인프라 불필요
  - MVP 관점에서 가장 빠르게 구현 가능 (수 줄의 JavaScript로 동작)
  - continuous 모드 + interimResults 지원으로 실시간 자막에 적합
  - Whisper/Deepgram/AssemblyAI는 서버 사이드 인프라와 유료 API 키가 필요하여 MVP에 과도
- **트레이드오프**:
  - Chrome 중심 지원 (Firefox/Safari 제한적)
  - ~60초마다 인식이 끊길 수 있음 (자동 재시작으로 대응)
  - 서버 기반 STT 대비 정확도가 낮을 수 있음
- **사용자 확인 필요 여부**: Y - Chrome 중심 지원이 괜찮은지

### 결정 2: 번역 API - Google Cloud Translation API v2 선택
- **선택지**: Google Cloud Translation v2 vs DeepL API vs LibreTranslate vs OpenAI GPT
- **선택**: Google Cloud Translation API v2 (Basic)
- **근거**:
  - 249개 이상 언어 지원으로 가장 넓은 커버리지
  - 월 500,000자 무료 티어 제공 (MVP 테스트에 충분)
  - REST API로 간단한 통합, 빠른 응답 속도
  - DeepL은 28개 언어만 지원하여 글로벌 사용에 부적합
  - LibreTranslate는 셀프호스팅 부담, OpenAI는 번역 전용이 아니라 응답 지연
- **트레이드오프**:
  - Google Cloud 계정 및 API 키 설정 필요
  - 무료 티어 초과 시 유료 ($20/백만자)
  - DeepL 대비 유럽 언어 번역 품질이 약간 낮을 수 있음
- **사용자 확인 필요 여부**: Y - Google Cloud API 키 발급이 가능한지, 다른 번역 API 선호가 있는지

### 결정 3: 아키텍처 - 프론트엔드 중심 + 경량 백엔드 프록시
- **선택지**:
  - A: 순수 프론트엔드 (클라이언트에서 직접 번역 API 호출)
  - B: 프론트엔드 + 경량 백엔드 프록시
  - C: 풀 백엔드 (WebSocket 기반 실시간 처리)
- **선택**: B - 프론트엔드 중심 + FastAPI 경량 백엔드
- **근거**:
  - STT는 브라우저에서 처리 (Web Speech API) → 서버 부하 없음
  - 번역 API 키를 클라이언트에 노출하면 보안 위험 → 백엔드 프록시 필요
  - WebSocket은 이 유스케이스에서 과도 (번역 요청은 HTTP REST로 충분)
  - FastAPI는 경량이고 비동기 지원으로 번역 프록시에 적합
- **트레이드오프**:
  - 순수 프론트엔드 대비 서버 운영 필요 (하지만 최소한의 역할만 수행)
  - 번역 요청마다 HTTP 왕복 발생 (WebSocket 대비 약간의 지연)
- **사용자 확인 필요 여부**: N

### 결정 4: 데이터베이스 - SQLite 최소 구성
- **선택지**: PostgreSQL vs SQLite vs DB 없음
- **선택**: SQLite
- **근거**:
  - MVP에서 번역 기록의 영구 저장은 핵심 기능이 아님
  - 세션 단위 로그를 임시 저장하는 용도로 충분
  - 별도 DB 서버 설치/운영 불필요
  - 추후 PostgreSQL로 마이그레이션 용이
- **트레이드오프**:
  - 동시 접속자가 많으면 쓰기 성능 이슈 (MVP에서는 문제없음)
  - 서버 재시작 시에도 데이터 유지되지만, 장기 보관 목적은 아님
- **사용자 확인 필요 여부**: N

### 결정 5: 프레임워크 - Next.js + FastAPI 조합
- **선택지**:
  - A: Next.js 풀스택 (API Routes로 번역 프록시까지 처리)
  - B: Next.js(프론트) + FastAPI(백엔드) 분리
  - C: React SPA + FastAPI
- **선택**: B - Next.js + FastAPI 분리
- **근거**:
  - CLAUDE.md의 프로젝트 구조 규칙(프론트/백 분리)과 일관성 유지
  - FastAPI가 Python 생태계의 번역 라이브러리와 더 잘 통합됨
  - Next.js API Routes만으로도 가능하나, 백엔드 확장성 고려
- **트레이드오프**:
  - 두 서버를 동시에 실행해야 하는 운영 복잡성
  - Next.js API Routes만 사용했으면 단일 서버로 더 간단했을 수 있음
- **사용자 확인 필요 여부**: Y - Next.js API Routes만으로 충분할 수도 있는데, 별도 백엔드가 필요한지

### 결정 6: 서비스명 - LiveSub
- **선택지**: LiveSub vs VoiceSub vs RealCaption vs TransLive
- **선택**: LiveSub (라이브서브)
- **근거**:
  - "Live"(실시간) + "Sub"(자막)의 직관적 조합
  - 짧고 기억하기 쉬움
  - 서비스의 핵심 가치를 바로 전달
- **사용자 확인 필요 여부**: Y - 서비스명 선호가 있는지

## 사용자에게 확인받을 사항

> requirements.md를 리뷰할 때 아래 항목을 특히 확인해주세요:

1. **Chrome 중심 지원**: Web Speech API가 Chrome에서 가장 잘 동작합니다. Firefox/Safari 지원이 필수인지 확인이 필요합니다. 필수라면 Deepgram 등 서버 사이드 STT로 전환해야 합니다.
2. **Google Cloud API 키**: Google Cloud Translation API를 사용하려면 GCP 프로젝트 생성 및 API 키 발급이 필요합니다. 이미 GCP 계정이 있는지, 다른 번역 서비스(DeepL, LibreTranslate)를 선호하는지 확인이 필요합니다.
3. **백엔드 분리 여부**: 현재 FastAPI 백엔드를 별도로 두었는데, Next.js API Routes만으로 번역 프록시를 처리하면 서버를 하나로 통합할 수 있습니다. 어떤 방식을 선호하는지 확인이 필요합니다.
4. **서비스명**: "LiveSub"으로 가칭 설정했습니다. 다른 이름 선호가 있으면 알려주세요.
5. **번역 로그 저장**: 현재 세션별 번역 기록을 SQLite에 임시 저장하도록 설계했습니다. 번역 기록 저장이 전혀 필요 없다면 DB를 아예 제거할 수도 있습니다.
