# EH Universe Web — 전수 QA 라이브 검사 보고서

**검사일**: 2026-03-25
**검사 대상 URL**: https://eh-universe-web.vercel.app/studio
**검사 범위**: 랜딩 → BYOK → 가이드 모드 전체 → 집필 2챕터 → 내보내기 7종 → UI/UX + 수동 코드 분석
**엔진 버전**: ANS 10.0
**AI 모델**: Google Gemini — gemini-2.5-pro
**버전**: S6.0-NEXUS
**추가 검사**: PlanningView.tsx, ai-providers.ts, LangContext.tsx, pipeline.ts, genre-review.ts 수동 분석 (2026-03-25)

범례: ✅ 정상 | ⚠️ 주의 | ❌ 오류 | 🔴 P1 긴급 | 🟡 P2 중요 | 🟢 P3 낮음

---

## [1] 랜딩 & BYOK API 키 설정

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| 페이지 로드 (studio URL) | ✅ | — | 정상 렌더링 |
| BYOK 모달 열기 | ✅ | — | 배너 클릭 → 모달 표시 |
| Gemini API 키 입력 & 저장 | ✅ | — | 저장 후 배너 사라짐 |
| API 연결 상태 확인 | ✅ | — | OPTIMAL 표시 |
| 로컬 저장 용량 | ✅ | — | 0.1 MB / 5 MB |

---

## [2] AI 자동 생성

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| 세계관 스튜디오 자동생성 | ✅ | — | 줄거리/세계규칙/권력구조/갈등 4필드 생성 |
| NOL (세계관 AI 챗) 응답 | ✅ | — | 정상 응답, raw JSON 미노출 |
| 캐릭터 스튜디오 자동생성 | ✅ | — | 캐릭터 카드 정상 생성 |
| NOC (캐릭터 AI 챗) 응답 | ✅ | — | 정상 응답 |
| 연출 스튜디오 자동생성 | ✅ | — | 씬 텐션 분석 카드 생성 |
| NOP (연출 AI 챗) 응답 | ✅ | — | 정상 응답, 장르 문법 4/7 통과 |
| 집필 모드 진입 (집필 시작 버튼) | ✅ | — | 세계관 스튜디오에서 접근 가능 |
| 다음 챕터 생성 | ✅ | — | 클릭 후 텍스트 생성 완료 |
| ENGINE REPORT 카드 표시 | ✅ | — | TENSION/PACING/IMMERSION 바 차트 정상 |
| raw JSON artifact DOM 노출 | ✅ | — | `{"grade":...}` 패턴 DOM 미발견 |
| 오타 감지 | ⚠️ | 🟡 | 1챕터 13건 → 2챕터 28건 누적 증가 |
| C GRADE 등급 (TENSION 35%) | ⚠️ | 🟡 | 낮은 등급 — 장르 기반 대화비율 가이드는 정상 주입됨 (C1 ✅). TENSION 저하는 스토리 구조 문제 |
| CLEAR 검증 표시 | ✅ | — | CLEAR(1)/(2) 정상 |
| NOD 감독 경고 | ⚠️ | 🟢 | "이득 vs 대가 L68 - 이득/성공에 대가가 근거 없음" 표시됨 |

---

## [3] 입력 폼 & 데이터 검증

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| F5 새로고침 후 데이터 복원 | ✅ | — | 제목/장르/에피소드/플랫폼 모두 복원 |
| 기본값 (에피소드 25, 온도 0.7) | ✅ | — | 설정 패널에서 확인 |
| 에피소드 수 JS 클램핑 | ❌ | 🟡 | **B3 미수정**: HTML min/max만 존재, JS onChange 클램핑 없음 |
| 텍스트 입력 maxLength | ❌ | 🟢 | **B4 미수정**: synopsis/title/setting 등 maxLength 미설정 |
| 특수문자 입력 | ✅ | — | 입력 자체는 정상 처리 |

---

## [4] 저장 & 불러오기

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| 자동저장 동작 | ✅ | — | 헤더 "✓ 자동 저장" 표시 |
| 자동저장 시각 표시 | ⚠️ | 🟢 | **C3 미구현**: "✓ 자동 저장" 표시만 있고 마지막 저장 시각 없음 |
| BACKUP 다운로드 | ✅ | — | blob 163KB 생성 확인 |
| 불러오기 버튼 동작 | ✅ | — | 클릭 → OS 파일 선택 다이얼로그 트리거 |

---

