# Alpha 노출 정책 (사이트·앱 비공개·노출 가이드)

> 알파 단계: 브릿G 장르문학 작가 50명 얼리 액세스 (2026-05 기준).
> 마케팅 진입점은 일부 공개, 5 메인 앱 영역은 비공개.

---

## 1. 정책 한눈에

| 영역 | 검색엔진 | AI 크롤러 | sitemap | meta noindex |
|---|---|---|---|---|
| `/` (랜딩) | 공개 | 차단 | ✅ 포함 | — |
| `/codex` `/archive` `/reference` `/rulebook` `/docs` | 공개 | 차단 | ✅ | — |
| `/about` `/privacy` `/terms` `/copyright` `/ai-disclosure` | 공개 | 차단 | ✅ | — |
| `/tools/*` | 공개 | 차단 | ✅ | — |
| **`/studio`** | **차단** | 차단 | ❌ | ✅ noindex |
| **`/translation-studio`** | **차단** | 차단 | ❌ | ✅ noindex |
| **`/code-studio`** | **차단** | 차단 | ❌ | ✅ noindex |
| **`/network`** | **차단** | 차단 | ❌ | ✅ noindex |
| `/welcome` | **차단** | 차단 | ❌ | — |
| `/api/*` | 차단 | 차단 | ❌ | — |

---

## 2. 5 메인 앱 비공개 이유

| 앱 | 이유 |
|---|---|
| Studio | 알파 작가 50명 한정 — 무관한 사용자 진입 시 BYOK 학습 곡선 부담 |
| Translation Studio | 듀얼 출력 시스템 알파, 비용 가드 점검 중 |
| Code Studio | 9-team 파이프라인 알파, 외부 노출 시 설명 필요 |
| Network | 커뮤니티 알파, 모더레이션 정책 점검 중 |
| Welcome | onboarding 페이지 — SEO 가치 낮고 학습 데이터 노출 우려 |

---

## 3. AI 크롤러 차단 (저작권·학습 데이터 보호)

`robots.txt` 차단 대상:

- GPTBot (OpenAI)
- ClaudeBot / Claude-Web / anthropic-ai (Anthropic)
- CCBot (Common Crawl → AI 학습 데이터)
- Google-Extended (Google AI 학습)
- PerplexityBot
- Bytespider (ByteDance)
- Amazonbot

**정책**: 마케팅 페이지 (`/`, `/tools`, `/codex` 등) 도 AI 크롤러 차단. 작가 IP 보호 정책 일관.

---

## 4. 노출하면 안 되는 어휘 (사용자 UI)

| 어휘 | 판정 | 처리 |
|---|---|---|
| `Track-D Phase 1.1` | 내부 작업 코드명 | 코멘트 안에만. UI 노출 0건 ✅ |
| `Phase A-7` `Phase 1~4` | plan 단계명 | 코멘트 안에만 ✅ |
| `ANS` `NOA Engine` | 내부 시스템명 | UI 노출 X (status bar는 'ANS 10.0' 표시 — Studio 내부 사용자만) |
| `PRISM` `LoRA` | 서버 prompt enforcement | server-side 만, UI 노출 0건 ✅ |
| `DGX` `Qwen 3.6-35B` `MoE` `vLLM` `FlashInfer` | 인프라 기술명 | 작가 친화 라벨 "로컬 AI" / "Local AI" 통일. 단, 법적 페이지 `/ai-disclosure` 는 의도적 노출 |
| `Track-D Phase 1.1 Round 2-2` | 코멘트 마커 | 코드 안에만 ✅ |
| `LearningGuard` `러닝가드` `StudyGuard` | 별 repo (학습용 fork) | 본 앱 노출 0건 ✅ |
| `NCG` `NCT` | Compliance gate/test 약자 | AuditPanel 사이드 패널 의도 노출 (한국어 부제 "사전 게이트 + 사후 검증" 동반) |
| `평생 50% 할인` `공동 창설자` | 폐기 카피 | 코드 0건 ✅ (이전 사이클 정돈) |

---

## 5. 노출하면 안 되는 데이터

| 카테고리 | 정책 |
|---|---|
| API key / token | localStorage 만, 서버 전송 X (BYOK 정책). 토큰 발급 (`/api/lsp/auth`) 은 사용자 명시 행동 후 |
| Firebase config | `NEXT_PUBLIC_FIREBASE_*` 의도 노출 (Firebase 표준) |
| 내부 IP (192.168.x.x) | 코멘트 + LM Studio placeholder 만. 의도 X 노출 0건 |
| 작가 원고 | localStorage / IndexedDB 만 (BYOK = bring your own key, 서버 전송 0) |
| 작가 personal info | 수집 0 (Firebase Auth 만 — 이메일·displayName 표준) |
| AI 응답 raw error | logger.warn / console.error 만, UI 표시 X |
| stack trace | error.tsx 보호 — "SYSTEM MALFUNCTION" 4언어 + Sentry 만 |

---

## 6. 알파 → 베타 → 정식 이행 시 변경

베타 진입 시:
- `/studio` `/translation-studio` 노출 가능 (선택적 SEO)
- meta noindex 제거
- robots.txt 마케팅 페이지 동일

정식 출시:
- AI 크롤러 정책 재검토 (저작권 정책 + 학습 데이터 마이닝 정책)
- 가격 페이지 노출
- 작가 dashboard / Star Translator profile 공개 페이지 추가

---

## 7. 점검 체크리스트 (배포 전)

- [x] robots.txt — 5 메인 앱 + `/welcome` + `/api/` 차단
- [x] sitemap.ts — 비공개 경로 0건
- [x] meta noindex — Studio / Translation Studio / Code Studio / Network 4개 layout
- [x] AI 크롤러 차단 9종 (GPTBot / ClaudeBot / CCBot / Google-Extended / Perplexity / Bytespider / Amazonbot 등)
- [x] StatusBar "DGX" 기술명 → "로컬 AI" 통일 (4언어)
- [x] 폐기 카피 ("평생 50% 할인" / "공동 창설자" / "NOA 스튜디오" / "집필 OS" / "작가 주도형 집필 IDE") grep 0건
- [x] LearningGuard / 러닝가드 / StudyGuard 어휘 본 앱 노출 0건
- [x] PRISM / LoRA prompt enforcement 사용자 UI 노출 0건
- [x] LSP 3 endpoint Bearer token 인증 필수
- [x] API route `/api/` robots Disallow

---

## 8. 변경 이력

- **2026-05-08**: 알파 비공개 강화 — robots.txt 5앱 차단 + meta noindex + sitemap 정돈
- **2026-04-19**: AI 크롤러 9종 차단 추가 (alpha v0.2.0)
- **2026-04-06**: 보안 헤더 next.config.ts 적용
