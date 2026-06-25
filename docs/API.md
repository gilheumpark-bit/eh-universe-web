# Loreguard — API Reference

Last updated: 2026-06-24

2026-06-24 baseline note:

- This document remains the current route contract baseline after the repo cleanup pass.
- Disabled compatibility routes such as `/api/agent-search` and `/api/network-agent/*` stay documented because they are still callable and must keep returning disabled/retired responses.

All API routes are served under `/api/`. Unless stated otherwise, responses use `application/json`.

---

## Table of Contents

1. [GET /api/health](#get-apihealth)
2. [GET /api/ai-capabilities](#get-apiai-capabilities)
3. [POST /api/chat](#post-apichat)
4. [POST /api/complete](#post-apicomplete)
5. [POST /api/image-gen](#post-apiimage-gen)
6. [POST /api/analyze-chapter](#post-apianalyze-chapter)
7. [POST /api/gemini-structured](#post-apigemini-structured)
8. [POST /api/structured-generate](#post-apistructured-generate)
9. [GET /api/local-proxy](#get-apilocal-proxy)
10. [POST /api/local-proxy](#post-apilocal-proxy)
11. [POST /api/error-report](#post-apierror-report)
12. [POST /api/translate](#post-apitranslate)
13. [GET /api/fetch-url](#get-apifetch-url)
14. [POST /api/agent-search](#post-apiagent-search-disabled)
15. [GET /api/agent-search/status](#get-apiagent-searchstatus-disabled)
16. [GET/POST /api/network-agent/search](#getpost-apinetwork-agentsearch-retired)
17. [GET/POST /api/network-agent/ingest](#getpost-apinetwork-agentingest-retired)
18. [POST /api/vitals](#post-apivitals)
19. [POST /api/upload](#post-apiupload)
20. [POST /api/checkout](#post-apicheckout)
21. [POST /api/release-credit/checkout](#post-apirelease-creditcheckout)
22. [POST /api/release-credit/debit](#post-apirelease-creditdebit)
23. [POST /api/release-credit/operation](#post-apirelease-creditoperation)
24. [POST /api/share](#post-apishare)
25. [GET /api/cron/universe-daily](#get-apicronuniverse-daily)

---

## Hosted Model Usage Gate

Hosted model routes require either a Firebase ID token for the built-in service pool or a user-provided connection key in the request body.

When `NEXT_PUBLIC_PAYMENT_LIVE=true`, `src/lib/server-tier-limit.ts` enforces Free/Pro usage limits on `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, and `/api/image-gen` with `local-spark`.
Connection-key requests do not consume Hosted usage. Deterministic `/api/lsp/*` routes stay on their LSP token and rate-limit contract because they do not currently spend hosted model capacity.

Common paywall response:

```json
{
  "error": "login_or_byok_required | plan_limit_reached",
  "message": "사용자에게 표시할 안내 문구",
  "paywall": {
    "reason": "로그인 또는 연결 키가 필요합니다.",
    "feature": "노아 대화",
    "currentTier": "free",
    "requiredTier": "pro",
    "unlocksWith": ["Pro 플랜", "연결 키 등록"],
    "pricingUrl": "/pricing",
    "settingsTarget": "환경 설정 > 노아 운영"
  }
}
```

---

## GET /api/health

Production health check endpoint.

| Property | Value |
|---|---|
| **Runtime** | Edge |
| **Auth** | None |
| **Rate Limit** | None |

### Response

```json
{
  "status": "healthy | degraded | unhealthy",
  "version": "1.0.0",
  "timestamp": 1760000000000
}
```

| HTTP Status | Meaning |
|---|---|
| 200 | Healthy or degraded |
| 503 | Unhealthy (a check returned `fail`) |

---

## GET /api/ai-capabilities

Returns opaque capability flags for hosted developer API, connection-key, and local/development model operation. DGX/local availability is not counted as Hosted availability.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | None |

### Response

```json
{
  "byokRequired": false,
  "hasDgx": false,
  "dgxConfigured": true,
  "localDevAvailable": false,
  "hosted": {
    "gemini": false,
    "openai": true,
    "claude": false,
    "deepseek": false,
    "qwen": false,
    "minimax": false,
    "kimi": false,
    "groq": false,
    "mistral": false,
    "ollama": false,
    "lmstudio": false
  },
  "supportedProviders": ["gemini", "openai", "claude", "deepseek", "qwen", "minimax", "kimi", "groq", "mistral", "ollama", "lmstudio"],
  "message": "Hosted developer API is available."
}
```

---

## POST /api/chat

Server-side Noa chat proxy with streaming. Provider availability follows Hosted, connection-key, and Local operation settings.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token for Hosted, or connection key (`apiKey` in body) |
| **Rate Limit** | 60 req/min per IP (`chat` preset) |
| **Max Body** | 1 MB |
| **CSRF** | Origin header required; must match Host |

### Request Body

```json
{
  "provider": "gemini | openai | claude | deepseek | qwen | minimax | kimi | groq | mistral | ollama | lmstudio",
  "model": "gemini-2.5-pro",
  "systemInstruction": "You are a helpful assistant.",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.9,
  "apiKey": "optional-connection-key",
  "maxTokens": 8192,
  "prismMode": "ALL"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| provider | string | Yes | Must be a valid server provider ID |
| model | string | Yes | Alphanumeric + `.`, `-`, `_` |
| messages | array | Yes | At least one message |
| temperature | number | No | 0–2, default 0.9 |
| systemInstruction | string | No | System prompt |
| apiKey | string | No | Connection-key mode |
| maxTokens | number | No | Claude only |
| prismMode | string | No | `"ALL"` injects safety guard |

### Response

- **Success**: `text/event-stream` (SSE streaming)
- **Error**: JSON with `error` field

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid provider, model, messages, temperature, or JSON |
| 401 | Login or connection key required, or provider key not configured |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin header missing or mismatch |
| 413 | Request body exceeds 1 MB |
| 429 | Rate limit exceeded (includes `Retry-After` header) |
| 500 | Upstream provider error |

---

## POST /api/complete

Fast Tab 이어쓰기 for the writing editor. It uses the low-latency completion path and is billed as Hosted usage unless the request carries a valid connection key.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token for Hosted, or connection key (`apiKey` in body) |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Tokens** | 150 hard cap |
| **CSRF** | Origin header required; must match Host |

### Request Body

```json
{
  "text": "마지막 문맥...",
  "genre": "fantasy",
  "characters": ["주인공"],
  "language": "KO",
  "apiKey": "optional-connection-key",
  "maxTokens": 100
}
```

### Response

```json
{ "completion": "이어질 문장" }
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid JSON or text too short |
| 401 | Login or connection key required |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin header missing or mismatch |
| 429 | Rate limit exceeded |
| 500 | Provider error |

---

## POST /api/image-gen

Server-side image generation proxy. External providers require a connection key. `local-spark` uses the configured local image server and follows the Hosted usage gate.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | External provider connection key (`apiKey` in body), or Firebase ID token for `local-spark` |
| **Rate Limit** | 30 req/min per IP (`imageGen` preset) |
| **Max Body** | 1 MB |
| **Max Duration** | 180s |
| **CSRF** | Origin header required |

### Request Body

```json
{
  "provider": "openai | stability | local-spark",
  "prompt": "A futuristic cityscape at sunset",
  "negativePrompt": "blurry, low quality",
  "apiKey": "sk-...",
  "width": 1024,
  "height": 1024,
  "n": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| provider | string | Yes | `openai`, `stability`, or `local-spark` |
| prompt | string | Yes | Image description |
| apiKey | string | External providers only | Provider connection key. Not used by `local-spark` |
| negativePrompt | string | No | What to avoid |
| width | number | No | Default 1024 |
| height | number | No | Default 1024 |
| n | number | No | Number of images (max 4 for Stability, always 1 for DALL-E 3) |

### Response

```json
{
  "images": [
    {
      "url": "https://... or data:image/png;base64,...",
      "revised_prompt": "OpenAI revised prompt (DALL-E only)"
    }
  ]
}
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Missing required fields or unsupported provider |
| 401 | Login or connection key required for `local-spark`; response includes `paywall` |
| 402 | Hosted plan limit reached for `local-spark`; response includes `paywall` |
| 403 | Origin header missing or mismatch |
| 413 | Payload too large |
| 429 | Rate limit exceeded |
| 500 | Provider error |

---

## POST /api/analyze-chapter

Analyzes a novel chapter/manuscript and returns structured scene data (characters, background, scene state, sound, image/music prompts).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token for Hosted, or connection key (`apiKey` in body) |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Body** | 512 KB |
| **CSRF** | Origin required (relaxed for connection-key requests) |

### Request Body

```json
{
  "content": "Chapter text here...",
  "language": "KO | EN | JP | CN",
  "model": "gemini-2.5-flash",
  "apiKey": "optional-connection-key"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| content | string | Yes | Manuscript text (truncated to 8000 chars internally) |
| language | string | No | Default `KO` |
| model | string | No | Default `gemini-2.5-flash` |
| apiKey | string | No | Connection key |

### Response

```json
{
  "characterState": [{ "name": "...", "presence": "direct", ... }],
  "backgroundState": { "location": "...", ... },
  "sceneState": { "summary": "...", "phase": "...", "tension": "mid", ... },
  "soundState": { "ambient": [...], ... },
  "imagePromptPack": { "characterFocus": "...", ... },
  "musicPromptPack": { "mood": "...", ... }
}
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Empty content or invalid JSON |
| 401 | Login or connection key required |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 503 | Server provider unavailable; register a connection key or configure a hosted/local model |
| 500 | Provider error |

---

## POST /api/gemini-structured

Structured data generation compatibility route for Gemini-compatible tasks. The historical route name is not presented as a default Hosted product path.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token for Hosted, or connection key (`apiKey` in body) |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Body** | 256 KB |
| **CSRF** | Origin required |

### Request Body

```json
{
  "task": "characters | worldDesign | worldSim | sceneDirection | items",
  "model": "gemini-2.5-pro",
  "language": "KO",
  "apiKey": "optional",
  "config": { "genre": "...", "synopsis": "..." },
  "count": 4,
  "existingNames": ["Alice"],
  "genre": "sci-fi",
  "synopsis": "...",
  "characters": ["Alice", "Bob"],
  "hints": { "title": "...", "setting": "..." },
  "worldContext": { "corePremise": "..." },
  "tierContext": { "charProfiles": [...] }
}
```

The fields required depend on the `task`:

| Task | Required Fields |
|---|---|
| `characters` | `config.genre`, `config.synopsis` |
| `worldDesign` | `genre` |
| `worldSim` | `synopsis`, `genre` |
| `sceneDirection` | `synopsis`, `characters` (array) |
| `items` | `config.genre`, `config.synopsis` |

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid task, missing fields, or invalid JSON |
| 401 | Login or connection key required, or provider not configured; paywall responses include `paywall` |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 500 | Provider error |

---

## POST /api/structured-generate

Structured JSON generation. Supports hosted operation, connection-key operation, and local providers.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token for Hosted, or connection key (`apiKey` in body) |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Body** | 512 KB |
| **CSRF** | Origin required (relaxed for connection-key requests) |

### Request Body

```json
{
  "provider": "gemini | openai | claude | groq | mistral | ollama | lmstudio",
  "model": "gemini-2.5-flash",
  "prompt": "Generate a character profile...",
  "schema": { "type": "object", "properties": { ... } },
  "fallback": {},
  "language": "KO",
  "apiKey": "optional"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| prompt | string | Yes | Generation prompt |
| provider | string | No | Default `gemini` |
| model | string | No | Provider-specific default used if omitted |
| schema | object | No | JSON schema for structured output |
| fallback | any | No | Default `{}` |
| language | string | No | Default `KO` |
| apiKey | string | No | Connection key |

### Response

Returns the generated JSON object directly, with an added `_meta` field:

```json
{
  "name": "...",
  "_meta": { "provider": "gemini", "model": "gemini-2.5-flash", "language": "KO" }
}
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid provider, empty prompt, or invalid JSON |
| 401 | Login or connection key required |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 503 | Server provider unavailable; register a connection key or configure a hosted/local model |
| 500 | Provider API error |

---

## GET /api/local-proxy

Proxies GET requests to a local LLM server (Ollama/LM Studio) to bypass Chrome Private Network Access restrictions. Only allows private/local network addresses.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Timeout** | 5s |

### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| baseUrl | string | Yes | Must be a private network address (localhost, 10.x, 192.168.x, 172.16-31.x) |

### Response

Returns the `/v1/models` response from the local LLM server.

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Missing `baseUrl` |
| 403 | `baseUrl` is not a valid private network address |
| 429 | Rate limit exceeded |
| 502 | Local server unreachable or error |

---

## POST /api/local-proxy

Proxies POST requests (chat completions) to a local LLM server. Supports streaming pass-through.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Timeout** | 30s |

### Request Body

```json
{
  "baseUrl": "http://localhost:1234",
  "model": "local-model",
  "messages": [...],
  "stream": true
}
```

The `baseUrl` field is extracted; all other fields are forwarded to the local server's `/v1/chat/completions` endpoint.

### Response

- **Streaming** (`stream: true`): `text/event-stream` pass-through
- **Non-streaming**: JSON response from local server

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Missing `baseUrl` or invalid JSON |
| 403 | `baseUrl` is not a valid private network address |
| 429 | Rate limit exceeded |
| 502 | Local server error |

---

## POST /api/error-report

Client-side error ingestion endpoint. Logs structured error reports to stdout (queryable via Vercel Logs).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 60 reports/min per IP (inline limiter) |
| **Max Body** | 4096 bytes |

### Request Body

```json
{
  "message": "Uncaught TypeError: ...",
  "stack": "at Component (file.tsx:12:5)...",
  "source": "window.onerror",
  "url": "/studio"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| message | string | No | Truncated to 200 chars in log |
| stack | string | No | Truncated to 300 chars in log |
| source | string | No | Error source identifier |
| url | string | No | Page URL where error occurred |

### Response

| Status | Meaning |
|---|---|
| 204 | Report accepted (no body) |
| 400 | Invalid JSON |
| 413 | Body exceeds 4096 bytes |
| 429 | Rate limit exceeded |

---

## POST /api/translate

Translation and localization with streaming. Provider availability follows Hosted, connection-key, and Local operation settings.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token or connection key |
| **Rate Limit** | 120 req/min per IP |
| **CSRF** | Origin required |

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid input or unsupported provider |
| 401 | Login or connection key required |
| 402 | Hosted plan limit reached; response includes `paywall` |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 500 | Provider error |

---

## GET /api/fetch-url

Server-side URL fetch proxy. Validates URL against an allowlist (blocks private networks, dangerous schemes).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | Per-IP (custom limiter) |

### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| url | string | Yes | Must pass allowlist validation |

---

## POST /api/agent-search (disabled)

Compatibility route for the removed external search path.
It is intentionally disabled and returns `503`.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None; no downstream work is performed |
| **Rate Limit** | Disabled before downstream calls |

### Response

```json
{ "error": "agent_search_disabled" }
```

Do not document this route as an active user feature.

---

## GET /api/agent-search/status (disabled)

Compatibility route for the removed Agent Builder status path.
It is intentionally disabled and returns `503`.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None; no downstream work is performed |
| **Rate Limit** | Disabled before downstream calls |

### Response

```json
{ "error": "agent_search_disabled" }
```

---

## GET/POST /api/network-agent/search (retired)

Retired compatibility route for a removed search path.
It performs no search work and returns `410`.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None; removed surface |
| **Rate Limit** | Not applied; removed before downstream work |

### Response

```json
{
  "ok": false,
  "error": "surface_removed",
  "message": "This retired API surface is no longer active in Loreguard."
}
```

---

## GET/POST /api/network-agent/ingest (retired)

Retired compatibility route for a removed ingest path.
It performs no indexing or write work and returns `410`.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None; removed surface |
| **Rate Limit** | Not applied; removed before downstream work |

### Response

```json
{
  "ok": false,
  "error": "surface_removed",
  "message": "This retired API surface is no longer active in Loreguard."
}
```

---

## POST /api/vitals

Client-side Web Vitals ingestion. Logs performance metrics to stdout.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP |
| **CSRF** | Origin required |

---

## POST /api/upload

File upload endpoint (DOCX manuscript import). Parses DOCX via mammoth and returns structured narrative text.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP |

---

## POST /api/checkout

Stripe Checkout session creation for subscription billing.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase Bearer token required |
| **Rate Limit** | 10 req/min per IP (`imageGen` preset reuse) |
| **Feature Gate** | `STRIPE_SECRET_KEY` and `FEATURE_STRIPE_CHECKOUT=on` |

Returns `{ url }` redirect to Stripe Checkout when enabled.

Disabled response:

```json
{ "error": "checkout_disabled" }
```

No `/api/redeem` route exists as of 2026-06-15. Redeem-code support is a future entitlement-ledger feature, not an active API.

---

## POST /api/release-credit/checkout

Creates a Stripe Checkout payment-mode session for certificate/export-credit products. This is not redeem-code support.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase Bearer token required |
| **Rate Limit** | 10 req/min per IP |
| **Feature Gate** | `STRIPE_SECRET_KEY` and `FEATURE_STRIPE_CHECKOUT=on` |

### Request Body

```json
{
  "productId": "episode-basic | episode-c2pa | complete-basic | complete-pro | publisher-package",
  "projectId": "project_123",
  "periodKey": "2026-06",
  "certificateId": "optional-certificate-id",
  "returnUrl": "https://example.com/studio"
}
```

### Response

```json
{ "url": "https://checkout.stripe.com/..." }
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid input or unsupported checkout product |
| 401 | Missing or invalid Firebase token |
| 429 | Rate limit exceeded |
| 501 | Product price ID is not configured |
| 503 | Checkout is disabled |

---

## POST /api/release-credit/debit

Debits release credits from the authenticated user's project ledger. The server loads or initializes the ledger from the user's active subscription and never trusts client-side plan values.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase Bearer token required |
| **Rate Limit** | 12 req/min per IP |

### Request Body

```json
{
  "projectId": "project_123",
  "periodKey": "2026-06",
  "packageProfileId": "public-reader | external-submission | ip-sale | internal-archive",
  "certificateId": "LG-2026-0615-0001",
  "workTitle": "Optional work title"
}
```

### Response

```json
{
  "ok": true,
  "status": "applied | duplicate",
  "balance": 9,
  "ledgerUpdatedAt": "2026-06-15T00:00:00.000Z"
}
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Missing or invalid Firebase token |
| 403 | Subscription is not active |
| 409 | Ledger missing, insufficient credits, duplicate/conflict retry, or invalid operation |
| 429 | Rate limit exceeded |
| 502 | Ledger store operation failed |
| 503 | Ledger service is misconfigured |

---

## POST /api/release-credit/operation

Applies ledger operations such as purchase grant, refund/restore, void debit, or reissue note. Purchase, refund, and restore operations require the internal server secret and are intended for verified server-side payment events.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase Bearer token required |
| **Rate Limit** | 12 req/min per IP |
| **Internal Secret** | `x-loreguard-admin-secret` required for purchase/refund/void operations |

### Request Body

```json
{
  "kind": "purchase-grant | refund-credit | void-debit | reissue-note",
  "projectId": "project_123",
  "periodKey": "2026-06",
  "idempotencyKey": "release-credit:purchase:abc123",
  "creditAmount": 1,
  "packageProfileId": "external-submission",
  "productId": "episode-c2pa",
  "certificateId": "LG-2026-0615-0001",
  "reasonKo": "C2PA 회차 패키지 별도 구매 반영",
  "fallbackPlanId": "starter"
}
```

### Response

```json
{
  "ok": true,
  "status": "applied | duplicate",
  "balance": 10,
  "ledgerUpdatedAt": "2026-06-15T00:00:00.000Z"
}
```

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Missing or invalid Firebase token |
| 403 | Internal authorization required |
| 409 | Ledger missing, duplicate/conflict retry, or invalid operation |
| 429 | Rate limit exceeded |
| 502 | Ledger store operation failed |

---

## POST /api/share

Temporary shareable link creation. Stores payload in-memory with configurable expiry (default 72h).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | None |

---

## GET /api/cron/universe-daily

Vercel Cron Job for daily maintenance work.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Bearer token (`CRON_SECRET` env) |
| **Schedule** | `0 0 * * *` (daily midnight) |

---

## Common Patterns

### CSRF Protection

Most mutating endpoints require an `Origin` header that matches the `Host` header. Requests without `Origin` are rejected with `403` unless they provide a connection-key `apiKey` for endpoints that support it.

### Rate Limiting

Rate limits use an in-memory sliding window per IP, keyed by `route:ip`. Three presets exist:

| Preset | Window | Max Requests |
|---|---|---|
| `chat` | 60s | 60 |
| `imageGen` | 60s | 30 |
| `default` | 60s | 120 |

When rate-limited, responses include a `Retry-After` header (in seconds).

### IP Extraction

Client IP is resolved from headers in this priority order:
1. `x-real-ip`
2. First entry in `x-forwarded-for`
3. Fallback: `"unknown"`

### Connection Key Resolution

For connection-key-supporting endpoints, key resolution order:
1. `apiKey` field in request body
2. Server environment variable (e.g., `GEMINI_API_KEY`, `OPENAI_API_KEY`)