## [5] 프로젝트 관리

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| 새 소설 시작 확인 다이얼로그 | ✅ | — | "현재 작업이 초기화됩니다. 진행하시겠습니까?" 정상 표시 |
| 취소 버튼 동작 | ✅ | — | 취소 클릭 → 데이터 유지 |
| EP 탭 점프 기능 | ⚠️ | 🟢 | **C2 미구현**: 25화+ 쌓이면 스크롤만 가능, EP 번호 입력 없음 |
| 프로젝트 그룹 (미분류) 관리 | ✅ | — | 그룹 존재, + 버튼 표시 |
| 세션 이름 변경 | ✅ | — | "이름 변경" 버튼 존재 |

---

## [6] 내보내기 7종

| 형식 | 결과 | 파일 크기 | 심각도 | 비고 |
|------|------|-----------|--------|------|
| TXT | ✅ | 49 KB | — | blob 생성 확인 |
| JSON | ✅ | 154 KB | — | blob 생성 확인 |
| EPUB | ✅ | 25 KB | — | blob 생성 확인 |
| DOCX | ✅ | 112 KB | — | blob 생성 확인 |
| BACKUP | ✅ | 163 KB | — | blob 생성 확인 |
| 불러오기 | ✅ | — | — | 파일 선택 다이얼로그 정상 |
| 카카오 (미확인) | — | — | — | 이번 검사 범위 외 |

---

## [7] UI/UX & 반응형

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| KO 언어 | ✅ | — | 기본값 |
| EN 언어 전환 | ✅ | — | 전체 UI 영어 전환 확인 |
| JP 언어 전환 | ✅ | — | 전체 UI 일본어 전환 확인 |
| CN 언어 전환 | ✅ | — | 전체 UI 중국어 전환 확인 |
| 다국어 미번역 문자열 | ⚠️ | 🟢 | "VALIDATION DETAIL", "ENGINE REPORT", "CLEAR" JP/CN에서 영문 유지 |
| 테마 전환 (다크/딤) | ✅ | — | ☀️/🌙 2단계 토글 정상 |
| 라이트 모드 | ⚠️ | 🟢 | 다크/딤만 지원, 라이트 모드 없음 (의도된 설계로 추정) |
| 1920px 해상도 | ✅ | — | 정상 레이아웃 |
| 1280px 해상도 | ✅ | — | 정상 레이아웃 |
| 768px 해상도 | ⚠️ | 🟡 | **DPR 1.5 환경에서 CSS viewport = 1704px 고정, 반응형 중단점 미트리거** — 모바일/태블릿 레이아웃 미전환 |
| 사이드바 접기/펼치기 | ✅ | — | "◄ 접기" / 햄버거 메뉴 정상 |
| 검색 기능 (🔍 아이콘) | — | — | 이번 검사 미실시 |

---

## [8] 콘솔 & 네트워크

| 항목 | 결과 | 심각도 | 비고 |
|------|------|--------|------|
| JavaScript 콘솔 에러 | ✅ | — | 앱 에러 없음 (Chrome extension 로그 18건만) |
| API 호출 상태 코드 | ✅ | — | /api/chat, /api/gemini-structured 모두 HTTP 200 |
| deprecated 모델 사용 | ✅ | — | noa_active_model = gemini-2.5-pro (정상) |
| localStorage B2 마이그레이션 | ⚠️ | 🟡 | `eh-active-model`/`eh-active-provider` 자동 마이그레이션 완료 ✅. `eh-lang`은 LangContext.tsx에서 현재도 운영 키로 사용 중 (의도된 코드). `eh-api-key-gemini`는 소스 미참조 고아 키. |

---

## 버그 픽스 상태 재검증 (QA_FIX_REPORT.md 대비)

| ID | 설명 | 상태 | 비고 |
|----|------|------|------|
| B1 🔴 | JSON artifact DOM 노출 | ✅ 현재 미발생 | `stripTrailingReportJson` (JSON.parse 기반)이 trailing JSON 처리. 인라인 중간 삽입 시 regex 2단계 중첩 한계(edge case) 잔존 → 단위 테스트 권장 |
| B2 🟡 | localStorage 이중 키 + deprecated 모델 | ✅ 실질 해결 | `eh-active-model`/`eh-active-provider` 자동 마이그레이션 코드 존재. `eh-lang`은 LangContext.tsx의 현재 운영 키. `eh-api-key-gemini`는 고아 키(읽히지 않음) → B2 재분류: 해결됨, 고아 키 cleanup은 별도 편의 작업 |
| B3 🟢 | 에피소드 수 JS 클램핑 없음 | ❌ 미수정 | PlanningView.tsx line 376: `parseInt(e.target.value) \|\| 25` 사용, 범위 클램핑 없음. 경고 표시만 있음 |
| B4 🟢 | 텍스트 maxLength 없음 | ❌ 미수정 | synopsis(line 521), corePremise(535), powerStructure(544), currentConflict(553), setting(504), primaryEmotion(513), povCharacter(495) 등 7개 핵심 필드 maxLength 없음 |
| C1 편의 | 모바일 대화비율 가이드 | ✅ 이미 구현됨 | `buildSystemInstruction()`에 `dialogueGuide` 블록 포함. GENRE_BENCHMARKS 전 장르에 `dialogueRatio` 기준값(min%~max%) 존재. 시스템 프롬프트 자동 주입 |
| C2 편의 | EP 탭 점프 기능 | ❌ 미구현 | 세션 목록 스크롤만 가능 |
| C3 편의 | 자동저장 시각 표시 | ⚠️ 부분 | "✓ 자동 저장" 표시는 있으나 시각("몇 초 전") 미표시 |

