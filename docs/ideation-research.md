# 레퍼런스 조사

## 조사 키워드
- "real-time speech to text translation subtitle web app"
- "Web Speech API real-time transcription translation implementation"
- "Whisper Deepgram AssemblyAI real-time STT comparison"
- "Google Translate API vs DeepL API vs LibreTranslate comparison"
- "Next.js Web Speech API real-time subtitle overlay UI"
- "Speechlogger real-time translation subtitle open source"

---

## 유사 서비스 분석

### Speechlogger
- **URL**: https://speechlogger.appspot.com/
- **핵심 기능**:
  - 실시간 음성 인식 (Google 음성 인식 기술 기반, Chrome 전용)
  - 자동 구두점, 타임스탬프, 자동 저장
  - 즉석 번역 (50개 이상 언어)
  - SRT 캡션 내보내기, Google Drive 업로드
- **참고할 점**:
  - 마이크 버튼 하나로 시작하는 단순 UI
  - 원본 언어 / 번역 언어 드롭다운 선택
  - 배경색, 폰트 스타일 커스터마이징 지원
- **기술 스택**: Web Speech API (Chrome), Google Translate API

### Maestra Live Translate
- **URL**: https://live.maestra.ai/
- **핵심 기능**:
  - 브라우저 기반 실시간 음성 캡션
  - 다국어 동시 통역 및 자막
  - 다중 화자 분리 (diarization)
- **참고할 점**:
  - 라이브 캡션을 투명 오버레이로 표시하는 UI 패턴
  - 실시간 스트리밍 + 자막 오버레이 조합

### KUDO
- **URL**: https://kudo.ai/
- **핵심 기능**:
  - 연속 실시간 음성 번역 (화자가 끊김 없이 말할 수 있음)
  - AI + 전문 통역사 하이브리드
  - 번역 오디오 또는 자막 선택 가능
- **참고할 점**:
  - 자막과 번역 오디오 중 선택 가능한 UX

### Wordly
- **URL**: https://www.wordly.ai/
- **핵심 기능**:
  - 번역된 오디오 + 번역된 자막 + 동일 언어 캡션
  - 텍스트/음성 트랜스크립트 및 요약
- **참고할 점**:
  - 동일 언어 캡션과 번역 자막을 동시 표시하는 UI

### Speech-Translate (오픈소스)
- **URL**: https://github.com/Dadangdut33/Speech-Translate
- **핵심 기능**:
  - Whisper OpenAI + 무료 번역 API 조합
  - 실시간 음성 인식 및 번역
  - Tkinter 기반 데스크톱 UI
- **참고할 점**:
  - Whisper + 무료 번역 API 조합 아키텍처
  - 오프라인 STT 가능 (Whisper 로컬 실행)

---

## STT (Speech-to-Text) 엔진 비교

| 항목 | Web Speech API | Whisper (OpenAI) | Deepgram Nova-2 | AssemblyAI |
|------|---------------|------------------|-----------------|------------|
| **실시간 지원** | 브라우저 내장, 즉시 사용 | 기본적으로 배치 처리, 실시간은 별도 구현 필요 | 스트리밍 지원 (지연 0.2~0.3x) | 스트리밍 지원 (300ms 이하) |
| **비용** | 무료 | Realtime API 유료 / 로컬은 무료 | 분당 과금 | $0.37/시간 |
| **정확도** | 양호 (Google 기반) | 최고 수준 (WER 기준) | Whisper 대비 2% 이내 | 강력하나 포맷팅 약함 |
| **브라우저 지원** | Chrome 중심 (Safari webkit 접두사) | 서버 사이드 필요 | 서버 사이드 필요 | 서버 사이드 필요 |
| **제한사항** | Chrome에서 ~60초 제한 (재시작 필요), 인터넷 필수 | 서버 인프라 필요 | API 키 필요, 서버 필요 | API 키 필요, 서버 필요 |
| **MVP 적합도** | 최적 (무료, 설정 최소) | 과도함 | 과도함 | 과도함 |

## 번역 API 비교

| 항목 | Google Cloud Translation v2 | DeepL API | LibreTranslate | OpenAI (GPT) |
|------|---------------------------|-----------|----------------|--------------|
| **언어 수** | 249+ | 28개 (유럽 중심) | ~45개 | 수십 개 |
| **무료 티어** | 500,000자/월 | 500,000자/월 | 완전 무료 (셀프호스팅) | 없음 (토큰 과금) |
| **초과 비용** | $20/백만자 | $25/백만자 | 무료 | 토큰 기반 |
| **정확도** | 넓은 언어에서 안정적 | 유럽 언어에서 최고 | 보통 | 문맥 이해 우수 |
| **실시간 적합** | 빠른 응답, REST API | 빠른 응답 | 셀프호스팅 시 지연 가능 | 상대적 느림 |
| **MVP 적합도** | 최적 (넓은 언어 지원 + 무료 티어) | 좋음 (언어 제한) | 비용 최적 (셀프호스팅 부담) | 과도함 |

---

## 공통 패턴

1. **마이크 버튼 한 개로 시작/중지**: 모든 서비스가 단일 버튼으로 녹음 시작
2. **원본 언어 + 번역 언어 선택 드롭다운**: 상단 또는 사이드에 언어 선택 UI
3. **원본 텍스트와 번역 텍스트 동시 표시**: 원본 + 번역을 나란히 또는 상하로 배치
4. **자막 스타일 표시**: 하단에 자막처럼 표시하거나 전체 화면 텍스트 모드
5. **실시간 interim 결과 표시**: 말하는 중에도 임시 결과를 흐릿하게 표시
6. **자동 스크롤**: 새 텍스트가 추가되면 자동으로 아래로 스크롤
7. **연속 인식 모드**: 한 번 시작하면 사용자가 중지할 때까지 계속 인식

## MVP 참고 기능

조사 결과를 기반으로, MVP에 반드시 포함할 기능:

1. **마이크 입력 실시간 음성 인식** (Web Speech API, continuous 모드)
2. **원본 언어 / 번역 언어 선택** (드롭다운)
3. **인식된 텍스트 실시간 표시** (interim + final 결과)
4. **번역된 텍스트 실시간 표시** (자막 스타일)
5. **원본 + 번역 동시 표시 모드**
6. **자동 스크롤**
7. **자막 폰트 크기 조절** (발표 용도로 큰 글씨 필요)

MVP에서 제외할 기능:
- 다중 화자 분리 (diarization)
- 음성 합성 (TTS)
- 녹음 파일 업로드 및 배치 처리
- SRT/자막 파일 내보내기
- 사용자 인증 / 세션 관리
- 번역 히스토리 영구 저장
