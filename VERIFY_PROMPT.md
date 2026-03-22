# EH Universe Web — 외부 검증 프롬프트

아래 프롬프트를 Google Gemini / ChatGPT / Claude 등 외부 AI에 붙여넣고, 프로젝트 코드를 함께 제공하세요.

---

## 프롬프트 시작

```
당신은 시니어 풀스택 엔지니어이자 보안 감사관입니다.
아래 Next.js 프로젝트(EH Universe Web)를 7가지 축으로 검증하고,
각 축마다 PASS / WARN / FAIL 판정 + 구체적 근거를 출력하세요.

## 프로젝트 개요
- 이름: EH Universe Web — SF 소설 집필 보조 웹앱
- 스택: Next.js 15 (App Router) + TypeScript + Firebase Auth + Google Gemini API
- 주요 기능:
  · AI 소설 집필 스튜디오 (씬시트, 연출, 세계관 시뮬)
  · 문체 개발 스튜디오 (문체 분석/비교/개발)
  · Narrative Sentinel 엔진 (장르별 HCRF 채점, 섀도우 스테이트)
  · 상표/IP 자동 감지 필터
  · Google Drive 동기화
  · EPUB/DOCX 내보내기
- 파일 수: ~68 TSX/TS 파일
- 의존성: @google/genai, firebase, next, react, lucide-react, react-markdown

## 검증 축 (7가지)

### 1. 보안 (Security)
- API 키가 클라이언트 코드에 하드코딩되어 있는가?
- Firebase 보안 규칙이 적절한가?
- XSS, 인젝션 취약점이 있는가?
- 환경변수(.env) 관리가 올바른가?
- 로그아웃 시 민감 데이터(API 키, 토큰) 정리가 되는가?

### 2. 아키텍처 (Architecture)
- 컴포넌트 분리가 적절한가? (God Component 존재 여부)
- 상태 관리 패턴이 일관적인가? (Context, localStorage 혼용 문제)
- 라우트 구조가 Next.js 컨벤션을 따르는가?
- lib / engine / services / components 의 역할 분리가 명확한가?

### 3. 성능 (Performance)
- 불필요한 리렌더링이 있는가?
- 대용량 데이터(소설 원고) 처리 시 메모리 이슈가 있는가?
- 번들 사이즈에 영향을 주는 불필요한 import가 있는가?
- API 호출에 적절한 캐싱/디바운스가 있는가?

### 4. 에러 처리 (Error Handling)
- API 실패 시 사용자에게 적절한 피드백이 있는가?
- try-catch가 누락된 비동기 호출이 있는가?
- 네트워크 끊김 / 토큰 만료 시 graceful degradation이 있는가?

### 5. 타입 안전성 (Type Safety)
- any 타입이 과도하게 사용되었는가?
- 인터페이스/타입 정의가 일관적인가?
- 런타임에 타입 불일치가 발생할 수 있는 지점이 있는가?

### 6. UX / 접근성 (UX & Accessibility)
- 로딩 상태 표시가 있는가?
- 빈 상태(empty state) 처리가 되어 있는가?
- 키보드 접근성이 확보되어 있는가?
- 모바일 반응형이 적용되어 있는가?

### 7. 비즈니스 로직 (Domain Logic)
- Narrative Sentinel 엔진의 채점 로직에 논리적 오류가 있는가?
- 상표/IP 필터가 우회 가능한 케이스가 있는가?
- 세션/프로젝트 데이터 마이그레이션에 데이터 유실 위험이 있는가?
- EPUB/DOCX 내보내기 시 서식이 깨지는 케이스가 있는가?

## 출력 형식

각 축마다 아래 형식으로 출력하세요:

### [축 이름]
- **판정**: PASS / WARN / FAIL
- **점수**: 0~100
- **발견 사항**:
  1. [구체적 파일명:줄번호] — 문제 설명
  2. ...
- **권고 사항**:
  1. 수정 방법 제안
  2. ...

## 최종 요약

| 축 | 판정 | 점수 |
|----|------|------|
| 보안 | | |
| 아키텍처 | | |
| 성능 | | |
| 에러 처리 | | |
| 타입 안전성 | | |
| UX/접근성 | | |
| 비즈니스 로직 | | |
| **종합** | | **/100** |

P0 (즉시 수정 필수) 항목을 별도로 3개 이내로 뽑아주세요.
```

---

## 사용법

1. 위 프롬프트를 복사
2. 프로젝트 코드를 ZIP으로 압축하거나, 주요 파일을 첨부
3. Google Gemini (1.5 Pro / 2.0) 또는 다른 AI에 함께 전달
4. 결과를 `VERIFY_RESULT.md`로 저장

### 코드 제공 시 우선 첨부 파일 (중요도 순)

1. `src/engine/pipeline.ts` — 핵심 생성 파이프라인
2. `src/engine/hfcp.ts` — HCRF 채점 엔진
3. `src/engine/shadow.ts` — 섀도우 스테이트
4. `src/engine/validator.ts` — 검증기
5. `src/app/studio/page.tsx` — 메인 스튜디오 페이지
6. `src/components/studio/SceneSheet.tsx` — 씬시트
7. `src/components/studio/StyleStudioView.tsx` — 문체 스튜디오
8. `src/lib/ai-providers.ts` — AI 프로바이더 관리
9. `src/services/geminiService.ts` — Gemini API 호출
10. `src/services/driveService.ts` — Drive 동기화
11. `src/lib/firebase.ts` — Firebase 초기화
12. `src/lib/AuthContext.tsx` — 인증 컨텍스트