---

## 수정 우선순위 요약 (수동 코드 분석 반영)

| 순위 | ID | 핵심 작업 | 영향도 |
|------|----|-----------|--------|
| 🔴 P1 | B1 | `stripEngineArtifacts` — 인라인 중간 삽입 3단계 중첩 JSON edge case 단위 테스트 추가 | 사용자 화면 오염 위험 |
| 🟡 P2 | 768px | 반응형 레이아웃 `min-width` 명시 + 태블릿 안내 문구 | 태블릿 사용자 UX |
| 🟢 P3 | B3 | PlanningView.tsx line 376 onChange: `Math.min(500, Math.max(1, v))` 클램핑 1줄 추가 | 음수/초과 입력값 방지 |
| 🟢 P3 | B4 | synopsis, corePremise 등 7개 필드 `maxLength={800}` 또는 `{500}` 추가 | 토큰 폭발 방지 |
| 🟢 편의 | C2 | 세션 목록 상단에 EP 번호 입력 점프 필드 추가 | 장편 작업 편의성 |
| 🟢 편의 | C3 | 자동저장 타임스탬프 ("방금 저장됨" / "N초 전") 추가 | 사용자 안심 |
| 🟢 편의 | B2 | `eh-api-key-gemini` 고아 키 cleanup 유틸 추가 | localStorage 정리 |

---

## 참고: 정상 확인 항목

- ✅ 내보내기 5종 (TXT 49KB / JSON 154KB / EPUB 25KB / DOCX 112KB / BACKUP 163KB) 모두 blob 생성 확인
- ✅ 4개 언어 (KO/EN/JP/CN) 전환 모두 정상 — 전체 UI 각 언어로 전환됨
- ✅ 집필 다음 챕터 생성 정상 (ENGINE REPORT 카드 표시, raw JSON 미노출)
- ✅ 새 소설 시작 확인 다이얼로그 정상 ("현재 작업이 초기화됩니다")
- ✅ 자동저장 동작 정상 (헤더 "✓ AUTO-SAVED" / "✓ 자동 저장" 표시)
- ✅ API 키 설정 (BYOK) 정상, 연결 상태 OPTIMAL
- ✅ 콘솔 에러 없음 (앱 레벨), 모든 API HTTP 200
- ✅ AI 모델 gemini-2.5-pro (deprecated 모델 없음, noa_active_model 정상)
- ✅ C1 대화비율 가이드: GENRE_BENCHMARKS 전 장르 `dialogueRatio` 시스템 프롬프트 자동 주입 확인
- ✅ B2 모델 마이그레이션: `eh-active-model`→`noa_active_model` 자동 처리 코드 확인
- ✅ B1 stripEngineArtifacts: `stripTrailingReportJson` JSON.parse 기반으로 trailing JSON 완전 처리 확인

---

## 수동 코드 분석 요약 (2026-03-25 추가)

| 파일 | 분석 항목 | 결과 |
|------|-----------|------|
| `PlanningView.tsx:376` | 에피소드 onChange 클램핑 | ❌ `parseInt \|\| 25` 만 있음. 범위 클램핑 없음 |
| `PlanningView.tsx:521,535,544,553` | synopsis/세계관 textarea maxLength | ❌ 없음 |
| `LangContext.tsx:26,34` | `eh-lang` 키 현황 | ℹ️ 현재 운영 키 (레거시 아님) |
| `ai-providers.ts:165,168,191,198` | `eh-active-*` 마이그레이션 | ✅ 읽기 시 자동 noa_ 이전 + 삭제 |
| `pipeline.ts:959-976` | `stripEngineArtifacts` regex | ✅ 대부분 처리. regex 2단계 한계 edge case 잔존 |
| `pipeline.ts:937-957` | `stripTrailingReportJson` | ✅ JSON.parse로 완전 파싱, trailing JSON 100% 제거 |
| `pipeline.ts:797-841` | `dialogueGuide` (C1) | ✅ 전 장르 대화비율 기준값 주입 확인 |
| `genre-review.ts` | `GENRE_BENCHMARKS.dialogueRatio` | ✅ 10개+ 장르 모두 min/max % 존재 |
