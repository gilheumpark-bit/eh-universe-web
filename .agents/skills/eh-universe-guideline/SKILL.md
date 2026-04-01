---
name: eh-universe-guideline
description: "웹 프로젝트(eh-universe-web) 공식 운영 및 적용 지침 스킬 세트 (NOA Rules v1.2 / Gemini 최적화 버전)"
---

# EH Universe Web - Gemini Application Guideline & Operations Skill

이 스킬(지침서)은 웹 프로젝트 내부의 기존 클로드(Claude) 지침과 운영 스타일을 "Gemini(제미나이)" 요원(Agent)의 동작 방식에 맞춰 컨버전(Conversion)한 핵심 행동 강령 및 작업 가이드라인입니다. 웹 작업을 수행할 때는 **반드시 이 스킬 지침을 우선 적용**해야 합니다.

## 1. 응답 및 소통 (NOA-CORE 적용)
* **언어 및 톤 매칭**: 사용자의 언어를 감지하여 동일하게 응답하며, 톤앤매너(캐주얼/격식)를 복제합니다.
* **반복 금지**: 최근 5턴과 동일한 답변 패턴("앞서 말했듯...")을 피하고, 항상 새로운 구조로 짧고 명확하게 핵심만 전달합니다.
* **불확실성 제어(NIB 게이트)**: API 존재 여부가 확실치 않거나, 검증이 불가능한 경우 "단정" 짓지 않습니다. 반드시 `[미검증 API]`, `[추정]` 등의 마커를 쓰고 섣부른 코드 제시보다 "원인 및 상태 표시"를 우선합니다.

## 2. 코드 실행 원칙 (NOA-EXEC 적용)
* **Preflight Plan**: 설계/아키텍처/3개 이상 파일 수정 전 반드시 아래 양식에 맞추어 `Plan`을 먼저 제시합니다.
  ```text
  Objective: 달성할 목표
  Proposed Changes:
  - 파일 리스트 & 변경 사항 명시
  Potential Risks: 예상 부작용 및 방어 계획
  ```
* **3-Persona 검증 보장**: 코드를 짜거나 다룰 땐 3가지 관점을 강제 적용합니다.
  1. `[C] 안전성 (Safety)`: 예외처리, 널/경계값 가드, 리소스 해제, 가변 인수 금지.
  2. `[G] 성능 (Performance)`: 시간/공간 복잡도 O(n^2) 회피, 딕셔너리 최적화 등.
  3. `[K] 간결성 (Simplicity)`: 과잉 추상화 및 헬퍼 함수 남발 금지(`DRY` 원칙 유지).
* **결과 중심 보고**: 수정 후 문제점이 해결된 "최종본" 코드(또는 패치 내역)를 우선으로 제시하며, 불필요한 사과나 변명을 하지 않고 `[수령증]` 형식으로 로그만 남깁니다.

## 3. 구조적 파티셔닝 (PART 강제 분리)
* 긴 코드는 읽기성과 유지보수성을 위해 반드시 "PART"로 강제 분리합니다.
  * 1~50줄: 생략 가능
  * 100줄 이상: 필수 도입 (최소 2개 이상)
  * 500줄+: 최소 5 PART 분리
* 각 파트는 책임(역할)이 단일해야 하며 순환 참조를 엄격히 금지합니다.
* 각 파트의 하단에 아래 형식으로 IDENTITY SEAL을 붙이는 것을 권장합니다:
  ```python
  # IDENTITY_SEAL: PART-{N} | role={역할} | inputs={입력} | outputs={출력}
  ```

## 4. 자동 수리(Repair) 및 검증 체계 (Terminal Agent & Escalation)
* **검증 최우선**: 로컬 터미널 및 환경(package.json, npm scripts 등) 기반으로 린트/빌드/테스트를 시도하여 실제로 검증 후 배포/수정합니다. 확인할 수 없는 검증은 `[검증 제한]` 마커로 보고합니다.
* **점진적 권한 격상(Escalation)**: 에러 발생 시 반복을 피합니다.
  * `[수리 L1] TARGETED_FIX`: 오류 파일 라인 수정
  * `[수리 L2] DIFF_PATCH`: 관련 모듈 전체 교체
  * `[수리 L3] FULL_REGEN`: 기능 완전 재생성
  * 3회 초과 실패 시 자동 수동화(`LX HUMAN` 상태 돌입 및 즉시 중단)를 준수합니다.

---

## 5. EH Universe Web 전용 프로젝트-특화 규칙 (Arch. Rules)

### A. 아키텍처 및 렌더링
* **코드 스튜디오 아키텍처**: `CodeStudioShell`, `CodeStudioEditor`, `CodeStudioPanelManager` 3가지 분리 구조를 무조건 유지합니다. (`lib/code-studio/`의 6개 디렉토리 준수)
* **패널 레지스트리 (Panel Registry)**: 새 기능이나 패널은 절대 하드코딩하지 않습니다. 반드시 `core/panel-registry.ts` 및 `PanelImports.ts`를 경유합니다.
* **미연결 금지 원칙**: 새로 만든 컴포넌트는 무조건 Shell이나 소비 측과 "한 커밋에서 동시 연결"해야 합니다.
  
### B. 기술 및 정책 (UI/UX)
* **로깅 (Logging)**: `console.log` 등 브라우저 기본 로거는 엄격히 금지합니다. 대신 `import { logger } from '@/lib/logger'` 를 씁니다.
* **보안 (CSP / 헤더)**: 모든 보안 헤더는 `src/proxy.ts`에서 통합합니다. (Next.js 16 이 저장소는 `middleware.ts`와 `proxy.ts`를 동시에 두지 않습니다.) 분산 적용은 피합니다.
* **로딩 시스템**: 스켈레톤 로딩은 `SkeletonLoader`(공용) 및 `code-studio/SkeletonLoader.tsx`(특수)로 관리합니다 (shimmer 이펙트 등 다크 테마 완벽 호환 보장).
* **에러 제어 (ErrorBoundary)**: `src/components/ErrorBoundary.tsx` 최상단을 사용하고 옵션(variant)은 `'full-page' | 'section' | 'panel'` 중 하나로 통일합니다.

### C. 자율 파이프라인 (Verification First)
* 코드 생성보다 "검증 및 평가(Pipeline + Bug Scan + Stress Test)"가 필수입니다.
* Hard Gate 판단 시 critical bug가 있거나 F 랭크일 땐 수정 내역 반영을 원천 거절(`FAIL`) 처리합니다.
* 무조건 3회 검증 루프를 돌며, 수정(Fixing)은 사람 승인(Staging/Rollback)을 거치게 구성한다는 점을 숙지하고 개발을 돕습니다.

### D. 다국어 (번역 정책)
* KO, EN, JP, CN 4개 주요 국가를 고려하며 중앙 `studio-translations.ts`의 스키마 및 노드 규칙(Leaf count)을 동일하게 유지합니다.
* (예: CN "연출" = 演出 등, 도메인에 맞는 특수 용어 사전을 따릅니다)

본 규칙을 `제미나이 스킬`로서 주도적으로 호출 및 참조하여 사용자의 `eh-universe-web` 및 `noa-code-pipeline` 저장소 제어 시에 능동적으로 적용하세요.
