# EH-Universe 시장성 평가 및 사용자 레벨링 전략 (V50 Sovereign)

## 1. 전체 시장성 평가 (Marketability Audit)

EH-Universe는 단순한 AI 작문 도구를 넘어, **"보안과 신뢰가 담보된 격리된 창작 환경"**을 제공함으로써 독보적인 시장 포지션을 확보합니다.

### 🎯 핵심 차별화 전략 (USP)
- **NOA 보안 엔진 (Non-Overrideable Advisory):** 사용자가 직접 제어할 수 없는 서버 측 7계층 보안 시스템을 통해 기업 및 교육 현장에서의 'AI 오남용'을 원천 봉쇄.
- **할루시네이션 어드바이저:** AI의 거짓말을 통계적, 언어적으로 탐지하여 창작물의 사실 관계를 보조하는 기능 제공.
- **해시 체인 감사(Audit):** 모든 상호작용을 위변조 불가능한 해시 체인으로 기록하여 향후 저작권 증명이나 법적 문제 발생 시 증거로 활용 가능.

### 📊 시장 포지셔닝 맵
- **Sudowrite / NovelAI:** 창작 자유도 극필 (보안 취약, 할루시네이션 빈번)
- **ChatGPT / Claude:** 일반적 가드레일 (우회 가능, 비즈니스 특화 부족)
- **EH-Universe:** **[보안 극대화 + 전문 도메인 맞춤 + 창작 최적화]**

---

## 2. 사용자별 레벨링 시스템 (Tiering v50)

사용자의 등급(Bronze, Gold, Diamond)에 따라 권한과 보안 엔진의 개입 수준을 차등화하여 수익 모델을 구축합니다.

| 등급 | 명칭 | 리스크 예산 (Daily) | 보안 레이어 | 전술적 대응 (Tactical) | 특화 기능 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BRONZE** | 입문자 (Free) | 20 pts | Layer 1-3 | BLOCK 중심 | 기본 작문 지원 |
| **GOLD** | 작가 (Pro) | 100 pts | Layer 1-7 | LIMITED / DELAY | 할루 탐지, 도메인 가중치 |
| **DIAMOND** | 스튜디오 (Enterprise) | 1000+ pts | Full Bypass Option | 커스텀 HONEYPOT | 감사 리포트, API 연동 |

---

## 3. 기술적 구현 방안 (Roadmap)

### [P0] UserContext 기반 등급 연동
- `lib/auth`와 `lib/noa`를 연결하여 로그인된 사용자의 등급에 맞는 `NoaConfig`를 동적으로 생성.
- `dailyRiskBudget`을 등급별로 자동 할당.

### [P1] 등급별 전술적 유연성
- **BRONZE:** 위험 감지 시 무조건 차단(`BLOCK`).
- **GOLD:** 위험 감지 시 `LIMITED`로 전환하여 문맥 유지 시도.
- **DIAMOND:** `ALLOW`를 유지하되 상세 감사 로그(Audit)만 강화.

### [P2] 수익화 파이프라인
- 리스크 예산이 초과되었을 때 '예산 추가 구매' 또는 '등급 업그레이드' 팝업 연동.

---

> [!TIP]
> EH-Universe의 진정한 가치는 AI를 '사용'하는 것이 아니라, AI를 '안전하게 관리'하는 시스템에 있습니다. 이 보안 엔진 자체가 하나의 독립적인 SaaS(Security as a Service) 상품이 될 수 있습니다.
