# Manual Lighthouse Measurement Guide — v2.2.0-alpha baseline

자동 측정 스크립트(`bench/lighthouse-capture.mjs`)는 `lighthouse` / `puppeteer` /
`chrome-launcher` devDependency 가 없으면 수동 가이드로 대체된다. 아래 절차를
그대로 따라 기준선을 기록한다.

## 왜 수동인가
- 2026-04-20 시점 `package.json` 에는 `lighthouse` 계열 의존성이 없음.
- M0 정책: **의존성 추가 금지** (회귀 검증이 목적이므로 오염을 피함).
- 대안: Chrome DevTools 내장 Lighthouse 패널 또는 Chrome Canary CLI.

## 사전 준비
1. 로컬 프로덕션 빌드:
   ```bash
   npm run build
   npx next start -p 3005
   ```
2. Chrome 을 **시크릿(Incognity)** 모드로 열고 `http://127.0.0.1:3005` 접속.
3. DevTools → Lighthouse 탭 → 카테고리 4개 선택(Performance / Accessibility /
   Best Practices / SEO), Device = Desktop, Throttling = Simulated 4G.

## 측정 경로 (5개)
각 경로에 대해 3회 측정 후 **median** 을 기록.

| ID | URL | 비고 |
|----|-----|------|
| `home` | `/` | 랜딩 |
| `studio` | `/studio` | 집필 스튜디오 (무거움) |
| `archive` | `/archive` | 아카이브 (정적 위주) |
| `network` | `/network` | 커뮤니티 |
| `translation` | `/translation-studio` | 번역 스튜디오 |

## 기록 포맷
`bench/baseline-2026-04-20.json` 의 `lighthouse` 키 아래 다음 구조로 기록:

```jsonc
{
  "lighthouse": {
    "mode": "manual",
    "device": "desktop",
    "throttling": "simulated-4g",
    "chromeVersion": "<Chrome 버전>",
    "results": {
      "home":        { "performance": 0, "accessibility": 0, "bestPractices": 0, "seo": 0 },
      "studio":      { "performance": 0, "accessibility": 0, "bestPractices": 0, "seo": 0 },
      "archive":     { "performance": 0, "accessibility": 0, "bestPractices": 0, "seo": 0 },
      "network":     { "performance": 0, "accessibility": 0, "bestPractices": 0, "seo": 0 },
      "translation": { "performance": 0, "accessibility": 0, "bestPractices": 0, "seo": 0 }
    }
  }
}
```

점수는 **0–100 정수**. 각 카테고리 하단의 숫자를 그대로 옮긴다.
소수점 등장 시 반올림하지 말고 정수 부분만 기록(예: 87.4 → 87).

## 회귀 허용치
`scripts/regression-check.mjs` 는 카테고리별 **5% 이상 감소** 시 실패한다.
예: baseline performance 86 → 측정 81 미만이면 실패(86 × 0.95 = 81.7).

## 자동화 활성화 방법
향후 Lighthouse 자동화가 필요하면 아래 devDependency 를 추가 후
`bench/lighthouse-capture.mjs` 를 재실행:

```bash
npm i -D lighthouse chrome-launcher
```

설치 후에는 스크립트가 자동 감지하여 Lighthouse 를 직접 실행한다.
