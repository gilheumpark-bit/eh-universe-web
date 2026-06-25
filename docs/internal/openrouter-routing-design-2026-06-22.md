# OpenRouter Routing Design — 2026-06-22

목적: Upstage를 앱 제공 기본 API로 두고, OpenRouter는 단순 모델 제공자가 아니라 "통합 라우터 연결"로 취급한다. Loreguard의 원고 보호·권리/IP·비용 통제 기준에 맞춰 두 경로의 역할을 분리한다.

## 0. 운영 기준

앱이 기본 제공하는 Hosted API는 일단 Upstage다.

- 공개 운영 기본값: Upstage Solar 계열.
- 사용자 연결 키: 사용자가 직접 등록한 provider.
- OpenRouter: 보조 라우터 연결. 기본 원고 엔진이 아니다.
- 로컬/DGX: 개발·비상 검증용 경로. Hosted 기본값으로 설명하지 않는다.

2026-06-22 공식 확인:

- Upstage Console 예제는 OpenAI SDK 호환 방식으로 `base_url="https://api.upstage.ai/v1"`와 `model="solar-pro3"`를 사용한다.
- Upstage는 2026-03 Solar Pro 3를 공개했고, 한국어·추론·instruction following 개선을 전면에 내세운다.
- Upstage 공식 글 기준 Solar Pro 3는 OpenRouter에서도 제공되지만, Loreguard의 앱 제공 API와 OpenRouter 보조 라우터는 분리한다.

## 1. 현재 코드 상태

현재 앱에는 OpenRouter 전용 설계가 없다.

- `src/lib/ai-providers.catalog.ts`: `openrouter` provider 없음.
- `src/lib/server-provider-shared.ts`: 서버 provider 목록에 `openrouter` 없음.
- `src/services/aiProviders.ts`: `https://openrouter.ai/api/v1/chat/completions` 없음.
- `src/services/aiProvidersStructured.ts`: 구조화 생성 경로에 OpenRouter 없음.
- `.env.example`: `OPENROUTER_API_KEY` 없음.
- 요청 단위 ZDR(`provider.zdr`) 강제 없음.

OpenRouter 기반은 일부 준비되어 있다.

- `src/lib/provider-routing-policy.ts`: low/standard/manuscript/full-text 민감도 판정 추가됨.
- `src/lib/ai-providers.ts`: 자동 보조 연결 전환은 low/standard에서만 허용됨.
- 원고 본문·번역·분석 요청은 자동 우회를 막는 구조가 생김.

Upstage는 아직 코드에 없다.

- `src/lib/ai-providers.catalog.ts`: `upstage` provider 없음.
- `src/lib/server-provider-shared.ts`: `upstage` 없음.
- `src/services/aiProviders.ts`: `https://api.upstage.ai/v1/chat/completions` 없음.
- `.env.example`: `UPSTAGE_API_KEY` 없음.

따라서 실제 운영 기준을 맞추려면 Upstage provider 등록이 OpenRouter보다 먼저다.

## 2. 2026년 현재 흐름

공식 문서 기준으로 최근 흐름은 다음 6개다.

1. 통합 라우터/AI Gateway
   - 하나의 API 뒤에서 여러 모델과 provider를 다루는 방식이 일반화되고 있다.
   - OpenRouter는 model routing과 provider routing을 분리한다.
   - Vercel AI Gateway도 provider order/only, model fallback을 강조한다.

2. Provider object 기반 세밀 통제
   - `provider.order`, `provider.only`, `provider.allow_fallbacks`, `provider.sort`, `provider.max_price`, `provider.zdr` 같은 요청 단위 제어가 핵심이다.
   - "싼 곳 아무 데나"가 아니라, 작업 성격별로 provider 후보군을 좁히는 방식이 유행이다.

3. ZDR / data policy routing
   - 원고·계약·고객 데이터는 Zero Data Retention 조건을 요청 단위로 강제하는 흐름이 강하다.
   - OpenRouter는 `provider: { zdr: true }`로 요청 단위 ZDR을 강제할 수 있다.
   - 단, ZDR이 켜지면 일부 모델/provider가 제외될 수 있다.

4. Preset 기반 운영
   - 모델 slug를 코드에 박는 대신 preset을 만들고, 앱은 `@preset/...` 같은 참조를 쓰는 방식이 부상 중이다.
   - 장점: 모델 교체·fallback·ZDR 정책을 대시보드에서 수정 가능.
   - 단점: 앱 내부 감사에는 "실제로 어떤 모델/provider가 처리했는지" 메타데이터를 반드시 저장해야 한다.

