# 탭별 채팅→양식 예비설계안 (세트)

> **상태: 예비설계안 · 전체 대기 (2026-06-03)** — 승인 전 **코드 착수 보류**.
> 근거: `C:\Users\sung4\OneDrive\바탕 화면\claude` 작가 instruction 시스템(_도구/ 60+ 모듈 · novel_knowledge/ 외부 검토 코퍼스 · projects/tunnel-yuju/ 실물 산출) 정밀 분석(2026-06-03, 5 도메인 병렬 추출 + 핵심 파일 직접 재검증). `novel_knowledge`는 앱 자동 주입/RAG 입력원이 아니다.
> 모델: **각 탭 = 채팅(발산 브레인스토밍) → AI가 양식(구조화 폼) 채움 → 사람이 검토·수정 → 사람이 커밋**. 끝은 없다(무한 확장). "종료"는 매 확장 단위의 **사람 커밋**. 과정 autosave / 확정은 사람.

## 문서 구성

| 파일 | 탭 | 커밋 단위(1건 확정 대상) | 상태 |
|---|---|---|---|
| [`_공통-3기둥.md`](_공통-3기둥.md) | (전 탭 공통) | — 정합·인덱스·커밋·게이트 공통 레이어 | 대기 |
| [`00-세계관.md`](00-세계관.md) | 세계관 / World | world_fact entry 1건 | 대기 (상세 3안 설계) |
| [`01-캐릭터.md`](01-캐릭터.md) | 캐릭터 / Character | 캐릭터 1명 · 관계 1방향 · 인구 1묶음 | 대기 |
| [`02-씬시트·연출.md`](02-씬시트·연출.md) | 씬시트 / 연출 (2탭) | 에피소드 1화 · (연출=화 콘티) | 대기 |
| [`03-구성.md`](03-구성.md) | 구성 (플롯·메인스토리·시놉) | 작품 1 · 아크 1 · 화 1 (3계층) | 대기 |
| [`04-집필·퇴고·출고.md`](04-집필·퇴고·출고.md) | 집필 / 퇴고 / 출고 (3스테이지) | 1화 | 대기 |

**검토 산출물 (자기감사)**: [`_검토_정합_정밀성.md`](_검토_정합_정밀성.md) · [`_연계성_점검.md`](_연계성_점검.md).

> ⚠️ **[2026-06-03 연계성 점검 — 최우선 정정]** 본 세트는 greenfield(신규 스키마·신규 store·신규 provenance)로 작성됐으나, 기존 Studio가 개념의 **~70-80%를 이미 구현** (M4 Origin Tag `TaggedField`/`EntryOrigin` · `CharRelation` · `SceneDirectionDataV2` · `ProactiveSuggestion` · `QualityGate` · 11 AppTab). **재framing 필수: "신규 생성" → "기존에 sidecar + 어댑터 융합".** 코어 진실원 = 기존 `Project`, provenance = 기존 M4 재사용, 저장 = `useProjectManager`/`usePrimaryWriter` hook. 상세 [`_연계성_점검.md`](_연계성_점검.md).
>
> ✅ **[2026-06-06 스키마 reconcile 적용]** 00·01·02 스키마에 잔존하던 평행 provenance(`lockHistory: LockEvent[]`/`locked`)를 M4 `TaggedField`/`OriginMetadata.editedBy[]`로 치환 완료, 00 "SSOT=entries"→"Project sidecar(코어=Project / 신규 로어=sidecar / 인덱스=derived)" 재framing 완료. `_검토_정합_정밀성.md` **C6(P1)** 참조. → 파일럿(00) Phase 0 코드 착수 선결조건 해소.

## 핵심 발견 (분석 종합)

1. **탭마다 "양식"의 성격이 다르다.**
   - 세계관·캐릭터·씬시트·구성 = **필드 채우기 폼**(WorldEntry류 — front-matter + 섹션 + lock + refs).
   - 집필(원고) = **얇은 메타 래퍼 + 자유 본문 + 사후 grep 측정**. 본문에 필드를 박지 않음 — 메타(자수·후크·AI티)는 본문에서 추출해 별도 로그로. (세계관식 폼과 근본 다름.)

2. **"커밋 단위"가 탭마다 다르다.** 세계관=entry 1건, 캐릭터=3종(인물/관계/인구), 씬시트=1화, 구성=3계층(작품/아크/화), 집필=1화. 모두 **사람이 닫는다**(AI는 발견·채움·제안만).

3. **정합·인덱스·커밋 메커니즘은 전 탭 공통** → `_공통-3기둥.md`로 분리(DRY). 각 탭 문서는 자기 스키마 + 그 탭 고유 정합/인덱스만 다룸.

## 격리 (전 탭 공통)

절대 금지 8파일 0byte: `studio-types.ts` / `save-engine/*` / `origin-migration.ts` / `useOriginTracker.ts` / `OriginBadge.tsx` / `AuditExportButton.tsx` / `markdown-serializer.ts`·`project-serializer.ts` / `ManuscriptView.tsx`. 신규 기능은 자체 모듈(예: `worldgraph/`, `charactergraph/`)로, 이들 import 0.

## 진행 게이트

파일럿 = **세계관 탭**(00) Phase 0(round-trip 무손실)이 전체 진입 관문. 통과 후 캐릭터→씬시트→구성→집필 순(의존도 순). **본 세트는 전부 대기 — 사용자 승인 시 파일럿부터 착수.**
