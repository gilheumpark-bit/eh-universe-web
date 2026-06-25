# 00. App-Specific NOA Brain Overview

## 0. 결론

유니버스앱 전용 NOA Brain은 연구용 P00~P15 전체를 그대로 노출하는 구조가 아니다.

앱에서는 다음 8개 모듈로 축약한다.

```text
A0 App Signal Intake
A1 Creative Context Pack
A2 Tab Expert Router
A3 Work Risk & Recovery Gate
A4 Creative Judgment Layer
A5 Apply Plan Builder
A6 Receipt & Work Memory
A7 Recovery / Rollback Coach
```

즉, 앱 전용 구조는 이렇게 움직인다.

```text
사용자/AI 행동
-> 현재 탭과 작업 맥락 판독
-> 탭 전문가 선택
-> 위험/복구성/근거 확인
-> 적용/보류/우회/기록 판단
-> 작업 기록과 복구 힌트 생성
```

## 1. 연구용 NOA와 앱용 NOA의 차이

| 항목 | 연구용 NOA | 앱 전용 NOA |
|---|---|---|
| 목적 | 연구/검증/판정 | 창작 흐름 보조와 작품 보호 |
| 노출 | 상세 판단 구조 | 작가 친화 문구 |
| 깊이 | D8~D256 | 탭/위험별 적응 깊이 |
| 핵심 산출물 | 연구 노트, receipt, claim | 적용 계획, 작업 기록, 복구 힌트 |
| 위험 경계 | 외부 Judge/Human/Product | 원고 손상, 설정 붕괴, 저장/내보내기 실패 |
| UI 언어 | Guard, Token, Enforcement | 작품 보호, 작업 기록, 적용 보류 |

## 2. App Brain 모듈

| Module | 역할 | 앱에서의 의미 |
|---|---|---|
| A0 App Signal Intake | 현재 작업 감지 | 어떤 탭에서 무엇을 하려는지 파악 |
| A1 Creative Context Pack | 작품 맥락 압축 | 세계관/캐릭터/플롯/원고 상태 연결 |
| A2 Tab Expert Router | 탭 전문가 선택 | 월드/캐릭터/집필/퇴고/번역 등 역할 선택 |
| A3 Work Risk & Recovery Gate | 위험/복구성 판단 | 되돌리기 어려운 작업만 확인 |
| A4 Creative Judgment Layer | 창작 판단 | 품질, 일관성, 장르, 독자 경험 판단 |
| A5 Apply Plan Builder | 적용 계획 생성 | 바로 적용/부분 적용/초안만 제안 |
| A6 Receipt & Work Memory | 작업 기록 | 무엇을 왜 바꿨는지 남김 |
| A7 Recovery / Rollback Coach | 복구 안내 | 실패 시 이전 상태/대안 경로 안내 |

## 3. 판단 상태

앱 전용 판단값은 연구용 `EXECUTE/HOLD/BLOCK`을 그대로 쓰지 않고 제품 언어로 바꾼다.

| 내부 상태 | 앱 제품 언어 | 의미 |
|---|---|---|
| APPLY | 적용 가능 | 흐름을 막지 않고 진행 |
| PREVIEW | 미리보기 | 원고/설정 변경 전 확인 |
| HOLD | 적용 보류 | 근거 또는 맥락 부족 |
| SPLIT | 나눠서 적용 | 대량 수정/위험 작업을 쪼갬 |
| PROTECT | 보호 정지 | 작품 손상 위험이 큼 |
| RECORD | 기록만 남김 | 읽기/분석/내보내기 로그 |
| RECOVER | 복구 안내 | 실패 후 되돌림/우회 |

## 4. 핵심 변화

앱 전용 NOA Brain이 들어가면 노아는 단일 챗봇이 아니라 아래처럼 동작한다.

```text
전체 앱 관제관
+ 현재 탭 전문가
+ 작품 보호자
+ 작업 기록관
+ 복구 코치
```

## 5. 적용 깊이

| 작업 | 깊이 | 이유 |
|---|---|---|
| 일반 타이핑 | D0/D8 | 창작 흐름 방해 금지 |
| 탭 이동/검색 | D0 | 관제 불필요 |
| 세계관/캐릭터 제안 | D32 | 일관성 검토 필요 |
| AI 원고 적용 | D64 | 원고 손상 가능 |
| 대량 수정 | D64~D128 | 되돌림/부분 적용 필요 |
| 저장/내보내기 | D64 | 기록/복구 필요 |
| 클라우드 저장 | D128 | 외부 저장/동기화 위험 |
| 출고/권리 패키지 | D128~D256 | 공식화/권리/증빙 필요 |