5. 비용·속도·장애 복구의 분리
   - latency-sensitive 작업은 throughput/latency 우선.
   - batch나 실험 작업은 price/floor 우선.
   - 원고·번역·확인서 근거 작업은 ZDR/고정 provider 우선.

6. Open-weight / 저비용 모델 실험 증가
   - OpenRouter의 2026년 컬렉션은 창작/역할극/코딩 영역에서 DeepSeek, MiniMax, Hy3, GLM, Qwen 계열 같은 저비용·오픈웨이트 계열 사용량이 크다.
   - Loreguard 관점에서는 "메인 원고 품질"보다 "초안 후보, 세계관 짧은 검토, 비용 낮은 실험" 영역에 적합하다.

## 3. Loreguard 도입 원칙

Upstage를 Hosted 기본 엔진으로 두고, OpenRouter를 메인 원고 엔진으로 바로 두지 않는다.

권장 포지션:

- Upstage: 앱 제공 API, 한국어 중심 기본 응답, 원고·세계관·집필 흐름의 우선 경로.
- 1순위: 예비 연결 / 실험 연결 / 저비용 후보 생성.
- 2순위: 세계관 짧은 질의, 장르 후보, 표현 후보, 로컬 모델 대비용.
- 제한: 원고 전문, 번역 전문, 확인서 근거, 권리/IP 패키지 판단에는 ZDR 강제 + fallback 제한 없이는 사용 금지.

제품 표면 문구:

- 공개 UI: `OpenRouter`를 전면 판매 문구로 밀지 않는다.
- 설정 UI: `통합 라우터 연결` 또는 `보조 라우터 연결`.
- 도움말: "여러 모델을 한 연결로 테스트할 수 있습니다. 원고 본문 작업은 원고 보호 기준을 따릅니다."

## 4. 민감도별 라우팅 정책

| 민감도 | 예시 작업 | 기본 경로 | OpenRouter 허용 | 필수 provider 정책 |
|---|---|---|---:|---|
| `low` | 연결 테스트, 짧은 도움말, UI 문구 후보 | Upstage 또는 보조 연결 | 허용 | `allow_fallbacks: true`, 비용/속도 우선 가능 |
| `standard` | 세계관 짧은 질문, 캐릭터 아이디어, 장르 후보 | Upstage | 허용 | 필요 시 `zdr: true`, fallback 허용 가능 |
| `manuscript` | 원고 초안, 퇴고, 상세 패스, 긴 노아 제안 | Upstage 우선 | 제한 허용 | `zdr: true`, `allow_fallbacks: false` 또는 고정 후보 |
| `full-text` | 회차 전문 번역, 전문 분석, 확인서 근거 | Upstage 또는 직접 provider | 기본 비허용 | 직접 provider 권장. 사용 시 `zdr: true`, 고정 preset, 결과 메타 저장 |

## 5. 3개 도입안

### 1안 — 예비 연결 전용

가장 안전한 안.

- OpenRouter를 provider 목록에 추가하되 기본 비활성.
- `low`/`standard` 요청에서만 사용.
- `manuscript`/`full-text`는 앱 정책으로 차단.
- 모델 자동 fallback은 허용하되 원고 작업에는 진입 불가.

장점:

- 빠르게 도입 가능.
- 원고 보호 논리와 충돌이 작다.
- 월 1만원 구독의 비용 방어에 유리하다.

단점:

- OpenRouter의 핵심 장점인 폭넓은 모델 라우팅을 원고 본문에 적극 활용하지 못한다.

적합도: 현재 알파/오디션 단계에 가장 적합.

### 2안 — 민감도별 라우터

로어가드식 정석 안.

- `ProviderRequestSensitivity`에 따라 OpenRouter payload를 다르게 만든다.
- `low`: `provider.sort = "throughput"` 또는 기본 routing.
- `standard`: 비용/속도 균형.
- `manuscript`: `provider.zdr = true`, `provider.allow_fallbacks = false`.
- `full-text`: 직접 provider 우선. OpenRouter 사용 시 preset만 허용.
- 응답 후 실제 provider/model 메타데이터를 과정기록에 저장한다.

장점:

- Loreguard의 "작업 성격별 관제"와 맞는다.
- 오픈라우터의 장점을 살리면서 원고 보호를 유지한다.

단점:

- 구현량이 늘어난다.
- OpenRouter 응답 메타데이터 저장 설계를 같이 해야 한다.

