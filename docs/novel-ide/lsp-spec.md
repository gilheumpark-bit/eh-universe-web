# Loreguard LSP — 외부 통합 사양

> **Phase F (86~95) 완료 / 2026-05-07**
> 외부 도구와 CI가 Loreguard의 검증·인덱싱 기능을 호출하기 위한 REST + SSE API.

---

## Endpoints

### `POST /api/lsp/auth` — 토큰 발급

**Request**: 본문 없음 (Phase 1 — Phase 2 에서 Firebase 인증 추가)

**Response 200**:
```json
{
  "token": "lg_lsp_<32hex>",
  "tokenHash": "<sha256>",
  "issuedAt": "2026-05-07T00:00:00Z"
}
```

**주의**: 토큰은 1회만 표시. 분실 시 재발급. 클라이언트 안전 저장 책임.

---

### `POST /api/lsp/lint` — 5축 검증

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "projectId": "my-novel-001",
  "synopsis": "주인공 김준의 모험",
  "episodes": [
    { "episode": 1, "content": "김준이 검을 휘둘렀다." },
    { "episode": 2, "content": "[떡밥-검은검] 김준은 검을 보았다." }
  ],
  "characters": [
    { "id": "c1", "name": "김준", "role": "주인공", "traits": "용감" }
  ]
}
```

**Response 200**:
```json
{
  "overallScore": 87,
  "axisScores": {
    "plotDrift": 75,
    "characterArc": 95,
    "worldViolation": 100,
    "foreshadow": 80,
    "tension": 85
  },
  "foreshadowMisses": 1,
  "totalViolations": 2,
  "summary": [
    { "kind": "foreshadow-unresolved", "severity": "warning", "episodeId": 2, "message": "..." }
  ],
  "generatedAt": "2026-05-07T01:00:00Z",
  "manuscriptHash": "abc123"
}
```

**Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

### `POST /api/lsp/symbols` — Symbol Index export

**Request**:
```json
{
  "config": { "characters": [...], "items": [...] },
  "episodes": [...]
}
```

**Response 200**:
```json
{
  "definitions": [
    { "id": "character:c1", "kind": "character", "name": "김준", "aliases": [...], "definition": "...", "jumpTarget": {...} }
  ],
  "referencesCount": 14,
  "byKindCounts": { "character": 5, "place": 3, "item": 2, "concept": 1, "event": 0 },
  "manuscriptHash": "abc123"
}
```

---

### `GET /api/lsp/diagnostics?token=<token>` — SSE stream

**Response**: `text/event-stream`

**Events**:
- `connected`: 초기 연결 — `{at: ISO}`
- `heartbeat`: 30초 간격 keepalive
- `diagnostic` (Phase 2): 저장 직후 새 위반 push

```
event: connected
data: {"at":"2026-05-07T01:00:00Z"}

event: heartbeat
data: {"at":"2026-05-07T01:00:30Z"}
```

---

## Rate Limit

- 토큰당 분당 60 req
- 초과 시 `429 Too Many Requests` + `Retry-After` 헤더

---

## REST 사용

```bash
curl -X POST https://ehsu.app/api/lsp/lint \
  -H "Authorization: Bearer lg_lsp_xxxxxx" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

**manuscript.md 형식**:
```markdown
# EP1
김준이 검을 휘둘렀다.

# EP2
[떡밥-검은검] 김준은 새로운 검을 보았다.
```

**출력 예**:
```
Loreguard LSP Lint
==================
Overall: 87 / 100

Plot Drift   : 75
Character    : 95
World Rules  : 100
Foreshadow   : 80 (1 misses)
Tension      : 85

Total violations: 2

Top violations:
  [WARNING] foreshadow-unresolved (EP2) — Foreshadow [검은검] unresolved...
```

---

## VS Code 확장 (Phase 2)

별도 repo `loreguard-vscode` 에서 marketplace 출시 예정. extension API 는 위 REST 호출 wrapper.

---

## 인증 정책

- Phase 1: Token 형식만 검증 (`lg_lsp_` prefix + 32 hex). 발급/저장은 단일 사용자.
- Phase 2: Firebase Custom Claims 연동 — 사용자별 토큰 hash Firestore 저장, 발급/회수 관리.
- Phase 3: OAuth 2.0 — 출판사·번역사 등 외부 조직이 작가 권한 제한 액세스.
