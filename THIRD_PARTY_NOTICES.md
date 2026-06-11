# Third-Party Notices

> claude3 `_standard/_legal.md` · `_dependencies.md` 라이선스 준수. 본 제품은 다수 오픈소스 패키지를 사용한다.
> 생성: `npx license-checker --production` (2026-06-06 기준). 갱신: 의존성 변경 시 재실행.

## 라이선스 분포 (production deps)

| 라이선스 | 수 | 분류 |
|---|---|---|
| MIT | 474 | 퍼미시브 |
| Apache-2.0 | 124 | 퍼미시브 |
| ISC | 25 | 퍼미시브 |
| BSD-3-Clause | 18 | 퍼미시브 |
| BSD-2-Clause | 14 | 퍼미시브 |
| BlueOak-1.0.0 | 6 | 퍼미시브 |
| 0BSD · Python-2.0 · CC-BY-4.0 · (MPL-2.0 OR Apache-2.0) | 각 1 | 퍼미시브/약카피레프트(선택) |
| FSL-1.1-MIT | 2 | source-available(2년 후 MIT) |
| (MIT OR GPL-3.0-or-later) | 1 | dual — **MIT 선택** |
| Apache-2.0 AND LGPL-3.0-or-later | 1 | LGPL = 약한 copyleft(동적 사용 OK) |
| UNLICENSED | 1 | ⚠️ 식별 필요(자체 패키지 가능성) — follow-up |

## 상업 배포 적합성 (copyleft 분석)

- **강한 copyleft(GPL-only · AGPL) 의존: 0건.** → 소스 공개 의무 없음.
- 발견된 copyleft 계열은 전부 (a) **dual-license**(`MIT OR GPL` → MIT 선택) 또는 (b) **LGPL**(라이브러리 동적 사용 — 앱 소스 공개 의무 없음).
- `BSD*`(duck@0.1.12)는 license-checker 미파싱 표기일 뿐 BSD(퍼미시브).
- **결론: 현 의존성 트리는 상업 배포(독점) 무충돌.**

## Action Items (claude3 _legal 정합)

1. `UNLICENSED` 패키지 1건 식별 (`npx license-checker --production --packages | grep UNLICENSED` 또는 `--excludePackages` 제외 확인).
2. CI에 license-checker `--onlyAllow` 게이트 추가(신규 GPL/AGPL 유입 차단).
3. 전체 패키지별 attribution은 `npx license-checker --production --csv --out THIRD_PARTY_LICENSES.csv` 로 생성(릴리스 산출물).

## 주요 직접 의존 (요약)

- UI/프레임워크: Next.js · React · Tailwind CSS (MIT)
- AI: `@google/genai`(Apache-2.0, BYOK Gemini) · `ai`(Vercel AI SDK, Apache-2.0) · `google-auth-library`(Apache-2.0, Firestore/Auth REST)
- 에디터: Tiptap · Monaco (MIT/Apache)
- 데스크톱: Electron (MIT)
- 기타: gray-matter · jose · firebase · stripe-js 등 (MIT/Apache/BSD)