적합도: 베타 안정화 후 메인 후보.

### 3안 — Preset / Guardrail 운영

운영팀/기업형에 가까운 안.

- OpenRouter dashboard에서 preset을 만든다.
- 예: `loreguard-light`, `loreguard-world`, `loreguard-zdr-manuscript`.
- 앱은 preset ID만 호출한다.
- 정책 변경은 코드 배포 없이 preset에서 수정한다.

장점:

- 모델 변경 대응이 빠르다.
- provider 변경, fallback, ZDR 정책을 운영에서 제어 가능.
- B2B 운영에 어울린다.

단점:

- 앱 내부 단일 소스 원칙이 약해질 수 있다.
- preset 변경 이력과 실제 호출 메타데이터를 별도 감사해야 한다.

적합도: B2B/플랫폼 제휴 이후.

## 6. 권장 결론

현재는 Upstage Hosted를 먼저 붙이고, OpenRouter는 1안으로 시작한다. 코드 구조는 2안으로 확장 가능하게 만든다.

실행 순서:

1. Upstage를 앱 제공 Hosted API로 등록.
2. `UPSTAGE_API_KEY` 서버 env를 추가.
3. 기본 Hosted provider 우선순위를 Upstage로 둔다.
4. OpenRouter를 `보조 라우터 연결`로 등록.
5. `OPENROUTER_API_KEY` 서버 env와 사용자 연결 키 둘 다 허용.
6. OpenRouter는 low/standard 요청만 우선 허용.
7. manuscript/full-text는 1차에서 차단.
8. 이후 ZDR payload와 메타데이터 저장을 붙여 2안으로 확장.

## 7. 구현 설계

### Upstage Provider 등록

수정 후보:

- `src/lib/ai-providers.catalog.ts`
- `src/lib/server-provider-shared.ts`
- `src/lib/server-ai.ts`
- `src/services/aiProviders.ts`
- `src/services/aiProvidersStructured.ts`
- `src/app/api/ai-capabilities/route.ts`
- `src/lib/__tests__/ai-providers.test.ts`
- `src/lib/__tests__/server-ai.test.ts`
- `.env.example`

추가 값:

```ts
upstage: {
  id: "upstage",
  name: "Upstage Solar",
  placeholder: "up_... 또는 sk_...",
  defaultModel: "solar-pro3",
  models: ["solar-pro3", "solar-pro2", "solar-mini"],
  storageKey: "noa_upstage_key",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    systemInstruction: true,
    maxContextTokens: 131_000,
    maxOutputTokens: 32_768,
    isLocal: false,
    costTier: "moderate",
  },
}
```

주의:

- 모델명과 context/output 한도는 Upstage 공식 콘솔/API reference 기준으로 구현 직전에 다시 확인한다.
- Upstage는 앱 제공 API이므로 사용자 UI에는 `앱 기본 연결`로 표시할 수 있다.
- 공개 카피에서는 모델 성능 수치를 과장하지 않는다.

### OpenRouter Provider 등록

수정 후보:

- `src/lib/ai-providers.catalog.ts`
- `src/lib/server-provider-shared.ts`
- `src/lib/server-ai.ts`
- `src/services/aiProviders.ts`
- `src/services/aiProvidersStructured.ts`
- `src/app/api/ai-capabilities/route.ts`
- `src/lib/__tests__/ai-providers.test.ts`
- `src/lib/__tests__/server-ai.test.ts`

추가 값:

```ts
openrouter: {
  id: "openrouter",
  name: "OpenRouter",
  placeholder: "sk-or-...",
  defaultModel: "openrouter/auto",
  models: [
    "openrouter/auto",
    "deepseek/deepseek-v4-flash",
    "minimax/minimax-m3",
    "qwen/qwen3-max",
    "anthropic/claude-sonnet-4.6",
  ],
  storageKey: "noa_openrouter_key",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    systemInstruction: true,
    maxContextTokens: 1_000_000,
    maxOutputTokens: 32_768,
    isLocal: false,
    costTier: "moderate",
  },
}
```

주의:

- `openrouter/auto`는 원고 본문 기본값으로 쓰지 않는다.
- 원고 작업 기본 모델은 고정 slug 또는 preset으로 둔다.
- 모델 목록은 최신 OpenRouter model slug 변동 가능성이 있어 운영 문서로 분리할 수 있다.

### 서버 호출

OpenRouter endpoint:

```ts
openrouter: "https://openrouter.ai/api/v1/chat/completions"
```

