# API Endpoints

NOA Studio / EH Universe Web의 서버 API 명세.

---

## 공통 사항

| 항목 | 값 |
|------|-----|
| Base URL | `https://eh-universe-web.vercel.app/api` |
| 인증 | BYOK (클라이언트 API 키) 또는 서버 환경변수 |
| Rate Limit | IP당 30 req/분 (chat, structured-generate) |
| 최대 요청 크기 | 1MB (chat), 256KB (structured) |
| CSRF | Origin 헤더 필수 (BYOK 시 면제) |

---

## GET /api/health

헬스체크. 모니터링 도구 연동용.

**응답 예시:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeMs": 12345,
  "checks": { "ai_providers": "ok", "firebase": "ok" },
  "providers": { "configured": 3, "total": 5 },
  "timestamp": "2026-03-27T06:00:00.000Z"
}
```

| status | 의미 |
|--------|------|
| healthy | 전체 정상 |
| degraded | 일부 서비스 미설정 |
| unhealthy | 핵심 서비스 실패 (503) |

---

## GET /api/ai-capabilities

서버에 설정된 AI 프로바이더 가용성 조회. 인증 불필요.

**응답:**
```json
{
  "gemini": true,
  "openai": false,
  "claude": true,
  "groq": false,
  "mistral": false
}
```

---

## POST /api/chat

멀티 프로바이더 AI 스트리밍 프록시.

**요청:**
```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "apiKey": "AIza..."
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| provider | Y | gemini, openai, claude, groq, mistral, ollama, lmstudio |
| model | Y | 프로바이더별 모델명 (`/^[a-zA-Z0-9._-]+$/`) |
| messages | Y | OpenAI 호환 메시지 배열 |
| temperature | N | 0~2 (기본 0.7) |
| apiKey | N | BYOK 키. 없으면 서버 환경변수 사용 |

**응답:** SSE 스트림 (`text/event-stream`)
```
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

**에러:**
| 코드 | 의미 |
|------|------|
| 400 | 잘못된 요청 (provider/model/messages 누락) |
| 403 | CSRF 실패 (Origin 헤더 불일치) |
| 429 | Rate Limit 초과 |
| 500 | 프로바이더 API 오류 |

---

## POST /api/structured-generate

범용 JSON 구조화 생성. 모든 프로바이더 호환.

**요청:**
```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "prompt": "주인공 캐릭터를 생성해줘",
  "schema": { "type": "object", "properties": { ... } },
  "apiKey": "..."
}
```

**응답:** JSON 객체 (스키마에 맞는 구조화된 데이터)

---

## POST /api/gemini-structured

Gemini 전용 고급 구조화 생성. 스토리 요소별 특화.

**요청:**
```json
{
  "task": "characters",
  "genre": "SYSTEM_HUNTER",
  "prompt": "E랭크 헌터 각성 스토리",
  "language": "ko",
  "apiKey": "AIza..."
}
```

| task | 설명 |
|------|------|
| characters | 캐릭터 4명 생성 (hero/villain/ally/extra) |
| worldDesign | 세계관 설계 (13개 필드) |
| worldSim | 문명/진영 시뮬레이션 |
| sceneDirection | 장면 연출 요소 |
| items | 아이템 생성 |

---

## POST /api/analyze-chapter

Gemini 기반 원고 분석. 캐릭터/배경/장면/음향/이미지/음악 프롬프트 추출.

**요청:**
```json
{
  "text": "원고 텍스트 (최대 8000자)",
  "apiKey": "AIza..."
}
```

**응답:** 6개 분석 스키마 (characterState, backgroundState, sceneState, soundState, imagePromptPack, musicPromptPack)

---

## POST /api/image-gen

이미지 생성 프록시. OpenAI DALL-E 3 / Stability AI SDXL.

**Rate Limit:** IP당 10 req/분

**요청:**
```json
{
  "provider": "openai",
  "prompt": "SF 도시 배경",
  "size": "1024x1024",
  "apiKey": "sk-..."
}
```

---

## POST /api/local-proxy (GET도 지원)

로컬 LLM 프록시. Chrome PNA(Private Network Access) 우회용.

**허용 호스트:** localhost, 127.0.0.1, 192.168.*, 10.*, 172.16~31.*

**요청:** OpenAI 호환 `/v1/chat/completions` 형식 그대로 전달.

> Vercel 배포 시 로컬 LLM 접근 불가 (사설 IP 라우팅 불가)
