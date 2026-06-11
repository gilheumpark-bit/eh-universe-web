# Linux + 오픈소스 AI 로컬 배포 — 정밀 분석 (고급 엔지니어 관점, 2026-06-06)

> 전제: ① Linux 구동, ② 셀프호스트 오픈소스 AI(vLLM/Ollama/llama.cpp). firsthand 코드 근거로 분석.
> 질문: 지금 버전이 적절한가 / 무엇이 필요한가.

---

## 0. 결론 (TL;DR)

**아키텍처는 OSS-로컬에 이미 적합하게 설계돼 있다.** AI는 OpenAI-호환 클라이언트로 기본값 `localhost:8001`(로컬 vLLM)에 직결하고, 저장은 IndexedDB(로컬), Firebase는 미설정 시 graceful degrade(`auth/db=null`)한다. **하드 클라우드 의존이 0건** — 외부(Firebase·Drive·analytics·Sentry)는 전부 optional.

- **"지금 버전" 적절성**: DEV·내부망 구동 = **적절(지금 됨)**. 배포 가능한 Linux 데스크톱 + 번들 OSS AI = **5개 보강 필요**.
- 핵심 갭: ① self-contained 패키징, ② 127.0.0.1 바인딩(보안), ③ 모델 ID 환경변수화, ④ 모델·하드웨어 tier 결정, ⑤ 로컬 단독 모드 UX.

---

## 1. 현 아키텍처 적합성 (firsthand 근거)

| 차원 | 현 상태 | OSS-로컬 적합성 |
|---|---|---|
| **AI 클라이언트** | `aiProvidersStructured.ts:8` `${SPARK_SERVER_URL}/v1/chat/completions` — **OpenAI 호환**. `dgx-models.ts:34` 기본 `localhost:8001` | ✅ vLLM·Ollama(`:11434/v1`)·llama.cpp·LM Studio 그대로 호환 |
| **스트리밍** | `sparkService.ts` `stream:true` SSE 직결 (vLLM OpenAI 호환) | ✅ 로컬 vLLM/Ollama SSE 동일 |
| **provider 레지스트리** | `ai-providers.ts` ollama/lmstudio + BYOK(openai/claude/groq). Google AI 제거됨 | ✅ 로컬 provider 1급 지원 |
| **저장** | save-engine = IndexedDB(`noa_shadow_v1`/`noa_journal`) — 로컬 | ✅ 클라우드 불요 |
| **Auth/Sync** | `firebase.ts:49` apiKey 없으면 `app/auth/db=null` "features disabled" | ✅ 미설정 = 로컬 단독 구동 |
| **오프라인 인지** | `useOnlineStatus`·`background-sync`·`adaptive-loading` 보유 | ✅ 오프라인 기반 有 |
| **폰트** | `next/font/google`(Noto) — **빌드 시 self-host**, 런타임 Google 호출 0 | ✅ 오프라인 OK |
| **Electron 래퍼** | `main.js` SIGTERM(Linux) 경로 + electron-builder linux(AppImage) 타겟 | ⚠️ 동작하나 self-contained 아님(§3-B) |

→ **앱은 이미 "셀프호스트 OSS AI + 로컬 저장" 아키텍처.** DGX Spark 통합 자체가 OSS(Qwen) 셀프호스트다.

---

## 2. 외부 의존 / 오프라인 차단 요소 (egress 전수)

grep 기준 외부 네트워크 egress 전부 **optional·degrade**:

| 의존 | 용도 | 차단 시 | 로컬 처리 |
|---|---|---|---|
| Firebase (`firestore`/`identitytoolkit`/securetoken JWKS) | 로그인·동기화·Stripe claim | graceful(null) | env 미설정 = 로그인 없이 로컬 |
| Google Drive (`googleapis.com/drive/v3`) | 저장(암호화 백업) | 사용자 opt-in만 | IndexedDB·full-backup으로 대체 |
| Vercel Analytics (`@vercel/analytics`) | 퍼널 추적 | no-op | 로컬은 비활성 권장 |
| Sentry (`sentry-integration`) | 관측 | DSN 없으면 no-op | 로컬 콘솔/파일 로그 |
| CSP/preconnect `googleapis/gstatic` | 폰트·스크립트 허용 | — | 폰트는 self-host라 무해(vestigial) |
| `layout.tsx:356` dns-prefetch generativelanguage | (구 Gemini) | — | **vestigial — Google AI 제거됨, 정리 대상** |

**판정: 완전 오프라인 구동 가능.** 필요 = 로컬 AI 서버 + Firebase env 미설정 + analytics/sentry off.

---

## 3. 갭 분석 — 무엇이 필요한가 (우선순위)

### A. AI 서빙: 모델 × 런타임 (P0 — 가장 중요)
- 현 기본 모델 = **Qwen 3.6-35B-A3B-FP8 MoE** (DGX GB10 **128GB**). 일반 Linux 박스에서 **구동 불가**.
- 앱은 OpenAI 호환이라 서버만 바꾸면 됨. **모델 ID 하드코딩이 문제**: `dgx-models.ts` `VLLM_MODEL_ID='qwen36'` — 로컬에서 다른 모델(예 Ollama `qwen2.5:14b`) 띄우면 served-model-name 불일치로 400. → **모델 ID 환경변수화 필수**.
- RAG(ChromaDB 99만 문서·`:8082`)·이미지(ComfyUI Flux·`:8188`)는 **별도 사이드카 서비스**. 번들 X — 옵션(없으면 해당 기능만 비활성).

