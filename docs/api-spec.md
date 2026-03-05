# LiveSub - API 스펙

**Base URL**: `http://localhost:8000/api`
**Content-Type**: `application/json`

---

## POST /api/translate

**설명**: 텍스트를 지정 언어로 번역한다. Google Cloud Translation API v2를 프록시하여 API 키를 클라이언트에 노출하지 않는다.

**프로시저** (처리 절차):
1. 요청 바디에서 `text`, `source_language`, `target_language` 추출
2. 유효성 검증: `text`가 비어있거나 공백만 있으면 400 반환
3. 유효성 검증: `source_language`, `target_language`가 빈 문자열이면 400 반환
4. 환경변수에서 `GOOGLE_CLOUD_API_KEY` 로드
5. Google Cloud Translation API v2 호출 (`POST https://translation.googleapis.com/language/translate/v2`)
6. Google API 응답에서 `translatedText` 추출
7. 응답 객체 구성하여 200 반환
8. Google API 호출 실패 시 500 반환 (에러 메시지 포함)

**요청 바디**:
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| text | string | Y | - | 번역할 원본 텍스트 |
| source_language | string | Y | - | 원본 언어 코드 (예: "ko", "en") |
| target_language | string | Y | - | 번역 대상 언어 코드 (예: "en", "ja") |

**성공 응답** (200):
```json
{
  "translated_text": "Hello",
  "source_language": "ko",
  "target_language": "en"
}
```

**에러 응답**:
- `400`: text가 비어있거나 공백만 있는 경우, 언어 코드가 빈 문자열인 경우
  ```json
  { "detail": "text must not be empty" }
  ```
- `500`: Google Translation API 호출 실패
  ```json
  { "detail": "Translation API error: {error_message}" }
  ```

---

## GET /api/languages

**설명**: Google Cloud Translation API에서 지원하는 언어 목록을 반환한다.

**프로시저** (처리 절차):
1. 환경변수에서 `GOOGLE_CLOUD_API_KEY` 로드
2. Google Cloud Translation API v2 언어 목록 조회 (`GET https://translation.googleapis.com/language/translate/v2/languages?target=en`)
3. 응답에서 언어 코드와 이름 목록 추출
4. `{ languages: [...] }` 형태로 200 반환
5. Google API 호출 실패 시 500 반환

**요청 바디**: 없음 (GET 요청)

**쿼리 파라미터**: 없음

**성공 응답** (200):
```json
{
  "languages": [
    { "code": "ko", "name": "Korean" },
    { "code": "en", "name": "English" },
    { "code": "ja", "name": "Japanese" },
    { "code": "zh", "name": "Chinese" },
    { "code": "es", "name": "Spanish" }
  ]
}
```

**에러 응답**:
- `500`: Google Translation API 호출 실패
  ```json
  { "detail": "Failed to fetch languages: {error_message}" }
  ```

---

## POST /api/sessions

**설명**: 새로운 번역 세션을 생성한다. 사용자가 번역을 시작할 때 호출된다.

**프로시저** (처리 절차):
1. 요청 바디에서 `source_language`, `target_language` 추출
2. 유효성 검증: 두 필드 모두 비어있지 않은지 확인, 비어있으면 400 반환
3. UUID v4 생성
4. `created_at`을 현재 UTC 시각으로 설정
5. DB에 TranslationSession INSERT
6. 생성된 세션 객체를 201 반환

**요청 바디**:
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| source_language | string | Y | - | 원본 언어 코드 (최대 10자) |
| target_language | string | Y | - | 번역 대상 언어 코드 (최대 10자) |

**성공 응답** (201):
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source_language": "ko",
  "target_language": "en",
  "created_at": "2026-03-05T10:00:00Z"
}
```

**에러 응답**:
- `400`: source_language 또는 target_language가 비어있는 경우
  ```json
  { "detail": "source_language and target_language are required" }
  ```

---

## PATCH /api/sessions/{session_id}

**설명**: 번역 세션을 종료한다. `ended_at` 필드를 현재 시각으로 갱신한다.

**프로시저** (처리 절차):
1. 경로 파라미터에서 `session_id` 추출
2. UUID 형식 검증, 유효하지 않으면 400 반환
3. DB에서 해당 session_id의 TranslationSession 조회
4. 세션이 존재하지 않으면 404 반환
5. 이미 ended_at이 설정되어 있으면 400 반환 (중복 종료 방지)
6. `ended_at`을 현재 UTC 시각으로 UPDATE
7. 갱신된 세션 객체를 200 반환

**경로 파라미터**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| session_id | UUID | 세션 고유 식별자 |

**요청 바디**: 없음 (서버에서 현재 시각 자동 설정)

**성공 응답** (200):
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source_language": "ko",
  "target_language": "en",
  "created_at": "2026-03-05T10:00:00Z",
  "ended_at": "2026-03-05T10:30:00Z"
}
```

**에러 응답**:
- `400`: session_id가 유효한 UUID가 아닌 경우, 또는 이미 종료된 세션인 경우
  ```json
  { "detail": "Session already ended" }
  ```
- `404`: 해당 session_id의 세션이 존재하지 않는 경우
  ```json
  { "detail": "Session not found" }
  ```

