# NOA App Brain Product Grade Package

작성일: 2026-06-22  
대상 앱: EH Universe Web  
목적: 내부 실험 설계가 아니라 판매 가능한 제품 설계로 확장

## 결론

이 패키지는 NOA App Brain을 `앱 내부 보조 장치`가 아니라 `판매 가능한 창작 관제 제품`으로 설계한다.

제품의 약속은 단순하다.

```text
작가와 제작팀이 AI를 쓰더라도
작품의 설정, 원고, 이력, 출고 품질을 잃지 않게 한다.
```

즉, NOA는 챗봇이 아니라 다음 네 역할을 제품 안에서 수행한다.

| 역할 | 고객이 체감하는 가치 |
|---|---|
| 앱 전체 관제관 | 위험한 변경과 출고 작업을 보호 |
| 탭별 전문가 | 세계관, 캐릭터, 플롯, 집필, 퇴고, 번역, 출고를 각각 다르게 지원 |
| 작업 기록관 | 무엇을 왜 바꿨는지 추적 가능 |
| 복구 코치 | 실패하거나 마음에 들지 않는 변경을 되돌릴 수 있게 안내 |

## 상용 설계 원칙

| 내부용 설계 | 판매용 설계 |
|---|---|
| 기능이 있으면 됨 | 고객 문제가 해결되어야 함 |
| 판단 구조 설명 중심 | 사용자가 체감하는 안전성 중심 |
| 개발자 용어 사용 | 작가/팀이 이해하는 제품 언어 사용 |
| 단일 사용자 가정 | 개인, 팀, 스튜디오, 출고 담당자까지 고려 |
| 실험 성공 보고 | 반복 가능한 품질 기준과 검증 필요 |

## 포함 문서

| 파일 | 역할 |
|---|---|
| `P00_product_thesis.md` | 제품 명제, 구매자, 시장 문제, 차별점 |
| `P01_commercial_product_spec.md` | 판매 가능한 기능 명세와 사용자 흐름 |
| `P02_runtime_architecture_detail.md` | 앱 런타임 관제 구조와 데이터 계약 |
| `P03_tab_expert_playbooks.md` | 탭별 전문가 플레이북 |
| `P04_ux_and_product_language.md` | 제품 UI 언어와 사용자 경험 설계 |
| `P05_evidence_ip_safety_and_receipts.md` | 근거, 저작물, 이력, 권리 보호 설계 |
| `P06_quality_gates_and_acceptance_tests.md` | 출시 품질 게이트와 수용 기준 |
| `P07_packaging_pricing_and_go_to_market.md` | 상품 패키지, 판매 단위, 도입 전략 |
| `P08_implementation_backlog.md` | 개발 투입 백로그 |
| `P09_sales_demo_script.md` | 판매 데모 시나리오 |
| `P10_risk_register.md` | 상용화 리스크 등록부 |
| `P11_product_grade_verification_receipt.md` | 파일/JSON/준비도 검증 영수증 |
| `P12_research_lineage_and_original_baseline.md` | 원본/연구 성과/제품 흡수 계보 |
| `commercial_manifest.json` | 상용 설계 매니페스트 |
| `feature_tier_matrix.json` | 요금제/상품군별 기능 매트릭스 |
| `quality_gates.json` | 기계 판독용 품질 게이트 |
| `tab_expert_product_matrix.json` | 탭별 전문가 제품 매트릭스 |
| `research_lineage_manifest.json` | 원본과 연구 성과 추적 매니페스트 |

## 현재 판정

```text
commercial_design_status = PRODUCT_GRADE_DESIGN_READY
runtime_integration = NOT_APPLIED
sellable_claim = DESIGN_ONLY
release_recommendation = BUILD_PROTOTYPE_BEFORE_SALES
```

판매 가능한 설계 골격은 성립한다.  
다만 실제 판매 전에는 앱 안에 런타임 연결, 테스트 데이터, 데모 프로젝트, 실패 복구 시연이 필요하다.

## 연구 성과 포함 방식

이 패키지는 단순 제품 기획서가 아니라 아래 계보를 포함한다.

```text
WABI-R v1.7 원본 프레임워크
-> NOA 원본 정리팩
-> 1~100 연구 계획/실증 산출
-> 앱 전용 Brain 설계
-> 상용 제품 설계
```

원본은 별도 복제본으로 끼워 넣는 방식이 아니라 `baseline/source of truth`로 참조한다.  
제품 패키지에는 원본 대비 무엇이 흡수되고 바뀌었는지를 추적 가능한 형태로 남긴다.
