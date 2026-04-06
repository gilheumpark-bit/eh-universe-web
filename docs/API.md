# EH Universe Web — API Reference

All API routes are served under `/api/`. Unless stated otherwise, responses use `application/json`.

---

## Table of Contents

1. [GET /api/health](#get-apihealth)
2. [GET /api/ai-capabilities](#get-apiai-capabilities)
3. [POST /api/chat](#post-apichat)
4. [POST /api/image-gen](#post-apiimage-gen)
5. [POST /api/analyze-chapter](#post-apianalyze-chapter)
6. [POST /api/gemini-structured](#post-apigemini-structured)
7. [POST /api/structured-generate](#post-apistructured-generate)
8. [GET /api/local-proxy](#get-apilocal-proxy)
9. [POST /api/local-proxy](#post-apilocal-proxy)
10. [POST /api/error-report](#post-apierror-report)
11. [POST /api/translate](#post-apitranslate)
12. [GET /api/fetch-url](#get-apifetch-url)
13. [POST /api/agent-search](#post-apiagent-search)
14. [GET /api/agent-search/status](#get-apiagent-searchstatus)
15. [POST /api/network-agent/search](#post-apinetwork-agentsearch)
16. [POST /api/network-agent/ingest](#post-apinetwork-agentingest)
17. [GET /api/npm-search](#get-apinpm-search)
18. [POST /api/vitals](#post-apivitals)
19. [POST /api/upload](#post-apiupload)
20. [POST /api/checkout](#post-apicheckout)
21. [POST /api/share](#post-apishare)
22. [POST /api/code/autopilot](#post-apicodeautopilot)
23. [GET /api/cron/universe-daily](#get-apicronuniverse-daily)

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
  "uptimeMs": 123456,
  "checks": {
    "ai_providers": "ok | warn | fail",
    "firebase": "ok | warn"
  },
  "providers": { "configured": 3, "total": 5 },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

| HTTP Status | Meaning |
|---|---|
| 200 | Healthy or degraded |
| 503 | Unhealthy (a check returned `fail`) |

---

## GET /api/ai-capabilities

Returns which AI providers have server-side keys configured.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | None |

### Response

```json
{
  "hosted": {
    "gemini": true,
    "openai": false,
    "claude": false,
    "groq": true,
    "mistral": false
  },
  "anyHosted": true,
  "defaultHostedProvider": "gemini",
  "quickStartReady": true
}
```

---

## POST /api/chat

Server-side AI chat proxy with streaming. Supports multiple providers.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | BYOK (apiKey in body) or server env |
| **Rate Limit** | 60 req/min per IP (`chat` preset) |
| **Max Body** | 1 MB |
| **CSRF** | Origin header required; must match Host |

### Request Body

```json
{
  "provider": "gemini | openai | claude | groq | mistral | ollama | lmstudio",
  "model": "gemini-2.5-pro",
  "systemInstruction": "You are a helpful assistant.",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.9,
  "apiKey": "optional-byok-key",
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
| apiKey | string | No | BYOK mode |
| maxTokens | number | No | Claude only |
| prismMode | string | No | `"ALL"` injects safety guard |

### Response

- **Success**: `text/event-stream` (SSE streaming)
- **Error**: JSON with `error` field

### Error Codes

| Status | Meaning |
|---|---|
| 400 | Invalid provider, model, messages, temperature, or JSON |
| 401 | API key not configured |
| 403 | Origin header missing or mismatch |
| 413 | Request body exceeds 1 MB |
| 429 | Rate limit exceeded (includes `Retry-After` header) |
| 500 | Upstream provider error |

---

## POST /api/image-gen

Server-side image generation proxy. BYOK only (no server fallback).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | BYOK required (apiKey in body) |
| **Rate Limit** | 30 req/min per IP (`imageGen` preset) |
| **Max Body** | 1 MB |
| **Max Duration** | 60s |
| **CSRF** | Origin header required |

### Request Body

```json
{
  "provider": "openai | stability",
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
| provider | string | Yes | `openai` or `stability` |
| prompt | string | Yes | Image description |
| apiKey | string | Yes | Provider API key |
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
| 403 | Origin header missing or mismatch |
| 413 | Payload too large |
| 429 | Rate limit exceeded |
| 500 | Provider error |

---

## POST /api/analyze-chapter

Analyzes a novel chapter/manuscript using Gemini and returns structured scene data (characters, background, scene state, sound, image/music prompts).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | BYOK or server env (Gemini only) |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Body** | 512 KB |
| **CSRF** | Origin required (relaxed for BYOK) |

### Request Body

```json
{
  "content": "Chapter text here...",
  "language": "KO | EN | JP | CN",
  "model": "gemini-2.5-flash",
  "apiKey": "optional-byok-key"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| content | string | Yes | Manuscript text (truncated to 8000 chars internally) |
| language | string | No | Default `KO` |
| model | string | No | Default `gemini-2.5-flash` |
| apiKey | string | No | BYOK Gemini key |

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
| 401 | Gemini API key not configured |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 500 | Gemini API error |

---

## POST /api/gemini-structured

Gemini-powered structured data generation for various creative tasks.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | BYOK or server env (Gemini only) |
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
| 401 | API key not configured |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
| 500 | Gemini API error |

---

## POST /api/structured-generate

Provider-agnostic structured JSON generation. Supports Gemini (native JSON schema), OpenAI/Groq/Mistral (JSON mode), Claude (tool_use), and local providers (Ollama/LMStudio).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | BYOK or server env |
| **Rate Limit** | 120 req/min per IP (`default` preset) |
| **Max Body** | 512 KB |
| **CSRF** | Origin required (relaxed for BYOK) |

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
| apiKey | string | No | BYOK key |

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
| 401 | API key not configured |
| 403 | Origin mismatch |
| 413 | Request too large |
| 429 | Rate limit exceeded |
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

Multi-provider translation with streaming. Supports Gemini, OpenAI, Claude, DeepSeek, Mistral.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token or BYOK |
| **Rate Limit** | 120 req/min per IP |
| **CSRF** | Origin required |

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

## POST /api/agent-search

Agent Builder (Vertex AI Discovery Engine) search. Per-studio search across universe, novel, and code content.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None (server-side credentials) |
| **Rate Limit** | 120 req/min per IP |

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| studio | string | Yes | `universe`, `novel`, or `code` |
| query | string | Yes | Search query |
| pageSize | number | No | Results per page |
| conversationId | string | No | Conversational follow-up |

---

## GET /api/agent-search/status

Returns Agent Builder configuration status for each studio.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP |

---

## POST /api/network-agent/search

Multi-tenant search across Network content (planets, posts, translations).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token |
| **Rate Limit** | 120 req/min per IP |

---

## POST /api/network-agent/ingest

Ingests documents into the Network search index.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Firebase ID token |
| **Rate Limit** | 120 req/min per IP |

---

## GET /api/npm-search

Proxies npm registry search. Used by Code Studio for package discovery.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | 120 req/min per IP |

### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| q | string | Yes | Search query (max 200 chars) |

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
| **Auth** | None |
| **Rate Limit** | None |

Returns `{ url }` redirect to Stripe Checkout. Returns 501 if Stripe is not configured.

---

## POST /api/share

Temporary shareable link creation. Stores payload in-memory with configurable expiry (default 72h).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | None |
| **Rate Limit** | None |

---

## POST /api/code/autopilot

Code Studio autopilot endpoint. Generates structured JSON for code generation pipeline via Gemini.

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Server env (Gemini) |
| **Rate Limit** | 120 req/min per IP |
| **CSRF** | Origin required |

---

## GET /api/cron/universe-daily

Vercel Cron Job for daily universe maintenance (Gemini-powered content generation + Firestore writes).

| Property | Value |
|---|---|
| **Runtime** | Node.js |
| **Auth** | Bearer token (`CRON_SECRET` env) |
| **Schedule** | `0 0 * * *` (daily midnight) |

---

## Common Patterns

### CSRF Protection

Most mutating endpoints require an `Origin` header that matches the `Host` header. Requests without `Origin` are rejected with `403` unless they provide a BYOK `apiKey` (for endpoints that support it).

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

### API Key Resolution

For BYOK-supporting endpoints, key resolution order:
1. `apiKey` field in request body (BYOK)
2. Server environment variable (e.g., `GEMINI_API_KEY`, `OPENAI_API_KEY`)
