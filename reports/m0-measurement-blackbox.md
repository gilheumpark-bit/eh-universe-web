# M0.4 블랙박스 실측 보고서

**Captured**: 2026-04-20
**Branch**: release/v2.2.0-alpha
**Scope**: 이전 "미확인" 3영역 정밀 실측

---

## T-012 WritingTabInline.tsx (889줄) — 정확 실측

| 지표 | 값 |
|------|-----|
| 총 줄 수 | 889 |
| useState | 12 |
| useEffect | 13 |
| useMemo | 3 |
| useCallback | 7 |
| **총 훅** | **35** |

### 섹션 분할 (JSX 최상위 6 덩어리)
1. TabHeader
2. 모드버튼 바
3. 스플릿 레이아웃
4. 5모드 섹션 라우터
5. 모바일 오버레이
6. FAB

### 자동저장
- **UI 설정만**: localStorage 기반 (스플릿뷰·인라인완성 설정)
- **원고 본체**: 미구현 🚨
- debounceMs: 1500 (인라인완성)

### 복잡 함수 Top 3
1. `handleFileDrop` (169–183줄, 9줄) — 파일 드래그앤드롭 + 타입 가드
2. Scene warnings 수신기 (268–291줄, 24줄) — 커스텀 이벤트 + 타입 방어
3. useInlineCompletion 초기화 (322–328줄, 7줄) — 다중 의존성 조건

---

## T-013 블랙박스 2개

### ResourceView (`src/components/studio/ResourceView.tsx`)
| 지표 | 값 |
|------|-----|
| 총 줄 수 | **1,040** |
| useState | 12 |
| useEffect | 1 |
| useMemo | 1 |
| useCallback | 1 |
| 자동저장 | **없음** 🚨 |
| 용도 | Character 전용 (역할별 필터·페이지네이션 내장) |

### WorldStudioView (`src/components/studio/WorldStudioView.tsx`)
| 지표 | 값 |
|------|-----|
| 총 줄 수 | 328 |
| useState | 3 |
| useEffect | 0 |
| useMemo | 2 |
| useCallback | 1 |
| 자동저장 | **없음** |
| 5 서브탭 | design / simulator / analysis / timeline / map (조건부 렌더) |

---

## T-014 SettingsView.tsx (1,087줄)

| 지표 | 값 |
|------|-----|
| 총 줄 수 | 1,087 |
| useState | 8 |
| useEffect | 6 |
| useMemo | 0 |
| useCallback | 0 |
| 자동저장 | **있음** ✅ (탭·폰트·플래그·로그레벨) |
| Progressive Disclosure | Accordion 2단계 |

### 4탭 구현 확인
- Easy / Writing / Advanced / Developer (권한 기반 조건부)

### 섹션 5종 (동적 임포트)
- ProvidersSection (104줄)
- BackupsSection (748줄)
- AdvancedSection (256줄)
- PluginsSection (161줄)
- SessionSection (251줄)

---

## 이전 추정 vs 실제 주요 갭

| 항목 | 이전 추정 | 실제 | 갭 |
|------|---------|------|------|
| WritingTabInline 훅 | 30 | 35 | +5 |
| ResourceView | 미확인 | 1,040줄 / 12훅 | 예상보다 큼 |
| WorldStudioView | 미확인 | 328줄 / 6훅 | 경량 |
| SettingsView 자동저장 | 미확인 | 이미 있음 | ✅ M1 범위 제외 |

---

## M1 / M2 실행 계획 보정

### 🚨 중요 발견 1: ResourceView 1,040줄 + 자동저장 0
- 이전 M1.2 T-106 "Character 탭 자동저장"에 ResourceView 내부 책임 누락 발견
- **비용 상향**: T-106 3h → 6h

### ✅ 발견 2: SettingsView 자동저장 이미 있음
- **M1 T-104~108에서 Settings 제외 가능** (3h 절약)

### 🎯 발견 3: WritingTabInline 원고 미저장
- UI 설정만 localStorage. 원고 본체 자동저장 없음.
- **M1 최우선 과제 확정** — 2시간 글 쓰다 크래시 시 전부 소실

### 💡 발견 4: WritingTabInline 35훅 그룹화 기회
- useCallback 7개로 의존성 관리 중
- **M2 T-203 useReducer 통합 시 5~10 state 그룹화 가능** (5~10줄 절감)

---

## 다음 단계

M0 종료 후 M1 착수 시 본 보고서 수치 반영:
- T-106 `ResourceView.tsx` 자동저장 책임 명시
- M1 범위에서 `SettingsView` 제외
- Writing 원고 자동저장을 M1 1번 과제로 승격
