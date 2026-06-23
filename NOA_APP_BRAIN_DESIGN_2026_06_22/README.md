# NOA App Brain Design for EH Universe Web

작성일: 2026-06-22  
대상 앱: `C:\Users\sung4\OneDrive\바탕 화면\EH\eh-universe-web`  
상태: 앱 전용 NOA Brain 설계 패키지  
적용 방식: 연구용 NOA를 그대로 노출하지 않고, 유니버스앱 전용 창작 관제 Brain으로 다운컨버전

## 결론

이 폴더는 연구용 NOA Brain을 유니버스앱에 맞게 개조한 전용 설계 패키지다.

핵심 목표:

```text
앱 전체 관제
각 탭별 전문가화
창작 흐름 보호
위험 작업만 조용히 관제
연구 산출물을 개발 입력으로 변환
```

## 원칙

```text
NOA를 UI 전면에 드러내지 않는다.
작가에게는 "작품 보호", "작업 기록", "되돌릴 수 있는 적용"으로 보이게 한다.
각 탭 안에서는 NOA가 해당 분야 전문가처럼 판단한다.
일반 타이핑과 탐색은 막지 않는다.
대량 수정, 저장, 내보내기, AI 적용, 클라우드 저장만 깊게 관제한다.
```

## 산출물

| 파일 | 역할 |
|---|---|
| `00_app_brain_overview.md` | 앱 전용 NOA Brain 전체 구조 |
| `01_tab_expert_registry.md` | 각 탭별 전문가 역할 설계 |
| `02_control_tower_contract.md` | 앱 전체 관제 계약 |
| `03_integration_boundaries.md` | 실제 앱 경계와 연결 위치 |
| `04_development_handoff.md` | 개발 적용 로드맵과 금지 범위 |
| `app_noa_brain_manifest.json` | 기계판독 manifest |
| `tab_expert_registry.json` | 탭 전문가 레지스트리 |
| `control_policy.json` | 앱 관제 정책 초안 |
| `PRODUCT_GRADE_PACKAGE/` | 판매 가능한 제품 기준의 상세 설계 패키지 |

## 현재 판정

```text
design_status = APP_SPECIFIC_DESIGN_READY
source_mutation = false
product_integration_claim = false
browser_e2e = not_run
development_ready = INTERNAL_PROTOTYPE_READY
```

## 상용형 확장

`PRODUCT_GRADE_PACKAGE`는 내부 실험용 설계를 넘어 판매 가능한 제품 기준으로 재설계한 확장 패키지다.

핵심 변화:

```text
내부 관제 설계
-> 고객 문제/구매 이유
-> 제품 기능 명세
-> 탭별 전문가 상품화
-> 작업 영수증/IP 보호
-> 품질 게이트
-> 데모/패키징/출시 기준
```

현재 상용 준비도:

```text
Commercial Readiness Level = CRL-1.5
SellabilityScore = 0.74
ReleaseReadiness = 0.31
```

해석:

```text
팔 수 있는 제품 명제와 상세 설계는 형성되었다.
다만 실제 판매 전에는 런타임 연결, 데모 프로젝트, 반복 테스트, 유료 파일럿 검증이 필요하다.
```