### B. Electron Linux 패키징: self-contained (P0)
- 현 `main.js`는 sibling `eh-universe-web`의 `next start`를 **시스템 `node`로 spawn** → 배포본 아님(node·빌드·node_modules 필요).
- 배포 가능 .AppImage/.deb 위해:
  1. `next.config.ts`에 `output:'standalone'` → `.next/standalone/server.js`
  2. electron-builder `extraResources`에 standalone + `.next/static` + `public` 동봉
  3. `main.js` spawn 대상을 동봉 `server.js`로, **`ELECTRON_RUN_AS_NODE=1` + `process.execPath`**로 실행 → 시스템 node 불요(Electron 내장 node 사용) = 완전 self-contained

### C. 보안: 로컬 바인딩 (P1)
- `next start`는 기본 **`0.0.0.0` 바인딩** → 데스크톱 앱인데 **AI·API 서버가 LAN 전체에 노출**. `main.js` spawn에 **`-H 127.0.0.1`** 추가 필수(로컬 전용).

### D. 로컬 단독(오프라인) 모드 UX (P1)
- Firebase null-degrade는 되나, 일부 UI가 로그인 토큰 가정(network-agent 등). 로컬 모드에서 "로그인 필요" 에러 노출 가능 → **로컬 모드 플래그**로 클라우드 의존 UI 숨김 권장.

### E. 모델·하드웨어 사이징 (P1 — 품질 영향)
- 6축 채점·41-band·quality-gate는 35B 기준 튜닝. 소형 로컬 모델(7~14B)은 게이트 실패율↑ → **모델 tier별 게이트 임계 보정** 필요.

### F. 라이선스 (P2)
- 배포 시 모델 라이선스 명시 (Qwen=Apache-2.0 계열, Llama=Meta 커뮤니티). 앱은 Apache-2.0 모델 권장(재배포 자유).

---

## 4. 모델 × 하드웨어 매트릭스 (권장)

| Tier | 하드웨어 | 런타임 | 모델 | 비고 |
|---|---|---|---|---|
| **서버/워크스테이션** | GPU 48GB+ (A6000·4090×2·DGX) | **vLLM** | Qwen3-30B-A3B(MoE)·FP8/AWQ | 현 35B에 가장 근접·앱 튜닝 유지 |
| **컨슈머 GPU** | 12~24GB (3090/4070Ti+) | vLLM·Ollama | Qwen2.5-14B / Qwen3-14B Q4-Q5 | 균형 (품질 게이트 일부 보정) |
| **노트북/CPU** | 8~16GB RAM·iGPU | **Ollama**(GGUF) / llama.cpp | Qwen2.5-7B·Llama3.1-8B Q4 | 가장 이식성↑·속도↓·게이트 완화 |

→ **이식성 우선이면 Ollama**(설치 1줄·GGUF 자동·`/v1` 호환). 속도/품질 우선이면 vLLM.

---

## 5. 단계 계획

| Phase | 범위 | 산출 |
|---|---|---|
| **P0 (지금 됨)** | Linux에서 `npm run dev` + 로컬 AI(Ollama/vLLM) 직결 | `NEXT_PUBLIC_SPARK_SERVER_URL=http://localhost:11434` 등 env만 설정 — 즉시 구동 |
| **P1 (즉시 보강·~반나절)** | ① 모델 ID env화 ② `main.js -H 127.0.0.1` ③ analytics/sentry off 플래그 ④ vestigial Google preconnect 제거 | 로컬 안전·다모델 호환 |
| **P2 (self-contained 패키징)** | `output:standalone` + electron-builder extraResources + `ELECTRON_RUN_AS_NODE` + AppImage/deb | 단일 설치파일 (node 불요) |
| **P3 (번들 OSS AI + 오프라인 UX)** | Ollama 동반 감지/안내 + 모델 tier 프리셋 + 로컬 모드 플래그(클라우드 UI 숨김) + 게이트 임계 보정 | 완전 로컬 제품 |

---

## 6. 즉시 적용 가능 (quick wins — 코드 위치 명시)

1. **모델 ID env화** — `dgx-models.ts` `VLLM_MODEL_ID = process.env.NEXT_PUBLIC_SPARK_MODEL_ID || 'qwen36'`
2. **localhost 바인딩** — `eh-universe-desktop/main.js` spawn args에 `'-H','127.0.0.1'` 추가
3. **vestigial 정리** — `layout.tsx:356` generativelanguage dns-prefetch 제거 (Google AI 제거됨)
4. **로컬 env 템플릿** — `.env.local.example`: `NEXT_PUBLIC_SPARK_SERVER_URL`(Ollama/vLLM) + Firebase 공란(로컬 모드)

---

## 7. 판정

- **지금 버전 = OSS-로컬 아키텍처로 적합**(설계가 이미 그 방향). 내부망/DEV 구동은 지금 됨.
- **배포 가능 Linux 데스크톱 + 번들 OSS AI**까지는 P1(즉시 보강 4건) → P2(self-contained) → P3(번들 AI·오프라인 UX) 순.
- **차단 이슈 0** — 하드 클라우드 의존 없음, 모든 외부는 degrade. 남은 건 "패키징·바인딩·모델 매칭" 엔지니어링.
