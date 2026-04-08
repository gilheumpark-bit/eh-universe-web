# EH Universe Reports & Test Archive

## 1. i18n Translation Audit (2026-04-08)
- **Total Keys**: 1,037 leaf keys
- **Coverage**: KO, EN, JP, CN (100% Synced)
- **Status**: 
    - No missing keys across all supported languages.
    - Leak detection: 0 suspected leaks from KO to EN.
    - Translation integrity: Passed.

## 2. Playwright E2E Test Summary (2026-04-06)
- **Environment**: Next.js 16 + Chromium
- **Key Successes**:
    - **API Contracts**: `/api/health`, `/api/ai-capabilities`, `/api/agent-search/status` 정상 응답 확인.
    - **Method Guards**: GET/POST 전용 엔드포인트에 대한 비정상 접근 차단 확인.
    - **BYOK Identity**: 4개국어 로케일별 API 키 설정 UI 및 배지 상태 표시 검증.
- **Failures (Known)**:
    - `06 open API modal from settings row`: 일부 로케일에서 모달 요소(secret-input) 가시성 이슈 발견.
    - `09 close button on modal header`: 다국어 텍스트 대응(`닫기`, `关闭` 등) 중 타임아웃 발생 사례 있음.

## 3. Core Lore Data (new-report-entries.txt)
- **Total Entries**: 399 Reports
- **Classifications**: NHDC, Project Ascendancy, SIB, Neka Empire.
- **Integrity**: JSON-like structure maintained, latest year reference 7000s (Galactic Era).