추가 header 후보:

```ts
"HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://eh-universe.com"
"X-Title": "Loreguard"
```

요청 body 확장:

```ts
{
  model,
  messages,
  stream: true,
  provider: buildOpenRouterProviderPolicy(sensitivity),
}
```

### 요청 정책 빌더

신규 후보:

```ts
src/lib/openrouter-policy.ts
```

역할:

- `ProviderRequestSensitivity`를 받아 OpenRouter provider object 생성.
- ZDR 강제 여부 결정.
- fallback 허용 여부 결정.
- 비용/속도 정렬 여부 결정.

초안:

```ts
export function buildOpenRouterProviderPolicy(sensitivity: ProviderRequestSensitivity) {
  if (sensitivity === "low") {
    return { allow_fallbacks: true, sort: "throughput" };
  }
  if (sensitivity === "standard") {
    return { allow_fallbacks: true, zdr: true };
  }
  if (sensitivity === "manuscript") {
    return { allow_fallbacks: false, zdr: true, require_parameters: true };
  }
  return { allow_fallbacks: false, zdr: true, require_parameters: true };
}
```

### 과정기록 메타데이터

OpenRouter 사용 시 아래는 과정기록 또는 런타임 메트릭에 저장해야 한다.

- requested provider: `openrouter`
- requested model
- sensitivity
- `zdr` 여부
- fallback 허용 여부
- 응답 헤더/메타데이터에서 확인 가능한 실제 provider/model
- 토큰 사용량
- request id

원고 확인서에는 모델명만 크게 노출하지 말고:

> 노아 제안: 통합 라우터 연결 / 원고 보호 정책 적용 / 요청 메타데이터 보관

정도로 추상화한다.

## 8. 하지 말 것

- OpenRouter를 기본 원고 provider로 자동 설정하지 않는다.
- `openrouter/free`를 원고/번역/확인서 근거에 쓰지 않는다.
- `openrouter/auto`를 민감 작업 기본값으로 쓰지 않는다.
- ZDR 없이 full-text 요청을 보내지 않는다.
- 앱 내부 자동 fallback과 OpenRouter 내부 fallback을 동시에 무제한 허용하지 않는다.
- OpenRouter prompt logging / input-output logging을 켜도록 안내하지 않는다.

## 9. 검증 계획

단위 테스트:

- provider 목록에 `openrouter` 포함.
- server provider id에 `openrouter` 포함.
- `OPENROUTER_API_KEY` env 감지.
- `low` 요청은 fallback 허용.
- `manuscript` 요청은 fallback 차단 + ZDR true.
- `full-text` 요청은 ZDR true + fallback 차단.

통합 테스트:

- `/api/chat`에 `provider=openrouter` 요청 시 endpoint와 body가 맞는지 mock fetch로 검증.
- 연결 테스트는 keyVerification 경로로만 동작.
- 구조화 생성도 동일 endpoint를 타되 JSON format 지원 여부를 검증.

사용자 노출 검사:

- 공개 UI에 "AI 생성"식 문구 추가 금지.
- 설정에는 `보조 라우터 연결` 또는 `통합 라우터 연결` 사용.

## 10. 참고 자료

- Upstage Console API key/chat example: https://console.upstage.ai/api-keys?api=chat
- Upstage Solar Pro 3 update: https://www.upstage.ai/blog/en/solar-pro-3-0323
- Upstage pricing page: https://us.upstage.ai/pricing/api
- OpenRouter provider routing: https://openrouter.ai/docs/guides/routing/provider-selection
- OpenRouter routing overview: https://openrouter.ai/blog/insights/model-routing/
- OpenRouter ZDR: https://openrouter.ai/docs/guides/features/zdr
- OpenRouter provider logging: https://openrouter.ai/docs/guides/privacy/provider-logging
- OpenRouter presets/fallback discussion: https://openrouter.ai/blog/tutorials/keep-your-agent-running-when-models-disappear/
- Vercel AI Gateway provider options: https://vercel.com/docs/ai-gateway/models-and-providers/provider-options
- Vercel AI Gateway model fallbacks: https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks
- LiteLLM routing strategies: https://docs.litellm.ai/docs/routing
- LiteLLM budgets/rate limits: https://docs.litellm.ai/docs/proxy/users
- OpenRouter creative writing collection: https://openrouter.ai/collections/roleplay
- OpenRouter coding collection: https://openrouter.ai/collections/programming
- OpenRouter free models collection: https://openrouter.ai/collections/free-models