---

## GET /api/sessions/{session_id}

**설명**: 세션 상세 정보와 해당 세션의 전체 번역 로그를 함께 조회한다.

**프로시저** (처리 절차):
1. 경로 파라미터에서 `session_id` 추출
2. UUID 형식 검증, 유효하지 않으면 400 반환
3. DB에서 해당 session_id의 TranslationSession 조회
4. 세션이 존재하지 않으면 404 반환
5. DB에서 해당 session_id의 TranslationLog를 created_at 오름차순으로 조회
6. 세션 정보 + 번역 로그 목록을 200 반환

**경로 파라미터**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| session_id | UUID | 세션 고유 식별자 |

**성공 응답** (200):
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source_language": "ko",
  "target_language": "en",
  "created_at": "2026-03-05T10:00:00Z",
  "ended_at": "2026-03-05T10:30:00Z",
  "logs": [
    {
      "id": 1,
      "original_text": "안녕하세요",
      "translated_text": "Hello",
      "confidence": 0.95,
      "created_at": "2026-03-05T10:01:00Z"
    },
    {
      "id": 2,
      "original_text": "오늘 발표를 시작하겠습니다",
      "translated_text": "I will start the presentation today",
      "confidence": 0.88,
      "created_at": "2026-03-05T10:01:15Z"
    }
  ]
}
```

**에러 응답**:
- `400`: session_id가 유효한 UUID가 아닌 경우
  ```json
  { "detail": "Invalid session_id format" }
  ```
- `404`: 해당 session_id의 세션이 존재하지 않는 경우
  ```json
  { "detail": "Session not found" }
  ```

---

## POST /api/sessions/{session_id}/logs

**설명**: 번역 결과를 세션의 번역 로그에 추가한다. 프론트엔드에서 번역 완료 후 호출된다.

**프로시저** (처리 절차):
1. 경로 파라미터에서 `session_id` 추출
2. UUID 형식 검증, 유효하지 않으면 400 반환
3. DB에서 해당 session_id의 TranslationSession 존재 여부 확인
4. 세션이 존재하지 않으면 404 반환
5. 요청 바디에서 `original_text`, `translated_text`, `confidence` 추출
6. 유효성 검증: `original_text`, `translated_text`가 비어있으면 400 반환
7. 유효성 검증: `confidence`가 제공된 경우 0.0~1.0 범위인지 확인
8. `created_at`을 현재 UTC 시각으로 설정
9. DB에 TranslationLog INSERT
10. 생성된 로그 객체를 201 반환

**경로 파라미터**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| session_id | UUID | 세션 고유 식별자 |

**요청 바디**:
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| original_text | string | Y | - | 원본 인식 텍스트 |
| translated_text | string | Y | - | 번역된 텍스트 |
| confidence | float | N | null | 음성 인식 신뢰도 (0.0~1.0) |

**성공 응답** (201):
```json
{
  "id": 1,
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "original_text": "안녕하세요",
  "translated_text": "Hello",
  "confidence": 0.95,
  "created_at": "2026-03-05T10:01:00Z"
}
```

**에러 응답**:
- `400`: original_text 또는 translated_text가 비어있는 경우, confidence가 범위 밖인 경우
  ```json
  { "detail": "original_text and translated_text are required" }
  ```
- `404`: 해당 session_id의 세션이 존재하지 않는 경우
  ```json
  { "detail": "Session not found" }
  ```

---

## GET /api/sessions/{session_id}/logs

**설명**: 특정 세션의 번역 로그 목록을 조회한다.

**프로시저** (처리 절차):
1. 경로 파라미터에서 `session_id` 추출
2. UUID 형식 검증, 유효하지 않으면 400 반환
3. DB에서 해당 session_id의 TranslationSession 존재 여부 확인
4. 세션이 존재하지 않으면 404 반환
5. DB에서 해당 session_id의 TranslationLog를 created_at 오름차순으로 조회
6. 로그 목록을 200 반환

**경로 파라미터**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| session_id | UUID | 세션 고유 식별자 |

**성공 응답** (200):
```json
{
  "logs": [
    {
      "id": 1,
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "original_text": "안녕하세요",
      "translated_text": "Hello",
      "confidence": 0.95,
      "created_at": "2026-03-05T10:01:00Z"
    }
  ]
}
```

**에러 응답**:
- `400`: session_id가 유효한 UUID가 아닌 경우
  ```json
  { "detail": "Invalid session_id format" }
  ```
- `404`: 해당 session_id의 세션이 존재하지 않는 경우
  ```json
  { "detail": "Session not found" }
  ```

---

## GET /api/health

**설명**: 서버 상태를 확인한다. 프론트엔드에서 백엔드 연결 상태를 체크할 때 사용한다.

**프로시저** (처리 절차):
1. 서버 상태 "ok" 반환
2. 현재 UTC 시각을 타임스탬프로 포함

**요청 바디**: 없음 (GET 요청)

**성공 응답** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T10:00:00Z"
}
```

**에러 응답**: 서버가 응답하지 않으면 프론트엔드에서 네트워크 에러로 처리
