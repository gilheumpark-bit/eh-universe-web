"use client";

/* ===========================================================
   TabWriting — 집필 (Writing) tab — Phase 3 실제 배선 (wiring)

   구조 (wr-grid, 2-pane) — 디자인 보존:
   - 센터(wr-center): 집필 모드 헤더(라이브 자수·자동저장·원고함) + 메타 칩
     + 실제 원고 에디터(wr-doc) — editDraft 바인딩 <textarea> (StudioShell 디바운스 자동저장)
     + AI 제안 블록(SuggBlock — suggestions[] 매핑, 수락=본문 삽입 / 거절=dismiss)
     + AI 생성바(wd-input 재사용) — input/setInput + handleSend 실 엔진 스트리밍,
       isGenerating 중단(handleCancel), !hasAiAccess 시 setShowApiKeyModal(true)
   - 우측(wr-panel 360px): 버전 스냅샷(versionedBackups) + 오염 방지 요약(directorReport)
     + 합성 로그(lastReport.issues / pipelineResult) + 삽입/대체 CTA(setEditDraft) +
       Synthesis Queue(pipelineResult.stages)

   내비 (새 셸 규칙):
   - 탭 전환은 useLoreguardTab().setActiveTab (구 context setActiveTab(AppTab) 금지 — 무반응)
   - '원고함'/'전체 화면' → window CustomEvent 'loreguard:open-export' dispatch
     (export-panel 이 같은 이름의 이벤트를 수신해 탭 내 원고함/출고 패널을 연다)
   - '문체' → window CustomEvent 'loreguard:open-style' dispatch
     (StyleStudioPanel — PART 5 — 이 수신해 기존 StyleTab 을 slide-over 로 mount)
   - '확인서' → window CustomEvent 'loreguard:open-cp' dispatch (S3)
     (CpJournalPanel — sibling 파일 ../CpJournalPanel — 이 수신해 기여도/출처/투고
      패키지 3 sub-view + 확인서 발급(HTML+MD)을 slide-over 로 mount)
   - 'IP 자산화' → window CustomEvent 'loreguard:open-ipasset' dispatch (Z1d)
     (IpAssetPanel — sibling 파일 ../IpAssetPanel·Z1b 소유 — 이 수신해 준비도/바이블/
      패키지 3 탭을 slide-over 로 mount. 이 파일은 버튼 dispatch + mount 만)

   contract: default export, props 없음, CSS prefix `wr-`,
   아이콘은 @/components/loreguard/icons. 모든 className 은 loreguard.css 에 존재.

   데이터 출처(real engine, useStudio):
   - editDraft / setEditDraft / editDraftRef  → 본문 + 라이브 자수 + 자동저장
   - suggestions / setSuggestions             → AI 제안 블록
   - directorReport                           → 오염 방지 요약 (findings/score)
   - lastReport (EngineReport)                → 합성 로그 (issues) + 등급/aiTone 메타칩
   - pipelineResult                           → Synthesis Queue (stages)
   - versionedBackups / doRestoreVersionedBackup → 버전 스냅샷 복원
   - saveFlash / lastSaveTime                 → 자동 저장 상태

   안전 UX (S1 — 파괴적 액션 가드, 저장 경로 변경 없음):
   - 복원·생성 중단 = 2-step inline arm-confirm (state 기반, 5초 자동 해제 — window.confirm 금지)
   - 되돌리기 1-step = lastSnapshotRef (제안 삽입 직전 editDraft 스냅샷, 토글 — 순수 editDraft 레벨,
     세션 id·회차 바인딩: 세션/회차 전환 시 자동 폐기 + undo 시 일치 가드 — 타 세션 본문 주입 차단)
   - 대용량 붙여넣기(>100,000자) = 비차단 알림 + 해당 onChange 1회만 startTransition (차단/절단 X)
   - IME composition 추적 ref (S2 로거용 — setEditDraft 를 절대 gate 하지 않음, 타이핑 유실 금지)

   S2 (창작 과정 확인서 기록 — 상세 기록 지도는 PART 3.5 주석):
   - 기존 엔진 재사용: StudioShell 이 mount 한 window.__creativeLogger (useCreativeEventLogger)
   - 타이핑→logHumanEdit(800ms idle·|Δlen|≥20자·IME 조합 후) / 제안 채택→logAcceptAI
   - AI 생성/재생성(AI_DRAFT/AI_REWRITE)은 이 탭이 기록 X — useStudioAI 가 handleSend /
     handleRegenerate 성공 경계에서 recordCreativeEvent 로 직접 기록 (단일 surface·loop 1 REPAIR)
   - dedup: ⓐ StudioShell snapshot-listener(≥300자/5분 logHumanEdit)는 children 모드 미등록
     — 본문 인간 편집은 여기 한 곳·한 granularity 로만 계상. ⓑ AI 이벤트는 엔진 한 곳만
     — 1 생성 = 1 AI 이벤트 (HCI 이중 계상 차단)

   S4 (구 셸 UX parity — AI 결과 도착·토큰·재생성·회차 내비):
   - AI 결과 strip: isGenerating true→false 완료 경계에서 최신 assistant 메시지를
     에디터 아래 strip 으로 표시 (접힘 미리보기 + 펼치기). [원고에 삽입] =
     acceptSuggestion 과 동일 시퀀스 (takeSnapshot → 인간 잔여 flush → 삽입 →
     베이스라인 전진 → logAcceptAI — AI 삽입분의 이중/오귀속 차단). [무시] = dismiss.
     NEW 완료만 표시 (경계 전이 + lastHandledAiMsgRef) — 세션·회차 전환 시 폐기,
     사용자 중단(handleCancel)으로 끝난 생성은 표시하지 않음 (폐기 약속 일치).
   - 토큰 미터: tokenUsage { used, budget } (근사치·useStudioAI 산출) + generationTime(초)
     — 실데이터 존재 시에만 표시, 임계값·페이크 수치 없음.
   - 재생성: handleRegenerate(최신 assistant id) — AI_REWRITE 기록은 엔진이 담당 (S2 dedup).
   - 회차 내비: 메타 칩 '회차 N' ‹ › — prev = setConfig episode-1 (≥1),
     next = manuscripts 에 episode+1 존재 시 setConfig episode+1 / 미존재 시
     handleNextEpisode (현 초안을 현 회차 manuscripts 에 저장 + episode+1·totalEpisodes 상한).
     pending 초안 flush 는 StudioShell prevDraftTargetRef effect 가 회차 전환 시
     이전 회차 자리로 수행 — 여기서 중복 flush 금지 (S1).

   S5 (판단용 집필 지표 — advisory only·차단 0·BareWrite 강제성 정책):
   - 자수 3단위: 공백 포함(기준 단위·chg_145 표준)·공백 제외·한글 음절([가-힣])
     — 기존 top bar 자수 위치에 compact 표시 + 'M 규격 5,500~7,000자' 중립 안내 pill
     (임계 미달/초과 색·경보·차단 일절 없음 — 정보 제공 전용).
   - 자가 점검 카드(우측 패널·접이식·기본 접힘): 단정형 정리문 종결·설명형 종결·
     연속 동일 어절 시작 — 전부 결정적 regex/count (AI 자가 측정 X·날조 지표 X).
     중립 숫자만 — 색상 fail 상태 없음·각 행 '판단용 — 작가 결정 영역' 캡션.
   - Voice 보호 정책 표명 1줄 (Layer 51/85/88 — 자동 문체 변환 없음).
     voice 손상 '감지' 기능 아님 — 그런 엔진은 없으며 기능 가장 금지 (정직 표기).
   - perf: 전 계산 = editDraft 의존 useMemo 단 1개 (PART 3.6) — 키스트로크당
     선형 스캔 1회·중첩 수량자 없는 regex 만 (catastrophic backtracking 불가).

   S7 (집필 통계 스트립 + AI 주입 컨텍스트 미리보기 — PART 2.5):
   - WritingStatsStrip: analyzeText/computeCPM (writing-stats.ts) 재사용 —
     top bar 자수 3단위와 중복 없는 보완 지표만 (문장·평균·대사·반복·CPM).
   - ContextRefCard: buildContextBlock (context-block.ts) 재사용 — 실제 주입
     소스(세계관 17 필드·캐릭터 스마트 주입·회차)만 요약 (날조 금지·정직 표기).

   S8 (퇴고): top bar '퇴고' 버튼 → CustomEvent 'loreguard:open-revision' dispatch.
   패널 본체 = ../RevisionPanel (별도 파일·B 에이전트 소유) — 이 파일은 mount 만.

   PART 4.5 (출고 패널 강화): 플랫폼 자수 적합(checkPlatformFit) + IP 준비도
   (computeIPReadiness·작가 자가 평가 입력) + 작업 영수증(buildReceipt) —
   전부 기존 순수 함수 재사용·산식 발명 0·전 지표 advisory (export 차단 없음).
   =========================================================== */

import { Fragment, startTransition, useCallback, useId, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, Message, ProactiveSuggestion } from "@/lib/studio-types";
import {
  Check,
  X,
  Expand,
  Settings,
  Shield,
  Clock,
  ChevronR,
  ChevronL,
  Download,
  Send,
  Sync,
  Layers,
  Plus,
  Pen,
} from "@/components/loreguard/icons";

// ── PART 4 (원고함·출고 패널) 전용 import — 별도 구문 유지 (병행 수정 충돌 방지) ──
import { useEffect, useMemo } from "react";
import { useStudioExport } from "@/hooks/useStudioExport";
import { runPublishAudit, type AuditSeverity, type PublishAuditReport } from "@/lib/translation/publish-audit";
import type { EpisodeManuscript } from "@/lib/studio-types";
// ── X4 (품질 하네스 — 생성·저장·재사용) 전용 import — 별도 구문 유지 ──
import {
  buildHarness,
  loadOrBuildHarness,
  markHarnessUsed,
  harnessToAuditOptions,
  summarizeHarness,
  koreanGenreIdFromStoryGenre,
  gradeFromPrismMode,
} from "@/lib/creative/quality-harness";

// ── PART 5 (문체 스튜디오 패널) 전용 import — 별도 구문 유지 ──
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";

// ── S3 (창작 과정 확인서 패널) 전용 import — 별도 구문 유지 ──
// CpJournalPanel 셸 자체는 경량 — 내부 3 heavy 컴포넌트가 dynamic(ssr:false).
import CpJournalPanel from "@/components/loreguard/CpJournalPanel";
import { Scroll } from "@/components/loreguard/icons";

// ── PART 3.5 (S2 창작 과정 기록) 전용 import — type-only, 런타임 의존성 0 ──
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";

// ── S6 (a11y-perf) 전용 import — 별도 구문 유지 (병행 수정 충돌 방지·동일 모듈 추가 import 는 합법) ──
import { memo } from "react";

// ── S7 (집필 통계 스트립·AI 주입 미리보기) 전용 import — 별도 구문 유지 ──
// writing-stats / context-block = 기존 순수 함수 재사용 (산식 발명 금지·데스크톱 page.tsx 와 동일 엔진)
import { analyzeText, computeCPM } from "@/lib/desktop/writing-stats";
import { buildContextBlock, type ContextItem } from "@/lib/desktop/context-block";
import type { StoryConfig } from "@/lib/studio-types";
import { Eye, Chevron } from "@/components/loreguard/icons";

// ── S8 (퇴고 패널 mount) 전용 import — 패널 본체는 별도 파일 (B 에이전트 소유·이 파일은 mount 만) ──
import RevisionPanel from "@/components/loreguard/RevisionPanel";
import { Edit as EditIcon } from "@/components/loreguard/icons";

// ── Z1d (IP 자산화 패널 mount) 전용 import — 패널 본체는 별도 파일 (Z1b 소유·이 파일은 mount 만) ──
// CpJournalPanel 과 동일 패턴: 'loreguard:open-ipasset' CustomEvent 수신은 패널이 담당.
import IpAssetPanel from "@/components/loreguard/IpAssetPanel";

// ── QB-tabwriting-ide (1) 찾기·바꾸기 바 전용 import — 신규 보조 컴포넌트 (이 owner 소유) ──
// 매칭/치환 로직은 FindReplaceBar 내부에서 기존 find-occurrences 순수 함수 재사용 (발명 0).
import FindReplaceBar from "@/components/loreguard/FindReplaceBar";
import { Search } from "@/components/loreguard/icons";

// ── [Z1c-mid-ports] Web Share (출고 패널 OS 공유) 전용 import — 별도 구문 유지 ──
// 기존 @/lib/browser/web-share 재사용 (capability 감지 canShare/canShareFiles —
// 미지원 브라우저 = 버튼 미노출·무동작). 파일 공유 미지원이면 텍스트 공유 폴백.
import { canShare, canShareFiles, shareManuscript, shareText } from "@/lib/browser/web-share";

// ── PART 4.5 (출고 패널 강화 — 플랫폼 적합·IP 준비도·작업 영수증) 전용 import — 별도 구문 유지 ──
// 전부 기존 순수 함수 재사용: export-spec(checkPlatformFit) / ip-readiness(computeIPReadiness) / work-receipt(buildReceipt)
import { checkPlatformFit, PLATFORM_SPECS } from "@/lib/desktop/export-spec";
import { computeIPReadiness, type IPReadinessParts } from "@/lib/creative/ip-readiness";
import { buildReceipt } from "@/lib/creative/work-receipt";
import { Scale, Flag, Quote } from "@/components/loreguard/icons";

// ── F4 (통일 composer v1 — model picker·@멘션·본문 폰트) 전용 import — 별도 구문 유지 ──
// 기존 생성바 확장만 (재설계 X·본문 침범 X — R1 가드레일). 보조 로직은 sibling 파일.
import {
  ModelPickerInline,
  FontModeToggle,
  useWritingFontMode,
  MentionDropdown,
  buildMentionItems,
  detectMentionQuery,
  filterMentionItems,
  applyMention,
  buildMentionContextBlock,
  type MentionItem,
} from "@/components/loreguard/ComposerExtras";

/** S2 — StudioShell 이 mount 한 useCreativeEventLogger 인스턴스 접근자 (신규 엔진 X).
    SSR/미마운트 시 null — 호출부는 전부 null-safe (fireLog 가 실패 표면화 담당).
    window.__creativeLogger 는 src/types/creative-logger-global.d.ts 전역 선언 — cast 불필요
    (SceneSheet·CharacterTab 과 동일 typed 패턴). */
const getLogger = (): CreativeEventLogger | null =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

// ── S4 신규 문자열 — 전부 여기 (S6 i18n — L4 빌더·언어별 산출, 키·사용처 무변경) ──
const buildS4Str = (lang: AppLanguage) => ({
  aiResultBadge: "AI",
  aiResultTitle: L4(lang, { ko: "AI 생성 결과", en: "AI generation result" }),
  insertToDraft: L4(lang, { ko: "원고에 삽입", en: "Insert into draft" }),
  dismissResult: L4(lang, { ko: "무시", en: "Dismiss" }),
  expandResult: L4(lang, { ko: "펼치기", en: "Expand" }),
  collapseResult: L4(lang, { ko: "접기", en: "Collapse" }),
  regenerate: L4(lang, { ko: "재생성", en: "Regenerate" }),
  regenerateAria: L4(lang, { ko: "마지막 AI 생성 결과 재생성", en: "Regenerate the last AI result" }),
  tokenUnit: L4(lang, { ko: "토큰", en: "tokens" }),
  secondsUnit: L4(lang, { ko: "초", en: "s" }),
  tokenMeterAria: L4(lang, { ko: "이번 생성 토큰 사용량", en: "Token usage for this generation" }),
  episodeLabel: L4(lang, { ko: "회차", en: "Episode" }),
  prevEpisodeAria: L4(lang, { ko: "이전 회차로 이동", en: "Go to the previous episode" }),
  nextEpisodeAria: L4(lang, { ko: "다음 회차로 이동", en: "Go to the next episode" }),
  aiInsertSnapshotLabel: L4(lang, { ko: "AI 결과 삽입 전", en: "Before AI result insert" }),
});

/** S4 — AI 결과 strip 접힘 미리보기 길이 (이 길이 초과 시 펼치기 토글 노출) */
const S4_PREVIEW_LEN = 160;

// ── S5 신규 문자열 — 판단용(advisory) 집필 지표 전용 (S6 i18n — L4 빌더·키·사용처 무변경) ──
const buildS5Str = (lang: AppLanguage) => ({
  charUnit: L4(lang, { ko: "자", en: " chars" }),
  noSpaceLabel: L4(lang, { ko: "공백제외", en: "excl. spaces" }),
  syllableLabel: L4(lang, { ko: "음절", en: "syllables" }),
  mSpecPill: L4(lang, { ko: "M 규격 5,500~7,000자", en: "M spec 5,500–7,000 chars" }),
  mSpecTitle: L4(lang, {
    ko: "M 규격(표준 회차) 참고 분량 — 판단용 안내 · 차단/경보 없음",
    en: "M spec (standard episode) reference length — advisory only, no blocking or alerts",
  }),
  selfCheckTitle: L4(lang, { ko: "자가 점검 (판단용)", en: "Self-check (advisory)" }),
  selfCheckExpand: L4(lang, { ko: "펼치기", en: "Expand" }),
  selfCheckCollapse: L4(lang, { ko: "접기", en: "Collapse" }),
  selfCheckToggleAria: L4(lang, {
    ko: "자가 점검 (판단용) 카드 접기/펼치기",
    en: "Expand or collapse the self-check (advisory) card",
  }),
  advisoryCaption: L4(lang, { ko: "판단용 — 작가 결정 영역", en: "Advisory — the author decides" }),
  rowDeclarative: L4(lang, { ko: "단정형 정리문 종결", en: "Declarative summary endings" }),
  rowExplanatory: L4(lang, { ko: "설명형 종결", en: "Explanatory endings" }),
  rowRepeatedStart: L4(lang, {
    ko: "연속 동일 어절 시작 문장 쌍",
    en: "Consecutive sentences opening with the same word",
  }),
  countUnit: L4(lang, { ko: "건", en: "" }),
  voiceNotice: L4(lang, {
    ko: "Voice 보호: 자동 문체 변환 없음 — 모든 수정은 작가 결정",
    en: "Voice protection: no automatic style rewriting — every change is the author's call",
  }),
});

// ── S5 결정적 측정 상수 (advisory writing metrics — BareWrite 강제성 정책) ──
// 정책: 전 지표 판단용 — 어떤 임계도 저장/생성/회차 전환을 차단하지 않음.
//       자동 수정·자동 회귀·voice 자동 변환 없음 (Layer 51/85/88 — 작가 명령 시만).
//       측정 = 결정적 regex/count 만 (AI 자가 측정 X·산식 불확실 지표 = 표시 안 함).
// perf: 전부 선형 — 중첩 수량자 없음 (catastrophic backtracking 불가).
//       String.match(g-regex) 는 시작 시 lastIndex 0 리셋 → 모듈 레벨 공유 안전.

/** S5 — 한글 완성형 음절(가-힣) 코드포인트 범위 — [가-힣] count 와 동치·match 배열 할당 없는 루프용 */
const HANGUL_SYL_START = 0xac00;
const HANGUL_SYL_END = 0xd7a3;
/** S5 (a) — 단정형 정리문 종결 (라인 말미 anchored — '~이었다.' 류로 줄을 닫는 문장) */
const RE_DECLARATIVE_END = /(?:이었다|였다|것이다|셈이다|터였다)\.[ \t]*$/gm;
/** S5 (b) — 설명형 종결 (라인 말미 anchored — (a)와 산식 독립: '~였다' 계열은 (a)에도 동시 계상될 수 있음) */
const RE_EXPLANATORY_END = /(?:법이다|뜻이었다|뿐이었다|모양새였다)\.[ \t]*$/gm;
/** S5 (c) — 문장 경계 proxy (종결부호+공백 또는 줄바꿈) — 결정적 split·비전역(lastIndex 무관) */
const RE_SENTENCE_BOUNDARY = /[.!?…]+\s+|\n+/;
/** S5 (c) — 어절 선두 따옴표·괄호·대시 strip (동일 어절 비교 정확도·anchored 비전역) */
const RE_LEADING_PUNCT = /^["'“”‘’「」『』()\[\]…—-]+/;
/** S5 (c) — 첫 어절 경계 (어절 = 공백 구분 토큰) */
const RE_FIRST_WS = /\s/;

/** 기존 문체 시스템 UI (구 셸 'style' 탭과 동일 컴포넌트) — 1000+ 줄·차트 포함 → dynamic(ssr:false) */
const StyleTab = dynamic(() => import("@/components/studio/tabs/StyleTab"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={600} />,
});

/** QB-tabwriting-ide (3) — 아웃라인 바인더 (다른 owner 소유·../OutlineBinder). 이 파일은
    dynamic import + mount + 이벤트 수신만 (편집 X). OutlineBinder 는 회차→씬 트리를 렌더하고
    'loreguard:navigate-scene' CustomEvent(detail {episode, sceneId?})를 발신 — 본 탭이
    그것을 수신해 회차 이동한다 (아래 PART 3.8 listener). 트리는 좌측 레일(loreguard.css). */
const OutlineBinder = dynamic(() => import("@/components/loreguard/OutlineBinder"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={400} />,
});

// ============================================================
// PART 1 — 메타 칩 정적 라벨 (시점만 디자인 보존, 값은 config 실데이터)
// ============================================================

type LogDotColor = "green" | "amber" | "blue" | "gray";

/** EngineReport.issues / DirectorReport.findings severity(0-3) → 색상 도트 매핑 */
function sevColor(severity: number): LogDotColor {
  if (severity >= 3) return "amber"; // CRITICAL → 경고(amber) — 디자인 팔레트 한정
  if (severity >= 2) return "amber"; // ERROR
  if (severity >= 1) return "blue"; // WARNING
  return "gray"; // INFO
}

/** unix ms → HH:MM:SS (합성 로그 표시) */
function clock(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString("ko-KR", { hour12: false });
  } catch {
    return "--:--:--";
  }
}

// ============================================================
// PART 2 — SuggBlock (AI 제안 블록: 수락=본문 삽입 / 거절=dismiss)
// ============================================================

/** S6 perf — React.memo: 순수 표시 props 만 받는 컴포넌트 (useStudio() 미사용 — 컨텍스트 stale 위험 0).
    Z1d — 콜백 참조 안정화: onAccept/onReject 는 제안 객체를 인자로 받는 useCallback
    (PART 3.7) 직접 참조 — per-item 인라인 화살표는 이 컴포넌트 내부로 이동.
    deps(editDraft 등) 불변 재렌더(AI 스트리밍·우측 패널 갱신)에서 memo bail-out 활성. */
const SuggBlock = memo(function SuggBlock({
  sugg,
  color,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
}: {
  sugg: ProactiveSuggestion;
  color: "amber" | "blue";
  acceptLabel: string;
  rejectLabel: string;
  onAccept: (s: ProactiveSuggestion) => void;
  onReject: (s: ProactiveSuggestion) => void;
}) {
  // priority/category 기반 표시 라인: actionHint(있으면) + message
  const lines = [sugg.message, sugg.actionHint].filter((s): s is string => Boolean(s && s.trim()));

  return (
    // S6 a11y — AI 제안 도착을 스크린리더에 비간섭 통지 (polite·기능 변화 0)
    <div className={"wr-sugg " + color} role="status" aria-live="polite">
      <div className="wr-sugg-body">
        {lines.map((line, i) => (
          <div key={i} className="wr-line-row">
            <span className="wr-n">{sugg.priority === "critical" ? "!" : "·"}</span>
            <span className="wr-t">{line}</span>
          </div>
        ))}
      </div>
      <div className="wr-sugg-actions">
        <button type="button" className="mini-btn ok" onClick={() => onAccept(sugg)}>
          <Check size={14} />
          {acceptLabel}
        </button>
        <button type="button" className="mini-btn no" onClick={() => onReject(sugg)}>
          <X size={14} />
          {rejectLabel}
        </button>
      </div>
    </div>
  );
});

// ============================================================
// PART 2.5 — S7 위젯 (WritingStatsStrip + ContextRefCard)
//
// WritingStatsStrip (접이식 하단 위젯 — 데스크톱 page.tsx WritingStatsStrip 이식):
//   - 산식 = analyzeText / computeCPM (writing-stats.ts 순수 함수 — 발명 0)
//   - top bar 자수 3단위(공백포함/제외/음절)와 중복 표기 금지 — 보완 지표만
//     (문장 수·평균 문장 길이·대사 비율·반복어 비율·CPM)
//   - editDraft 기반·useMemo 1개 — 키스트로크당 선형 스캔 1회
//   - CPM 은 mount(=세션·회차 key) 후 첫 비공백 관찰 시점 baseline — 회차 전환 시
//     호출부 key 로 remount (타 원고 속도 혼입 차단)
//
// ContextRefCard (AI 주입 컨텍스트 미리보기 — 우측 패널 접이식):
//   - 실제 주입 소스만 (날조 금지): generateStoryStream 에 전달되는 config 중
//     ⓐ 세계관 17 필드 (engine/pipeline.ts buildSystemInstruction L860-880 주입 조건과 1:1)
//     ⓑ 캐릭터 스마트 주입 (activeCharacters 선택 시 그 집합 / 미선택 시 상위 20 — L480-488 동일)
//     ⓒ 회차 (config.episode / totalEpisodes — L1171 동일)
//   - 미리보기 텍스트 = buildContextBlock (context-block.ts 재사용) — '주입 소스 요약'
//     라벨 명시 (프롬프트 원문 아님 — Story Bible·이전 회차 요약은 생성 시점 추가 주입·정직 표기)
// ============================================================

/** S7 — 집필 통계 스트립. 표시 전용 (advisory) — 어떤 동작도 차단하지 않음. */
const WritingStatsStrip = memo(function WritingStatsStrip({
  text,
  language,
}: {
  text: string;
  language: AppLanguage;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // 산식 = analyzeText 그대로 (chars 는 top bar 와 중복이라 표시하지 않음)
  const stats = useMemo(() => analyzeText(text), [text]);
  // CPM — 데스크톱 WritingStatsStrip 과 동일 측정: 첫 비공백 관찰 baseline 대비 증가분/경과시간
  const startRef = useRef<{ t: number; chars: number } | null>(null);
  const [cpm, setCpm] = useState(0);
  useEffect(() => {
    if (!startRef.current && text.length > 0) startRef.current = { t: Date.now(), chars: text.length };
    if (startRef.current) {
      const delta = text.length - startRef.current.chars;
      setCpm(computeCPM(Math.max(0, delta), Date.now() - startRef.current.t));
    }
  }, [text]);

  return (
    <div style={{ margin: "8px 28px 0" }}>
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={L4(language, {
          ko: "집필 통계 스트립 접기/펼치기",
          en: "Collapse or expand the writing stats strip",
        })}
        title={L4(language, {
          ko: "판단용 보완 지표 — 속도(자/분)는 이 회차 편집 시작 이후 평균",
          en: "Advisory metrics — speed (chars/min) is the average since editing this episode began",
        })}
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "transparent",
          color: "var(--c-sub, #888)",
          fontSize: 11.5,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Clock size={13} />
        <span style={{ fontWeight: 600 }}>{L4(language, { ko: "집필 통계", en: "Writing stats" })}</span>
        {!collapsed && (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {L4(language, {
              ko: `문장 ${stats.sentences.toLocaleString()} · 평균 ${stats.avgLen}자 · 대사 ${stats.dialoguePct}% · 반복 ${stats.repetitionPct}% · 속도 ${cpm}자/분`,
              en: `${stats.sentences.toLocaleString()} sentences · avg ${stats.avgLen} · dialogue ${stats.dialoguePct}% · repetition ${stats.repetitionPct}% · ${cpm} cpm`,
            })}
          </span>
        )}
        <Chevron
          size={13}
          style={{ marginLeft: "auto", flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : undefined }}
        />
      </button>
    </div>
  );
});

/** S7 — 세계관 17 필드 (engine/pipeline.ts buildSystemInstruction 주입 목록과 1:1 — 추가/누락 금지) */
const CONTEXT_WORLD_FIELDS: ReadonlyArray<{ key: string; ko: string; en: string }> = [
  { key: "corePremise", ko: "핵심 전제", en: "Core premise" },
  { key: "powerStructure", ko: "권력 구조", en: "Power structure" },
  { key: "currentConflict", ko: "현재 갈등", en: "Current conflict" },
  { key: "worldHistory", ko: "역사", en: "History" },
  { key: "magicTechSystem", ko: "마법/기술 체계", en: "Magic / tech system" },
  { key: "socialSystem", ko: "사회 시스템", en: "Social system" },
  { key: "factionRelations", ko: "종족/세력 관계", en: "Faction relations" },
  { key: "economy", ko: "경제/생활", en: "Economy / livelihood" },
  { key: "survivalEnvironment", ko: "생존 환경", en: "Survival environment" },
  { key: "culture", ko: "문화", en: "Culture" },
  { key: "religion", ko: "종교/신화", en: "Religion / mythology" },
  { key: "education", ko: "교육", en: "Education" },
  { key: "lawOrder", ko: "법/질서", en: "Law & order" },
  { key: "taboo", ko: "금기/규범", en: "Taboo / norms" },
  { key: "travelComm", ko: "이동/통신", en: "Travel / communication" },
  { key: "truthVsBeliefs", ko: "믿음 vs 진실", en: "Beliefs vs truth" },
  { key: "dailyLife", ko: "일상", en: "Daily life" },
];

/** S7 — 캐릭터 스마트 주입 상한 (engine/pipeline.ts MAX_CHARACTERS 와 동일 값) */
const CONTEXT_MAX_CHARACTERS = 20;

/** S7 — AI 주입 컨텍스트 미리보기 카드 (우측 패널·접이식·기본 접힘). */
const ContextRefCard = memo(function ContextRefCard({
  config,
  language,
}: {
  config: StoryConfig;
  language: AppLanguage;
}) {
  const [open, setOpen] = useState(false);

  const ctx = useMemo(() => {
    const cfg = config as unknown as Record<string, unknown>;
    // ⓐ 세계관 — pipeline 과 동일한 truthy 주입 조건 (빈 문자열/미설정 = 미주입)
    const worldLabel = L4(language, { ko: "세계관", en: "World" });
    const worldItems: ContextItem[] = [];
    for (const f of CONTEXT_WORLD_FIELDS) {
      const v = cfg[f.key];
      if (typeof v === "string" && v) {
        worldItems.push({ tab: "world", label: worldLabel, fact: L4(language, { ko: f.ko, en: f.en }), details: v });
      }
    }
    // ⓑ 캐릭터 — pipeline 스마트 주입 동일 산식 (activeCharacters 선택 집합 / 폴백 상위 20)
    const chars = config.characters ?? [];
    const activeNames = new Set(config.sceneDirection?.activeCharacters ?? []);
    const injectedChars =
      activeNames.size > 0
        ? chars.filter((c) => activeNames.has(c.name)).slice(0, CONTEXT_MAX_CHARACTERS)
        : chars.slice(0, CONTEXT_MAX_CHARACTERS);
    const charLabel = L4(language, { ko: "캐릭터", en: "Characters" });
    const charItems: ContextItem[] = injectedChars.map((c) => ({
      tab: "character",
      label: charLabel,
      fact: `${c.name} (${c.role})`,
      details: "",
    }));
    // ⓒ 회차 — config.episode / totalEpisodes (시스템 프롬프트에 그대로 주입됨)
    const episodeItems: ContextItem[] = [
      {
        tab: "writing",
        label: L4(language, { ko: "회차", en: "Episode" }),
        fact: `EP ${config.episode}${config.totalEpisodes ? ` / ${config.totalEpisodes}` : ""}`,
        details: "",
      },
    ];
    return {
      worldCount: worldItems.length,
      injectedCharCount: injectedChars.length,
      totalCharCount: chars.length,
      preview: buildContextBlock([...worldItems, ...charItems, ...episodeItems]),
    };
  }, [config, language]);

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Eye size={15} />
        {L4(language, { ko: "AI 주입 컨텍스트", en: "AI context preview" })}
        <button
          type="button"
          className="mini-btn"
          style={{ marginLeft: "auto" }}
          aria-expanded={open}
          aria-label={L4(language, {
            ko: "AI 주입 컨텍스트 미리보기 접기/펼치기",
            en: "Expand or collapse the AI context preview",
          })}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? L4(language, { ko: "접기", en: "Collapse" })
            : L4(language, { ko: "펼치기", en: "Expand" })}
        </button>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "세계관 필드", en: "World fields" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.worldCount} / {CONTEXT_WORLD_FIELDS.length}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "캐릭터 주입", en: "Characters injected" })}
        <b style={{ marginLeft: "auto" }}>
          {L4(language, {
            ko: `${ctx.injectedCharCount}명 / 총 ${ctx.totalCharCount}명`,
            en: `${ctx.injectedCharCount} of ${ctx.totalCharCount}`,
          })}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "회차", en: "Episode" })}
        <b style={{ marginLeft: "auto" }}>
          EP {config.episode}
          {config.totalEpisodes ? ` / ${config.totalEpisodes}` : ""}
        </b>
      </div>
      {open && (
        <>
          <pre
            style={{
              maxHeight: 220,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "var(--c-sub, #888)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 8,
              margin: "8px 0 0",
              background: "transparent",
            }}
          >
            {ctx.preview}
          </pre>
          {/* 정직 표기 — 이 카드는 주입 '소스 요약'. Story Bible·이전 회차 요약은 생성 시점에 추가 주입 */}
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
            {L4(language, {
              ko: "주입 소스 요약 — 프롬프트 원문 아님 · Story Bible·이전 회차 요약은 생성 시점 추가",
              en: "Source summary — not the literal prompt · Story Bible and prior-episode recap are added at generation time",
            })}
          </div>
        </>
      )}
    </div>
  );
});

// ============================================================
// PART 3 — TabWriting (셸: 센터 원고 + 우측 컨트롤 패널)
// ============================================================

export default function TabWriting() {
  const {
    currentSession,
    editDraft,
    setEditDraft,
    editDraftRef,
    suggestions,
    setSuggestions,
    directorReport,
    lastReport,
    pipelineResult,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
    saveFlash,
    lastSaveTime,
    createNewSession,
    input,
    setInput,
    handleSend,
    isGenerating,
    handleCancel,
    hasAiAccess,
    setShowApiKeyModal,
    // ── S4 (전부 StudioContextValue 기존 노출 — 신규 context 필드 0) ──
    setConfig,
    handleNextEpisode,
    handleRegenerate,
    tokenUsage,
    generationTime,
    filteredMessages,
    // ── S6 i18n — 표시 언어 (기존 context 노출값·신규 필드 0) ──
    language,
    // ── F4 — model picker 가 READ (기존 context 노출값·신규 필드 0) ──
    hostedProviders,
  } = useStudio();

  // 새 셸 탭 전환 — 구 context setActiveTab(AppTab) 은 새 6탭 셸에서 무반응.
  const { setActiveTab: setLoreguardTab } = useLoreguardTab();

  const [restoring, setRestoring] = useState<number | null>(null);

  // ── S6 i18n — S4/S5 표시 문자열 (언어 변경 시에만 재산출·키·동작 무변경).
  //    hooks: 빈 상태 early return *앞* 고정 (Rules of Hooks). ──
  const S4_STR = useMemo(() => buildS4Str(language), [language]);
  const S5_STR = useMemo(() => buildS5Str(language), [language]);

  // ── S1 안전 UX 상태 (useEffect 는 PART 4 import 구문에서 이미 들어옴 — 중복 import 금지) ──

  /** UNDO 1-STEP — 파괴적 변경(제안 삽입) 직전 본문 스냅샷 1개.
      순수 editDraft 레벨 (신규 저장소 X) — 되돌리기 클릭 시 현재 본문과 맞바꿈(토글).
      sessionId·episode 바인딩: 찍힌 세션·회차에서만 유효 (stale 본문 주입 차단). */
  const lastSnapshotRef = useRef<{
    text: string;
    label: string;
    at: number;
    sessionId: string;
    episode: number | null;
  } | null>(null);
  /** 스냅샷 존재 여부·라벨 — 되돌리기 버튼 렌더 트리거 (ref 만으로는 재렌더 X) */
  const [snapshotMeta, setSnapshotMeta] = useState<{ label: string; at: number } | null>(null);

  /** SNAPSHOT SESSION BINDING — 세션 또는 회차가 바뀌면 스냅샷은 다른 원고의 텍스트.
      검색 팔레트 세션 전환·버전 복원(setProjects + setCurrentSessionId) 모두 여기로 들어옴 →
      무조건 폐기 (cross-session 본문 주입 → 잘못된 세션 manuscripts 디바운스 저장 차단).
      마운트 시 1회 실행은 무해 (이미 null). 클릭 경쟁은 undoSnapshot 내 가드가 이중 차단. */
  const snapshotSessionId = currentSession?.id ?? null;
  const snapshotEpisode = currentSession?.config?.episode ?? null;
  useEffect(() => {
    lastSnapshotRef.current = null;
    setSnapshotMeta(null);
  }, [snapshotSessionId, snapshotEpisode]);

  /** RESTORE CONFIRM — 1클릭 = arm(해당 timestamp), 확인 클릭 = 실행. 5초 후 자동 해제. */
  const [armedRestore, setArmedRestore] = useState<number | null>(null);
  useEffect(() => {
    if (armedRestore == null) return;
    const t = window.setTimeout(() => setArmedRestore(null), 5000);
    return () => window.clearTimeout(t);
  }, [armedRestore]);

  /** CANCEL CONFIRM — 생성 중단도 동일 arm-confirm. 5초 자동 해제 + 생성 자연 종료 시 해제. */
  const [armedCancel, setArmedCancel] = useState(false);
  useEffect(() => {
    if (!armedCancel) return;
    if (!isGenerating) {
      setArmedCancel(false);
      return;
    }
    const t = window.setTimeout(() => setArmedCancel(false), 5000);
    return () => window.clearTimeout(t);
  }, [armedCancel, isGenerating]);

  // ── S4 — AI 결과 strip 상태 (완료 경계 감지·NEW 완료만 표시) ──

  /** S4 — 완료된 AI 생성 결과 (strip 표시 대상). null = strip 미표시.
      content 는 완료 시점 고정 사본 — 이후 메시지 편집/재생성과 분리. */
  const [aiResult, setAiResult] = useState<{ msgId: string; content: string } | null>(null);
  const [aiResultExpanded, setAiResultExpanded] = useState(false);
  /** S4 — 마지막으로 strip 처리한 완료 (id+content) — 같은 완료의 중복 표시 차단.
      재생성은 id 동일·content 상이 → 새 완료로 인정 (strip 재표시). */
  const lastHandledAiMsgRef = useRef<{ id: string; content: string } | null>(null);
  /** S4 — isGenerating 직전값 (true→false 전이 = 완료 경계 검출) */
  const prevGeneratingRef = useRef(false);
  /** S4 — 생성 시작 시점의 귀속 대상 (세션·회차) — 생성 중 전환 시 결과를 새 위치에 오귀속 차단 */
  const genTargetRef = useRef<{ sessionId: string | null; episode: number | null } | null>(null);
  /** S4 — 사용자가 직접 중단(handleCancel)한 생성 — 폐기 약속대로 strip 미표시 (1회성 플래그) */
  const cancelledByUserRef = useRef(false);

  /** S4 — 생성 시작/완료 경계 감지. 시작 경계: 귀속 대상 고정.
      완료 경계: 최신 assistant 메시지(비공백)를 NEW 완료로 strip 에 게시.
      스트리밍 중 filteredMessages 변경 재실행은 전이 가드로 전부 no-op. */
  useEffect(() => {
    const was = prevGeneratingRef.current;
    prevGeneratingRef.current = isGenerating;
    if (isGenerating && !was) {
      genTargetRef.current = { sessionId: snapshotSessionId, episode: snapshotEpisode };
      return;
    }
    if (!isGenerating && was) {
      const cancelled = cancelledByUserRef.current;
      cancelledByUserRef.current = false;
      if (cancelled) return; // 사용자 중단 — "진행된 내용은 폐기됩니다" 약속 준수
      const target = genTargetRef.current;
      genTargetRef.current = null;
      // 생성 중 세션/회차 전환 — 결과는 원래 세션 messages 에 있음 (여기 strip 으로 오귀속 금지)
      if (!target || target.sessionId !== snapshotSessionId || target.episode !== snapshotEpisode) return;
      let latest: Message | null = null;
      for (let i = filteredMessages.length - 1; i >= 0; i--) {
        const m = filteredMessages[i];
        if (m.role === "assistant" && m.content.trim()) {
          latest = m;
          break;
        }
      }
      if (!latest) return; // 실패/빈 완료 — 표시할 결과 없음 (에러는 셸 uxError 가 표면화)
      const handled = lastHandledAiMsgRef.current;
      if (handled && handled.id === latest.id && handled.content === latest.content) return;
      lastHandledAiMsgRef.current = { id: latest.id, content: latest.content };
      setAiResult({ msgId: latest.id, content: latest.content });
      setAiResultExpanded(false);
    }
  }, [isGenerating, filteredMessages, snapshotSessionId, snapshotEpisode]);

  /** S4 — 세션·회차 전환 시 strip 폐기 (S1 스냅샷 폐기와 동일 원칙 — 타 원고 텍스트 주입 차단) */
  useEffect(() => {
    setAiResult(null);
    setAiResultExpanded(false);
    lastHandledAiMsgRef.current = null;
  }, [snapshotSessionId, snapshotEpisode]);

  /** HUGE-PASTE GUARD — 100,000자 초과 붙여넣기 감지 플래그.
      onPaste(값 변경 전)에서 세우고, 직후 onChange 1회의 setEditDraft 만 startTransition 으로 감쌈.
      붙여넣기 자체는 차단/절단하지 않음 (네이티브 paste·undo 스택 보존). */
  const hugePasteRef = useRef(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  useEffect(() => {
    if (!pasteNotice) return;
    const t = window.setTimeout(() => setPasteNotice(false), 6000);
    return () => window.clearTimeout(t);
  }, [pasteNotice]);

  /** COMPOSITION TRACKING — S2 타이핑 로거가 읽을 예정 (S1 에서는 동작 변화 0).
      ⚠ 이 ref 로 setEditDraft 를 gate 하지 않는다 — IME 조합 중에도 onChange 는 그대로 흐른다. */
  const isComposingRef = useRef(false);

  // ============================================================
  // QB-tabwriting-ide (2) — 본문 undo/redo 링버퍼 (editDraft 메모리 히스토리)
  //
  // 별개 레이어 정책:
  //   - undo/redo = *메모리* 히스토리 (이 탭 생명주기). 영속 X.
  //   - useAutoVersionSnapshot(±300자/5분)·StudioShell 자동저장 = *영속* 레이어 — 무접촉.
  //   - 두 레이어는 충돌하지 않음: undo 는 editDraft 값만 스왑(부모 set 경로 경유),
  //     자동저장은 그 결과 editDraft 를 평소대로 디바운스 저장한다.
  //
  // 동작:
  //   - editDraft 변경을 watch → 디바운스(400ms) 그룹핑으로 스냅샷 1개 push (ring, 상한 100).
  //   - 직접 타이핑·AI 삽입·제안 삽입·찾기바꾸기·S1 되돌리기 등 *모든* editDraft 변화가
  //     동일 watch 로 들어와 일관되게 히스토리에 쌓인다 (단일 경로).
  //   - Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo. textarea 네이티브 undo 는
  //     preventDefault 로 가로채 메모리 히스토리로 일원화 (네이티브와 이중 스택 혼선 차단).
  //   - undo/redo 로 인한 setEditDraft 는 isApplyingHistoryRef 로 표식 → watch 가
  //     그 변화를 새 히스토리로 재push 하지 않음 (무한 누적·redo 소실 방지).
  //   - 세션/회차 전환 시 히스토리 전체 리셋 (다른 문서 오염 금지 — S1 폐기 원칙 공유).
  // ============================================================

  const HISTORY_LIMIT = 100;
  /** 과거 스냅샷 스택 (가장 오래된 → 직전). 현재 editDraft 는 여기에 없음 (적용 시 push). */
  const undoStackRef = useRef<string[]>([]);
  /** redo 스택 (undo 로 빠져나온 미래 상태들) */
  const redoStackRef = useRef<string[]>([]);
  /** 마지막으로 히스토리에 반영(또는 적용)한 editDraft 값 — 디바운스 그룹 baseline */
  const historyBaseRef = useRef<string>(editDraft);
  /** undo/redo 적용으로 인한 setEditDraft 표식 — watch 의 재push 억제 (1회성) */
  const isApplyingHistoryRef = useRef(false);
  /**
   * [cross-episode 오염 수리 2026-06-11] 세션/회차 전환 후 *처음 도착하는* editDraft 변화는
   * 사용자 편집이 아니라 새 문서 본문 적재다(StudioShell setEditDraft 가 config commit 다음
   * commit 에 발화 → reset effect 가 baseline 을 stale OLD 로 박은 뒤 NEW 가 도착). 이 1건을
   * push 하면 직전 회차 본문이 현재 회차 undo 스택에 들어가 Ctrl+Z 시 엉뚱한 회차 본문이 주입된다.
   * reset effect 가 이 표식을 세우고, watch 가 *최초 1회* 변화를 baseline 으로만 흡수(push 금지)한다.
   */
  const suppressNextDeltaRef = useRef(false);
  /** 디바운스 타이머 */
  const historyTimerRef = useRef<number | null>(null);
  /** 버튼 enable 렌더용 카운트 (ref 만으로는 재렌더 X) */
  const [historyVer, setHistoryVer] = useState(0);

  /** 직전 base 를 undo 스택에 push (상한 초과 시 가장 오래된 것 drop) + redo 비움. */
  const pushHistorySnapshot = useCallback((prevText: string) => {
    const stack = undoStackRef.current;
    if (stack.length > 0 && stack[stack.length - 1] === prevText) return; // 동일 연속 push 방지
    stack.push(prevText);
    if (stack.length > HISTORY_LIMIT) stack.shift();
    redoStackRef.current = []; // 새 편집 분기 → redo 무효
    setHistoryVer((v) => v + 1);
  }, []);

  /** editDraft watch — 디바운스 그룹핑으로 변화 1건을 히스토리에 반영.
      적용(undo/redo) 유래 변화는 표식으로 무시 (baseline 만 동기화). */
  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      // undo/redo 가 만든 변화 — baseline 만 맞추고 push 안 함 (표식 소거)
      isApplyingHistoryRef.current = false;
      historyBaseRef.current = editDraft;
      return;
    }
    if (suppressNextDeltaRef.current) {
      // [cross-episode 오염 수리] 회차/세션 전환 후 최초 도착한 본문 — 사용자 편집이 아니라
      // 새 문서 적재. baseline 만 NEW 로 흡수하고 push 안 함 (직전 회차 본문의 undo 스택 오염 차단).
      suppressNextDeltaRef.current = false;
      historyBaseRef.current = editDraft;
      return;
    }
    if (editDraft === historyBaseRef.current) return;
    if (historyTimerRef.current != null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      const prev = historyBaseRef.current;
      if (editDraft !== prev) {
        pushHistorySnapshot(prev);
        historyBaseRef.current = editDraft;
      }
    }, 400);
    return () => {
      if (historyTimerRef.current != null) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
    };
  }, [editDraft, pushHistorySnapshot]);

  /** 세션/회차 전환 → 히스토리 전체 리셋 (다른 문서 오염 금지). snapshotSessionId/Episode 는 위에서 선언됨. */
  useEffect(() => {
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    undoStackRef.current = [];
    redoStackRef.current = [];
    historyBaseRef.current = editDraft;
    isApplyingHistoryRef.current = false;
    // [cross-episode 오염 수리 2026-06-11] StudioShell 의 setEditDraft(NEW) 는 config commit
    // *다음* commit 에 발화한다. 이 effect 시점 editDraft 는 아직 직전(OLD) 회차 본문이므로
    // baseline=OLD 로 박힌다. 표식을 세워 watch 가 NEW 도착(최초 변화)을 push 하지 않고
    // baseline 으로만 흡수하게 한다 → 직전 회차 본문이 현재 회차 undo 스택에 들어가는 경로 차단.
    suppressNextDeltaRef.current = true;
    setHistoryVer((v) => v + 1);
    // editDraft 는 의도적으로 deps 제외 — 세션/회차 전환 시점의 본문으로 baseline 만 재설정
    // (타이핑마다 리셋 금지). 전환 effect 전용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotSessionId, snapshotEpisode]);

  /** undo — 직전 펜딩 그룹 flush 후 undo 스택 top 으로 스왑. 현재 값은 redo 로. */
  const doUndo = useCallback(() => {
    // 펜딩 디바운스 그룹이 있으면 먼저 확정 (가장 최근 타이핑이 한 단계로 잡히게)
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      const prev = historyBaseRef.current;
      if (editDraft !== prev) {
        pushHistorySnapshot(prev);
        historyBaseRef.current = editDraft;
      }
    }
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const target = stack.pop() as string;
    redoStackRef.current.push(editDraft);
    historyBaseRef.current = target;
    // 동일값 스왑(중복 상태)이면 setEditDraft 가 재렌더를 안 일으켜 watch 가 안 돌므로
    // 표식을 세우지 않는다 (flag leak → 다음 실제 편집 swallow 방지).
    if (target !== editDraft) {
      isApplyingHistoryRef.current = true;
      setEditDraft(target);
    }
    setHistoryVer((v) => v + 1);
  }, [editDraft, pushHistorySnapshot, setEditDraft]);

  /** redo — redo 스택 top 으로 스왑. 현재 값은 undo 로 복귀. */
  const doRedo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const target = stack.pop() as string;
    undoStackRef.current.push(editDraft);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    historyBaseRef.current = target;
    if (target !== editDraft) {
      isApplyingHistoryRef.current = true;
      setEditDraft(target);
    }
    setHistoryVer((v) => v + 1);
  }, [editDraft, setEditDraft]);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  // historyVer 참조로 enable 상태 재계산 트리거 (canUndo/canRedo 는 ref 길이 — render-time 평가)
  void historyVer;

  // ============================================================
  // QB-tabwriting-ide (1) — 찾기·바꾸기 바 토글 (Ctrl+H 또는 상단 버튼)
  // ============================================================

  const [findOpen, setFindOpen] = useState(false);

  /** 찾기·바꾸기 결과 본문을 기존 set 경로로 일원화 (undo 링버퍼 watch 가 자동 히스토리화). */
  const applyFindReplace = useCallback(
    (next: string) => {
      setEditDraft(next);
    },
    [setEditDraft],
  );

  // ============================================================
  // QB-tabwriting-ide (1)(2) — 에디터 키보드: Ctrl+H(찾기바꾸기)·Ctrl+Z/Ctrl+Shift+Z·Ctrl+Y
  //
  // textarea onKeyDown 한정 (window 전역 X — 다른 입력/StudioShell Ctrl+Shift+H 와 무충돌).
  // ⚠ StudioShell 의 전역 Ctrl+Shift+H(이름 변경)는 shiftKey 필수 → 여기 Ctrl+H(!shift)와 분리.
  // ============================================================
  const onEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      // 찾기·바꾸기 토글 — Ctrl+H (Shift 없음 — 전역 Ctrl+Shift+H 이름변경과 분리)
      if (k === "h" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setFindOpen((v) => !v);
        return;
      }
      // undo — Ctrl+Z (Shift 없음). 네이티브 textarea undo 가로채 메모리 히스토리로 일원화.
      if (k === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        doUndo();
        return;
      }
      // redo — Ctrl+Shift+Z 또는 Ctrl+Y
      if ((k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey)) {
        e.preventDefault();
        doRedo();
        return;
      }
    },
    [doUndo, doRedo],
  );

  // ============================================================
  // QB-tabwriting-ide (3) — 아웃라인 진입: OutlineBinder 가 발신하는
  // 'loreguard:navigate-scene' (detail {episode, sceneId?}) 수신 → 해당 회차로 이동.
  //
  // 회차 이동 경로 재사용: 기존 setConfig((prev)=>({...prev, episode})) 경로 (S4 goPrev/goNext
  // 와 동일). 별도 회차 이동 CustomEvent 가 없으므로 setConfig 직접 사용 (명세 폴백 조항).
  // sceneId 는 현재 본문 내 씬 분할 모델이 없어 회차 단위 이동까지만 처리 (정직 — 씬 단위
  // 캐럿 점프는 본문 구조가 씬 마커를 갖출 때 확장. 날조 금지). listener cleanup 필수.
  // ============================================================
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { episode?: unknown; sceneId?: unknown } | undefined;
      const ep = detail?.episode;
      if (typeof ep !== "number" || !Number.isFinite(ep) || ep < 1) return;
      setConfig((prev) => (prev.episode === ep ? prev : { ...prev, episode: Math.floor(ep) }));
    };
    window.addEventListener("loreguard:navigate-scene", onNavigate);
    return () => window.removeEventListener("loreguard:navigate-scene", onNavigate);
  }, [setConfig]);

  /** 원고함/출고(export) 패널 열기 — export-panel 이 이 이벤트를 수신. */
  const openExport = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-export"));
  }, []);

  /** 문체 스튜디오 패널 열기 — StyleStudioPanel(PART 5)이 이 이벤트를 수신. */
  const openStyle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-style"));
  }, []);

  /** S3 — 창작 과정 확인서 패널 열기 — CpJournalPanel(sibling 파일)이 이 이벤트를 수신. */
  const openCp = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-cp"));
  }, []);

  /** S8 — 퇴고 패널 열기 — RevisionPanel(sibling 파일·B 에이전트 소유)이 이 이벤트를 수신. */
  const openRevision = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-revision"));
  }, []);

  /** Z1d — IP 자산화 패널 열기 — IpAssetPanel(sibling 파일·Z1b 소유)이 이 이벤트를 수신. */
  const openIpAsset = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-ipasset"));
  }, []);

  // ============================================================
  // F4 — 통일 composer v1 (기존 생성바 확장 — 재설계 X·본문 침범 X)
  //
  // (a) model picker: ModelPickerInline (ComposerExtras) — provider 결정은
  //     생성 경로(streamChat 의 getActiveProvider/getActiveModel)와 동일 함수.
  //     선택 = noa-lg-model 영속 + setActiveModel write-through → 다음
  //     handleSend 의 generateStoryStream→streamChat 이 그대로 사용.
  // (b) @멘션: 소스 = 실제 config 만 (캐릭터 이름·값 있는 세계관 필드·회차 번호).
  //     선택 시 입력에 '@라벨 ' 삽입. 제출 시 입력에 실재하는 멘션만
  //     buildMentionContextBlock 으로 명시 주입 — handleSend(customPrompt) 경유,
  //     기존 프롬프트 빌드(basePrompt 꼬리 text — useStudioAI L383)에 additive.
  //     키보드: ↑↓ 순환·Enter 선택·Escape 닫기(+동일 토큰 재오픈 억제)·Tab 닫기.
  //     a11y: combobox/listbox + aria-activedescendant.
  // (c) 본문 폰트: useWritingFontMode (noa-lg-wr-font) → 에디터 .wr-doc 의
  //     data-font → loreguard.css 변수 3종. 표시 전용 — 저장/생성 무접촉.
  // ============================================================

  /** F4 (c) — 본문 글꼴 모드 (기본/명조/고정폭) — noa-lg-wr-font 영속 */
  const [fontMode, setFontMode] = useWritingFontMode();

  /** F4 (b) — 생성바 입력 ref (멘션 caret 제어 전용 — editDraftRef 와 별개) */
  const genInputRef = useRef<HTMLInputElement | null>(null);
  /** F4 (b) — 열린 멘션 토큰 (start = '@' 인덱스). null = 닫힘 */
  const [mentionState, setMentionState] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  /** F4 (b) — Escape 로 닫은 토큰의 start — 같은 토큰 입력 중 재오픈 억제 */
  const mentionSuppressRef = useRef<number | null>(null);
  /** F4 (b) — 멘션 삽입 후 caret 복원 rAF — unmount 시 취소 (leak 방지) */
  const mentionCaretRafRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (mentionCaretRafRef.current != null) cancelAnimationFrame(mentionCaretRafRef.current);
    },
    [],
  );
  const mentionListboxId = useId();

  /** F4 (b) — 멘션 소스 (실데이터만·세션 없으면 빈 배열 — 드롭다운 자체가 안 열림) */
  const mentionItems = useMemo<MentionItem[]>(
    () =>
      currentSession?.config
        ? buildMentionItems(currentSession.config, CONTEXT_WORLD_FIELDS, language)
        : [],
    [currentSession?.config, language],
  );

  const mentionFiltered = useMemo(
    () => (mentionState ? filterMentionItems(mentionItems, mentionState.query) : []),
    [mentionState, mentionItems],
  );
  const mentionOpen = mentionState != null && mentionFiltered.length > 0;
  const mentionActiveIdx = Math.min(mentionIndex, Math.max(0, mentionFiltered.length - 1));

  /** F4 (b) — 마지막으로 열린 토큰 start (새 토큰 진입 시 active index 리셋용 — updater 순수성 보존) */
  const mentionLastStartRef = useRef<number | null>(null);

  /** F4 (b) — 입력 변경 시 caret 기준 '@query' 재검출 (결정적·이메일류 중간 @ 제외) */
  const updateMention = useCallback((el: HTMLInputElement) => {
    const caret = el.selectionStart ?? el.value.length;
    const det = detectMentionQuery(el.value, caret);
    if (!det || mentionSuppressRef.current === det.start) {
      if (det == null) mentionSuppressRef.current = null; // 토큰 소멸 → 억제 해제
      mentionLastStartRef.current = null;
      setMentionState(null);
      return;
    }
    if (mentionLastStartRef.current !== det.start) setMentionIndex(0); // 새 토큰 → 첫 항목
    mentionLastStartRef.current = det.start;
    setMentionState(det);
  }, []);

  /** F4 (b) — 멘션 선택: '@query' → '@라벨 ' 치환 + caret 복원 (포커스는 입력 유지) */
  const selectMention = useCallback(
    (item: MentionItem) => {
      const el = genInputRef.current;
      const st = mentionState;
      if (!el || !st) return;
      const caret = el.selectionStart ?? input.length;
      const applied = applyMention(input, caret, st.start, item);
      setInput(applied.next);
      setMentionState(null);
      setMentionIndex(0);
      mentionSuppressRef.current = null;
      mentionLastStartRef.current = null;
      if (mentionCaretRafRef.current != null) cancelAnimationFrame(mentionCaretRafRef.current);
      mentionCaretRafRef.current = requestAnimationFrame(() => {
        mentionCaretRafRef.current = null;
        el.focus();
        try {
          el.setSelectionRange(applied.caret, applied.caret);
        } catch {
          /* 일부 브라우저 미지원 — caret 끝 폴백 (기능 영향 없음) */
        }
      });
    },
    [mentionState, input, setInput],
  );

  /**
   * AI 생성 (집필 핵심 액션) — handleSend 가 input 을 읽고 비운다 (실 엔진 스트리밍).
   * 키 없는 사용자는 silent failure 대신 실제 API 키 모달.
   * F4 (b) — 입력에 실재하는 @멘션이 있으면 컨텍스트 블록을 붙여
   * handleSend(customPrompt) 로 전달 (additive — input 비우기 동작 동일).
   */
  const submitGenerate = useCallback(() => {
    if (isGenerating) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    if (!input.trim()) return;
    setMentionState(null);
    const mentionBlock = buildMentionContextBlock(input, mentionItems, language);
    if (mentionBlock) {
      handleSend(input.replace(/\s+$/, "") + mentionBlock);
    } else {
      handleSend();
    }
  }, [isGenerating, hasAiAccess, setShowApiKeyModal, input, handleSend, mentionItems, language]);

  // ============================================================
  // PART 3.5 — S2 창작 과정 확인서 기록 (creative event recording)
  //
  // 기록 지도 (user action → log call) — 유지보수자용:
  //   ① 본문 타이핑 (editDraft 변경 → 800ms idle + |Δlen| ≥ 20자)
  //        → logHumanEdit (beforeContent 有 → HUMAN_REVISION / 빈 본문 첫 작성 → HUMAN_DRAFT)
  //   ② AI 제안 '본문 삽입' (acceptSuggestion)
  //        → logAcceptAI (AI_SUGGESTION·provider 'loreguard-ai')
  //          + 베이스라인 전진 — AI 삽입분이 ①에서 '타이핑'으로 재계상되는 것 차단
  //   ③ 탭 unmount → ①의 디바운스 잔여분 flush (동일 ≥20자 규칙·IME 조합 중이면 skip)
  //   ✕ AI 생성/재생성은 이 탭이 기록하지 않는다 (loop 1 REPAIR — 이중 계상 차단):
  //        useStudioAI 가 성공 경계에서 직접 recordCreativeEvent 한다 — handleSend → AI_DRAFT
  //        (useStudioAI.ts ~L561) / handleRegenerate → AI_REWRITE (~L864). 셸 모드 무관·무조건.
  //        과거 §③(isGenerating true→false + lastReport 교체 감지 → logAIDraft)은 ⓐ 같은 생성을
  //        두 번째 AI_DRAFT 로 중복 기록하고(recordCreativeEvent 는 append-only), ⓑ regenerate /
  //        Cmd-팔레트 생성의 동일 전이까지 오인해 phantom AI_DRAFT 를 추가(AI_REWRITE 와 이중
  //        + origin 오귀속) — '1 생성 = 1 AI 이벤트' 위반이라 제거됨. 재도입 금지: 재도입하려면
  //        useStudioAI 내부 AI 기록을 셸 모드별로 gate 하는 suppress 플래그가 선행돼야 한다.
  //
  // dedup (HCI 무결성 — 상업 포인트):
  //   ⓐ 인간 편집: StudioShell 의 'noa:version-snapshot-saved' piggyback logHumanEdit(≥300자/5분)은
  //      children(새 셸) 모드에서 미등록 (StudioShell PART 2 dedup gate 참조).
  //      같은 인간 편집이 두 granularity 로 찍히면 HCI 분자(weight 1.0 이벤트)가 이중 계상됨.
  //   ⓑ AI 이벤트(AI_DRAFT/AI_REWRITE): 기록 주체 = useStudioAI 엔진 단 한 곳 (위 ✕ 참조)
  //      — 이 탭의 logAIDraft 호출 금지 (1 생성 = 1 AI 이벤트·HCI 분모 무결성).
  //   useCreativeProcessAutoTrigger 는 character/world/scene signature 만 추적 — 본문과 무중복.
  //
  // 안전:
  //   - fire-and-forget — setEditDraft/onChange 경로를 절대 await/gate 하지 않음 (타이핑 무지연)
  //   - IME 조합 중(isComposingRef) 기록 보류 → compositionend 후 재시도 (300ms 재확인)
  //   - 실패(reject 또는 null resolve — logger 는 내부 catch 후 null 반환) → noa:alert 1회·60s 쿨다운
  //   - currentSession null 시 전부 no-op (snapshotSessionId null 가드)
  // ============================================================

  /** S2 — manuscript targetId (회차 기준 — 회차 미설정 세션은 'draft') */
  const manuscriptTargetId = snapshotEpisode != null ? String(snapshotEpisode) : "draft";

  /** S2 — 마지막 기록(베이스라인) 본문. 세션·회차 바인딩 (cross-session 오기록 차단 — S1 스냅샷과 동일 원칙) */
  const lastLoggedRef = useRef<{ text: string; sessionId: string; episode: number | null } | null>(null);
  const humanEditTimerRef = useRef<number | null>(null);
  /** S2 — 기록 실패 noa:alert 마지막 발화 시각 (60s 재알림 쿨다운) */
  const logAlertAtRef = useRef(0);

  /** S2 — 기록 실패 표면화 1회 (60s 쿨다운 — per-keystroke 스팸 금지, silent failure 금지) */
  const surfaceLogFailure = useCallback(() => {
    const now = Date.now();
    if (now - logAlertAtRef.current < 60_000) return;
    logAlertAtRef.current = now;
    try {
      window.dispatchEvent(
        new CustomEvent("noa:alert", {
          detail: {
            message: L4(language, {
              ko: "창작 과정 기록 실패 — 확인서 정확도에 영향",
              en: "Failed to record creative process — journal accuracy may be affected",
            }),
            variant: "warning",
          },
        }),
      );
    } catch {
      /* noop */
    }
  }, [language]);

  /** S2 — fire-and-forget 래퍼. logger 부재 / reject / null resolve(기록 미수행) → 실패 표면화.
      주의: useCreativeEventLogger 는 내부 catch 후 null 을 resolve 한다 — null = 기록 안 됨
      (projectId 미바인딩 no-op 포함 — 그 경우에도 확인서에 안 쌓이는 건 사실이므로 정직하게 알림). */
  const fireLog = useCallback(
    (p: Promise<string | null> | null | undefined) => {
      if (!p) {
        surfaceLogFailure();
        return;
      }
      p.then((id) => {
        if (id === null) surfaceLogFailure();
      }).catch(() => surfaceLogFailure());
    },
    [surfaceLogFailure],
  );

  /** S2 ①의 커밋 — |Δlen| ≥ 20자일 때만 logHumanEdit 1건 + 베이스라인 전진.
      길이 차는 proxy — 동일 길이 치환 편집은 길이가 벌어질 때까지 미계상 (보수 규칙·과대계상 방지).
      베이스라인 세션·회차 불일치 시 no-op (전환 직후 stale 기록 차단). */
  const commitHumanEditIfDue = useCallback(
    (next: string) => {
      const base = lastLoggedRef.current;
      if (!base || !snapshotSessionId) return;
      if (base.sessionId !== snapshotSessionId || base.episode !== snapshotEpisode) return;
      if (next === base.text) return;
      if (Math.abs(next.length - base.text.length) < 20) return;
      lastLoggedRef.current = { text: next, sessionId: base.sessionId, episode: base.episode };
      fireLog(
        getLogger()?.logHumanEdit({
          targetType: "manuscript",
          targetId: manuscriptTargetId,
          episodeId: snapshotEpisode ?? undefined,
          // 빈 본문 첫 작성: beforeContent undefined → logger 가 HUMAN_DRAFT('create')로 분기
          beforeContent: base.text || undefined,
          afterContent: next,
          note: "TabWriting S2 fine-grained edit",
        }),
      );
    },
    [snapshotSessionId, snapshotEpisode, manuscriptTargetId, fireLog],
  );

  /** S2 ① 본문 타이핑 → logHumanEdit. 800ms micro-debounce — StudioShell 의 2s manuscripts
      자동저장 디바운스와 별개. IME 조합 중이면 300ms 간격 재확인 (compositionend 후 기록). */
  useEffect(() => {
    if (!snapshotSessionId) return;
    const base = lastLoggedRef.current;
    // 첫 관찰 · 세션/회차 전환 → 베이스라인 재설정만 (로드된 본문을 '타이핑'으로 오기록 금지)
    if (!base || base.sessionId !== snapshotSessionId || base.episode !== snapshotEpisode) {
      lastLoggedRef.current = { text: editDraft, sessionId: snapshotSessionId, episode: snapshotEpisode };
      return;
    }
    if (editDraft === base.text) return;
    const arm = (delay: number) => {
      humanEditTimerRef.current = window.setTimeout(() => {
        humanEditTimerRef.current = null;
        if (isComposingRef.current) {
          arm(300); // IME 조합 중 — 끝난 뒤 기록 (S1 규약: 이 ref 로 setEditDraft 는 gate 안 함)
          return;
        }
        commitHumanEditIfDue(editDraft);
      }, delay);
    };
    arm(800);
    return () => {
      if (humanEditTimerRef.current != null) {
        window.clearTimeout(humanEditTimerRef.current);
        humanEditTimerRef.current = null;
      }
    };
  }, [editDraft, snapshotSessionId, snapshotEpisode, commitHumanEditIfDue]);

  /** S2 ③ — unmount flush. 최신 클로저를 매 render 후 ref 에 갱신 (render 중 ref write 회피),
      [] effect 의 cleanup 이 마지막 디바운스 잔여분을 동일 ≥20자 규칙으로 커밋. */
  const flushHumanEditRef = useRef<() => void>(() => {});
  useEffect(() => {
    flushHumanEditRef.current = () => {
      if (!isComposingRef.current) commitHumanEditIfDue(editDraft);
    };
  });
  useEffect(() => () => flushHumanEditRef.current(), []);

  // ============================================================
  // PART 3.6 — S5 판단용 집필 지표 (advisory writing metrics)
  //
  // 강제성 정책 (BareWrite S5):
  //   - 표시만 한다 — 어떤 임계도 저장/생성/회차 전환을 차단하지 않음 (자동 수정/회귀 X).
  //   - 결정적 산식만 (regex/count) — AI 자가 측정·날조 지표 금지.
  //   - '주어' 검출이 아님 — 결정적으로 가능한 '첫 어절 일치'만 측정 (정직한 라벨,
  //     형태소 분석 엔진 부재 — 기능 가장 금지).
  // perf: editDraft 의존 useMemo 단 1개 — 키스트로크당 선형 스캔 1회 (10k+ 자 안전).
  //       null-session 시에도 editDraft 는 string — 빈 본문 = 전 지표 0 (안전).
  // hooks: 아래 빈 상태 early return *앞* 고정 (Rules of Hooks — 위치 이동 금지).
  // ============================================================

  /** S5 — 자가 점검 카드 접힘 상태 (기본 접힘 — 우측 패널 공간 보존) */
  const [selfCheckOpen, setSelfCheckOpen] = useState(false);

  /** S5 — 판단용 지표 일괄 산출 — 단일 useMemo([editDraft])·전 산식 결정적·선형 */
  const writingMetrics = useMemo(() => {
    const text = editDraft;
    // 자수 3단위 — 기준 단위 = 공백 포함 (BareWrite chg_145 표준)
    const withSpace = text.length;
    const noSpace = text.replace(/\s/g, "").length;
    let syllables = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c >= HANGUL_SYL_START && c <= HANGUL_SYL_END) syllables++;
    }
    // (a)(b) 종결 패턴 — 라인 말미 anchored 카운트 (산식 = 명세 regex 그대로)
    const declarativeEndings = (text.match(RE_DECLARATIVE_END) ?? []).length;
    const explanatoryEndings = (text.match(RE_EXPLANATORY_END) ?? []).length;
    // (c) 연속 동일 어절 시작 — 인접 문장 쌍의 첫 어절(선두 부호 strip) 일치 수
    let repeatedStartPairs = 0;
    let prevFirst: string | null = null;
    for (const raw of text.split(RE_SENTENCE_BOUNDARY)) {
      const s = raw.trim();
      if (!s) continue;
      const ws = s.search(RE_FIRST_WS);
      const first = (ws === -1 ? s : s.slice(0, ws)).replace(RE_LEADING_PUNCT, "");
      if (!first) {
        prevFirst = null; // 부호만 남은 토큰 — 빈 문자열끼리의 공허 일치 계상 차단
        continue;
      }
      if (prevFirst !== null && first === prevFirst) repeatedStartPairs++;
      prevFirst = first;
    }
    return { withSpace, noSpace, syllables, declarativeEndings, explanatoryEndings, repeatedStartPairs };
  }, [editDraft]);

  // ============================================================
  // PART 3.7 — UNDO 스냅샷 + 제안 수락/거절 (Z1d — useCallback 안정화)
  //
  // 구 위치(early return 아래)의 plain 함수를 useCallback 으로 승급 — SuggBlock(memo)
  // 에 안정 참조로 전달해 deps 불변 재렌더(AI 스트리밍·우측 패널 갱신)에서 bail-out.
  // 동작 불변: 본문은 구 함수와 동일·deps 에 editDraft 포함 (S1 규약 "이벤트 시점
  // 클로저 값 = 최신값" 유지). hooks 라 빈 상태 early return *앞* 고정 (위치 이동 금지).
  // currentSession null 가드: 구 위치는 early return 이 보장 — 여기서는 명시 가드
  // (세션 없으면 호출 UI 자체가 미렌더 → 실호출 경로 없음·가드는 방어 전용).
  // ============================================================

  /** UNDO 1-STEP — 파괴적 변경 직전 현재 본문 스냅샷 (editDraft 레벨·신규 저장소 X).
      deps[editDraft] — 이벤트 시점 클로저 값 = 최신값 (구 plain 함수와 동일 의미).
      현재 세션 id·회차를 함께 박음 — 다른 세션/회차에서는 undo 무효 (주입 차단). */
  const takeSnapshot = useCallback(
    (label: string) => {
      if (!currentSession) return; // 방어 가드 — 호출 UI 는 early return 뒤에만 렌더
      const at = Date.now();
      lastSnapshotRef.current = {
        text: editDraft,
        label,
        at,
        sessionId: currentSession.id,
        episode: currentSession.config?.episode ?? null,
      };
      setSnapshotMeta({ label, at });
    },
    [currentSession, editDraft],
  );

  /** 수락 → 제안 본문을 원고 끝에 삽입 + 해당 제안 dismiss (삽입 직전 UNDO 스냅샷)
      S2 ② — 채택 1건 = logAcceptAI(AI_SUGGESTION) 1건.
      순서: ⓐ 미계상 인간 타이핑 잔여분 flush (채택 이벤트에 swallow 방지) →
            ⓑ 삽입 → ⓒ 베이스라인을 삽입 결과로 전진 (AI 삽입분이 ① logHumanEdit 로
            재계상되는 것 차단 — 한 delta 는 한 이벤트로만). nextDraft 는 setEditDraft
            updater 와 동일 식 — deps[editDraft] 클로저 = 최신값 (S1 규약 동일). */
  const acceptSuggestion = useCallback(
    (s: ProactiveSuggestion) => {
      const insert = s.actionHint?.trim() || s.message?.trim() || "";
      if (insert) {
        takeSnapshot(L4(language, { ko: "제안 삽입 전", en: "Before suggestion insert" }));
        commitHumanEditIfDue(editDraft);
        const nextDraft = editDraft ? editDraft.replace(/\s*$/, "") + "\n" + insert : insert;
        setEditDraft((prev) => (prev ? prev.replace(/\s*$/, "") + "\n" + insert : insert));
        if (snapshotSessionId) {
          lastLoggedRef.current = { text: nextDraft, sessionId: snapshotSessionId, episode: snapshotEpisode };
        }
        fireLog(
          getLogger()?.logAcceptAI({
            targetType: "manuscript",
            targetId: manuscriptTargetId,
            episodeId: snapshotEpisode ?? undefined,
            afterContent: nextDraft,
            provider: "loreguard-ai",
          }),
        );
      }
      setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, dismissed: true, dismissCount: x.dismissCount + 1 } : x)));
    },
    [
      language,
      editDraft,
      snapshotSessionId,
      snapshotEpisode,
      manuscriptTargetId,
      takeSnapshot,
      commitHumanEditIfDue,
      fireLog,
      setEditDraft,
      setSuggestions,
    ],
  );

  /** 거절 → dismiss only (setter 만 — 전 렌더 안정 참조) */
  const rejectSuggestion = useCallback(
    (s: ProactiveSuggestion) => {
      setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, dismissed: true, dismissCount: x.dismissCount + 1 } : x)));
    },
    [setSuggestions],
  );

  // ----- 빈 상태: 세션 없음 → 프로젝트 생성 유도 -----
  if (!currentSession) {
    return (
      <div className="wr-grid">
        <section className="wr-center" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <div className="wr-title" style={{ marginBottom: 8 }}>
              {L4(language, { ko: "집필 모드", en: "Writing Mode" })}
            </div>
            <p style={{ color: "var(--c-sub, #888)", fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
              {L4(language, { ko: "아직 작업 중인 작품이 없습니다.", en: "No work in progress yet." })}<br />
              {L4(language, {
                ko: "새 작품을 만들면 여기에서 원고를 집필할 수 있습니다.",
                en: "Create a new work to start writing your manuscript here.",
              })}
            </p>
            <button
              type="button"
              className="btn primary"
              style={{ justifyContent: "center" }}
              onClick={() => createNewSession("writing")}
            >
              <Plus size={15} />
              {L4(language, { ko: "새 작품 시작", en: "Start a new work" })}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // currentSession 확정 → config 안전 추출
  const config = currentSession.config;

  // ----- 라이브 자수 — S5 writingMetrics (공백 포함/제외/음절 — PART 3.6 단일 useMemo) -----

  // ----- 메타 칩: config 실데이터에서 (없는 값은 칩 자체를 생략) -----
  // S4 — '회차'는 일반 칩에서 분리, prev/next 내비 칩으로 렌더 (아래 epNow 블록)
  const metaChips: Array<[string, string]> = [];
  if (config?.title) metaChips.push([L4(language, { ko: "제목", en: "Title" }), config.title]);
  if (config?.genre) metaChips.push([L4(language, { ko: "장르", en: "Genre" }), String(config.genre)]);
  if (config?.povCharacter) metaChips.push([L4(language, { ko: "시점", en: "POV" }), config.povCharacter]);
  if (config?.setting) metaChips.push([L4(language, { ko: "배경", en: "Setting" }), config.setting]);
  if (config?.primaryEmotion) metaChips.push([L4(language, { ko: "정서", en: "Emotion" }), config.primaryEmotion]);

  // ----- AI 제안 (suggestions[] — dismissed 제외) -----
  const activeSuggestions = suggestions.filter((s) => !s.dismissed);

  // priority → 색상 (디자인 팔레트 amber/blue 한정)
  const suggColor = (s: ProactiveSuggestion): "amber" | "blue" =>
    s.priority === "info" ? "blue" : "amber";

  // takeSnapshot / acceptSuggestion / rejectSuggestion → PART 3.7 (early return 앞
  // useCallback — Z1d 콜백 안정화). 동작 동일·위치만 이동 (Rules of Hooks).

  /** 되돌리기 — 스냅샷 본문과 현재 본문을 맞바꿈 (다시 누르면 원위치 — 1단계 토글).
      가드: 스냅샷의 sessionId·episode 가 현재와 다르면 no-op + 폐기
      (세션 전환 effect 가 커밋되기 전 클릭 경쟁 등 — stale 본문 setEditDraft 절대 금지).
      S2 — undo 는 이미 계상된 본문의 복원(스왑)이지 새 창작이 아님 → 기록 베이스라인만
      전진시켜 ① logHumanEdit 가 스왑 delta 를 인간 편집으로 재계상하지 않게 한다. */
  const undoSnapshot = () => {
    const snap = lastSnapshotRef.current;
    if (!snap) return;
    if (snap.sessionId !== currentSession.id || snap.episode !== (config?.episode ?? null)) {
      lastSnapshotRef.current = null;
      setSnapshotMeta(null);
      return;
    }
    const at = Date.now();
    commitHumanEditIfDue(editDraft); // 스왑 전 미계상 타이핑 잔여분 flush (swallow 방지)
    lastSnapshotRef.current = {
      text: editDraft,
      label: snap.label,
      at,
      sessionId: currentSession.id,
      episode: config?.episode ?? null,
    };
    setEditDraft(snap.text);
    if (snapshotSessionId) {
      lastLoggedRef.current = { text: snap.text, sessionId: snapshotSessionId, episode: snapshotEpisode };
    }
    setSnapshotMeta({ label: snap.label, at });
  };

  // ============================================================
  // S4 — AI 결과 삽입 / 재생성 / 회차 내비 (파생값 + 핸들러)
  // ============================================================

  // ----- 최신 assistant 메시지 (재생성 대상·"마지막 AI 결과 존재" 판정) -----
  let latestAssistantMsg: Message | null = null;
  for (let i = filteredMessages.length - 1; i >= 0; i--) {
    const m = filteredMessages[i];
    if (m.role === "assistant" && m.content.trim()) {
      latestAssistantMsg = m;
      break;
    }
  }

  /** S4 — AI 생성 결과를 원고 끝에 삽입.
      acceptSuggestion 과 **동일 시퀀스** (S2 무결성 — 한 delta 는 한 이벤트):
      ⓐ takeSnapshot (UNDO 1-step) → ⓑ 미계상 인간 타이핑 잔여분 flush →
      ⓒ 삽입 → ⓓ 베이스라인을 삽입 결과로 전진 (AI 삽입분이 logHumanEdit 로
      재계상 차단) → ⓔ logAcceptAI (AI_SUGGESTION·provider 'loreguard-ai').
      AI_DRAFT/AI_REWRITE 는 useStudioAI 가 생성 시점에 이미 기록 — 여기서 추가 기록 금지. */
  const insertAiResult = () => {
    if (!aiResult) return;
    const insert = aiResult.content.trim();
    if (!insert) {
      setAiResult(null);
      return;
    }
    takeSnapshot(S4_STR.aiInsertSnapshotLabel);
    commitHumanEditIfDue(editDraft);
    const nextDraft = editDraft ? editDraft.replace(/\s*$/, "") + "\n" + insert : insert;
    setEditDraft((prev) => (prev ? prev.replace(/\s*$/, "") + "\n" + insert : insert));
    if (snapshotSessionId) {
      lastLoggedRef.current = { text: nextDraft, sessionId: snapshotSessionId, episode: snapshotEpisode };
    }
    fireLog(
      getLogger()?.logAcceptAI({
        targetType: "manuscript",
        targetId: manuscriptTargetId,
        episodeId: snapshotEpisode ?? undefined,
        afterContent: nextDraft,
        provider: "loreguard-ai",
      }),
    );
    setAiResult(null); // 삽입 후 strip 폐기 — lastHandledAiMsgRef 가 재표시 차단
  };

  /** S4 — [무시] = strip dismiss only (lastHandledAiMsgRef 유지 — 같은 완료 재표시 X) */
  const dismissAiResult = () => setAiResult(null);

  /** S4 — 재생성 — 엔진 handleRegenerate 가 AI_REWRITE 기록·버전 보존까지 담당 (재사용·신규 기록 X) */
  const regenerateLatest = () => {
    if (isGenerating || !latestAssistantMsg) return;
    void handleRegenerate(latestAssistantMsg.id);
  };

  // ----- 회차 내비 파생값 -----
  const epNow = config?.episode ?? null;
  const epTotal = config?.totalEpisodes ?? null;
  const hasNextManuscript =
    epNow != null && (config?.manuscripts ?? []).some((m) => m.episode === epNow + 1);
  const canPrevEpisode = epNow != null && epNow > 1;
  // next: 기존 원고 있으면 항상 이동 가능 / 없으면 handleNextEpisode 경로 (totalEpisodes 상한)
  const canNextEpisode = epNow != null && (hasNextManuscript || epTotal == null || epNow < epTotal);

  /** S4 — 이전 회차. pending 초안 flush 는 StudioShell prevDraftTargetRef effect 가
      episode 변경 감지로 이전 회차 자리에 수행 (S1 — 여기서 중복 flush 금지). */
  const goPrevEpisode = () => {
    if (!canPrevEpisode) return;
    setConfig((prev) => ({ ...prev, episode: Math.max(1, prev.episode - 1) }));
  };

  /** S4 — 다음 회차. manuscripts 에 다음 회차 존재 → 단순 이동 /
      미존재 → handleNextEpisode (현 초안을 현 회차에 저장 + episode+1·totalEpisodes 상한 + 요약 백그라운드). */
  const goNextEpisode = () => {
    if (!canNextEpisode) return;
    if (hasNextManuscript) {
      setConfig((prev) => ({ ...prev, episode: prev.episode + 1 }));
    } else {
      handleNextEpisode();
    }
  };

  // ----- AI 결과 strip 미리보기 (접힘 시) -----
  const aiResultNeedsToggle = (aiResult?.content.length ?? 0) > S4_PREVIEW_LEN;
  const aiResultPreview =
    aiResult && aiResultNeedsToggle
      ? aiResult.content.slice(0, S4_PREVIEW_LEN).trimEnd() + "…"
      : aiResult?.content ?? "";

  // ----- 오염 방지 요약: directorReport.findings 를 kind 별 집계 -----
  const findings = directorReport?.findings ?? [];
  const findingByKind = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});
  const contaminationRows = Object.entries(findingByKind);
  const directorScore = directorReport?.score ?? null;

  // ----- 합성 로그: lastReport.issues (있으면) -----
  const logIssues = lastReport?.issues ?? [];

  // ----- Synthesis Queue: pipelineResult.stages -----
  const stages = pipelineResult?.stages ?? [];
  const stageLabel: Record<string, [string, string, string]> = {
    // stage → [en 고정 헤더, 표시 언어 설명줄(S6 i18n), avatar]
    world_check: ["World Check", L4(language, { ko: "세계관 검증", en: "Worldbuilding consistency" }), "W"],
    character_sync: ["Character Sync", L4(language, { ko: "캐릭터 동기화", en: "Character continuity" }), "C"],
    direction_setup: ["Direction", L4(language, { ko: "연출 구성", en: "Scene direction setup" }), "D"],
    generation: ["Generation", L4(language, { ko: "본문 생성", en: "Prose generation" }), "G"],
  };
  const stageStatusColor = (status: string): "green" | "amber" =>
    status === "passed" ? "green" : "amber";
  const stageStatusLabel: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    passed: "Approved",
    failed: "Failed",
    skipped: "Skipped",
  };

  // ----- 버전 스냅샷 (versionedBackups) -----
  const backups = versionedBackups ?? [];
  /** 복원 실행 — arm-confirm 의 '확인' 에서만 호출 (1클릭 직행 금지).
      복원 전 UNDO 스냅샷은 만들지 않음 — 복원은 전체 프로젝트 대체 + 세션 전환
      (useProjectManager.doRestoreVersionedBackup → setProjects + setCurrentSessionId)이라
      세션 바인딩 정리 effect 가 스냅샷을 즉시 폐기함 (죽은 의도 제거 —
      본문 되돌리기는 같은 세션·회차 안의 제안 삽입에만 제공). */
  const restoreBackup = async (timestamp: number) => {
    if (!doRestoreVersionedBackup) return;
    setArmedRestore(null);
    setRestoring(timestamp);
    try {
      await doRestoreVersionedBackup(timestamp);
    } finally {
      // S2 — 복원은 본문 전체 대체(인간 타이핑 아님). 세션 id 가 우연히 동일해도
      // ① logHumanEdit 가 대체 delta 를 계상하지 않게 베이스라인 강제 무효화
      // (다음 watcher 실행이 현재 본문으로 재설정만 한다 — 기록 0건).
      lastLoggedRef.current = null;
      setRestoring(null);
    }
  };

  return (
    <div className="wr-grid">
      {/* QB-tabwriting-ide (3) — 좌측 아웃라인 바인더 (다른 owner 소유·dynamic import).
          props = 현재 config·회차·언어 (early return 뒤라 config 확정). OutlineBinder 가
          'loreguard:navigate-scene' 를 발신 → 위 PART 3.8 listener 가 회차 이동. */}
      <OutlineBinder config={config} currentEpisode={epNow} language={language} />

      {/* center — 집필 모드 + 원고 */}
      <section className="wr-center">
        <div className="wr-top">
          <div className="wr-title">{L4(language, { ko: "집필 모드", en: "Writing Mode" })}</div>
          <div className="wr-top-r">
            {/* F4 (c) — 본문 글꼴 3-state (기본/명조/고정폭). 표시 전용 — 저장/생성 무접촉.
                한글 명조 = Noto Serif KR (Cormorant 는 라틴 전용 — 본문 적용 금지 판단) */}
            <FontModeToggle mode={fontMode} onChange={setFontMode} language={language} />
            {/* S5 — 자수 3단위 (기준 = 공백 포함·chg_145). 표시 전용 — 어떤 동작도 차단 X */}
            <span className="wr-count">
              {writingMetrics.withSpace.toLocaleString()}
              {S5_STR.charUnit} · {S5_STR.noSpaceLabel} {writingMetrics.noSpace.toLocaleString()} ·{" "}
              {S5_STR.syllableLabel} {writingMetrics.syllables.toLocaleString()}
            </span>
            {/* S5 — M 규격 참고 pill (중립 안내 전용 — 미달/초과 색·경보·차단 없음) */}
            <span className="pill gray" title={S5_STR.mSpecTitle}>
              {S5_STR.mSpecPill}
            </span>
            {/* QB-tabwriting-ide (2) — 본문 undo/redo (메모리 링버퍼·Ctrl+Z / Ctrl+Shift+Z·Ctrl+Y).
                S1 '되돌리기'(제안 삽입 1-step 스왑)와 별개 — 이쪽은 전 편집 히스토리. */}
            <button
              type="button"
              className="mini-btn wr-act"
              aria-label={L4(language, { ko: "실행 취소 (Ctrl+Z)", en: "Undo (Ctrl+Z)" })}
              title={L4(language, { ko: "실행 취소 (Ctrl+Z)", en: "Undo (Ctrl+Z)" })}
              disabled={!canUndo}
              onClick={doUndo}
            >
              <ChevronL size={13} />
              {L4(language, { ko: "취소", en: "Undo" })}
            </button>
            <button
              type="button"
              className="mini-btn wr-act"
              aria-label={L4(language, { ko: "다시 실행 (Ctrl+Shift+Z)", en: "Redo (Ctrl+Shift+Z)" })}
              title={L4(language, { ko: "다시 실행 (Ctrl+Shift+Z / Ctrl+Y)", en: "Redo (Ctrl+Shift+Z / Ctrl+Y)" })}
              disabled={!canRedo}
              onClick={doRedo}
            >
              <ChevronR size={13} />
              {L4(language, { ko: "다시", en: "Redo" })}
            </button>
            {/* QB-tabwriting-ide (1) — 찾기·바꾸기 바 토글 (Ctrl+H 또는 이 버튼) */}
            <button
              type="button"
              className={"mini-btn wr-act" + (findOpen ? " ok" : "")}
              aria-label={L4(language, { ko: "찾기·바꾸기 (Ctrl+H)", en: "Find and replace (Ctrl+H)" })}
              aria-pressed={findOpen}
              title={L4(language, { ko: "찾기·바꾸기 (Ctrl+H)", en: "Find and replace (Ctrl+H)" })}
              onClick={() => setFindOpen((v) => !v)}
            >
              <Search size={13} />
              {L4(language, { ko: "찾기", en: "Find" })}
            </button>
            {saveFlash ? (
              <span className="pill blue">
                <Sync size={12} />
                {L4(language, { ko: "저장 중…", en: "Saving…" })}
              </span>
            ) : lastSaveTime ? (
              <span className="pill green">
                <Check size={12} />
                {L4(language, { ko: "자동 저장됨", en: "Auto-saved" })}
              </span>
            ) : null}
            {/* UNDO 1-STEP — 스냅샷 존재 시에만 노출. 클릭 시 스냅샷↔현재 본문 맞바꿈(토글). */}
            {snapshotMeta && (
              <button
                type="button"
                className="mini-btn wr-act"
                aria-label={L4(language, {
                  ko: `되돌리기 — ${snapshotMeta.label} 본문과 맞바꾸기`,
                  en: `Undo — swap with the "${snapshotMeta.label}" draft`,
                })}
                title={L4(language, {
                  ko: `되돌리기 — ${snapshotMeta.label}`,
                  en: `Undo — ${snapshotMeta.label}`,
                })}
                onClick={undoSnapshot}
              >
                <Sync size={13} />
                {L4(language, { ko: "되돌리기", en: "Undo" })}
              </button>
            )}
            {/* 문체 스튜디오 — 기존 StyleTab(구 셸 'style' 탭)을 slide-over 로 mount (PART 5).
                currentSession null 이면 이 top bar 자체가 렌더되지 않음 (위 빈 상태 early return). */}
            <button type="button" className="btn wr-act" onClick={openStyle}>
              <Pen size={15} />
              {L4(language, { ko: "문체", en: "Style" })}
            </button>
            {/* S8 — 퇴고 패널 (RevisionPanel — sibling 파일이 'loreguard:open-revision' 수신) */}
            <button
              type="button"
              className="btn wr-act"
              aria-label={L4(language, { ko: "퇴고 패널 열기", en: "Open the revision panel" })}
              onClick={openRevision}
            >
              <EditIcon size={15} />
              {L4(language, { ko: "퇴고", en: "Revise" })}
            </button>
            {/* S3 — 창작 과정 확인서 (기여도·출처·투고 패키지 + 발급). CpJournalPanel 이 수신.
                early return 뒤에만 렌더 — 패널의 currentSession 가드와 gating 일치. */}
            <button
              type="button"
              className="btn wr-act"
              aria-label={L4(language, { ko: "창작 과정 확인서 패널 열기", en: "Open the Authorship Journal panel" })}
              onClick={openCp}
            >
              <Scroll size={15} />
              {L4(language, { ko: "확인서", en: "Journal" })}
            </button>
            {/* Z1d — IP 자산화 (준비도·바이블·패키지). IpAssetPanel(Z1b 파일)이 수신.
                early return 뒤에만 렌더 — 패널의 세션 가드와 gating 일치 (확인서 버튼과 동일 원칙). */}
            <button
              type="button"
              className="btn wr-act"
              aria-label={L4(language, { ko: "IP 자산화 패널 열기", en: "Open the IP assets panel" })}
              onClick={openIpAsset}
            >
              <Layers size={15} />
              {L4(language, { ko: "IP 자산화", en: "IP Assets" })}
            </button>
            {/* 전체 화면 → 탭 내 원고함/출고 패널 (export-panel 이 이벤트 수신).
                구 '설정' Dots 버튼은 새 셸에 실제 타깃이 없어 제거 (dead control 금지). */}
            <button
              type="button"
              className="eh-icbtn"
              aria-label={L4(language, { ko: "원고함 전체 화면", en: "Manuscript library full view" })}
              title={L4(language, { ko: "원고함 전체 화면", en: "Manuscript library full view" })}
              onClick={openExport}
            >
              <Expand size={17} />
            </button>
          </div>
        </div>

        {(metaChips.length > 0 || epNow != null) && (
          <div className="wr-metas">
            {/* S4 — 회차 내비 칩: ‹ 회차 N › (prev = episode-1·≥1 / next = 기존 원고 이동 or handleNextEpisode) */}
            {epNow != null && (
              <span className="wr-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="mini-btn"
                  aria-label={S4_STR.prevEpisodeAria}
                  title={S4_STR.prevEpisodeAria}
                  disabled={!canPrevEpisode}
                  onClick={goPrevEpisode}
                  style={{ padding: "0 4px" }}
                >
                  <ChevronL size={12} />
                </button>
                <b>{S4_STR.episodeLabel}</b> : {epNow}
                {epTotal != null ? ` / ${epTotal}` : ""}
                <button
                  type="button"
                  className="mini-btn"
                  aria-label={S4_STR.nextEpisodeAria}
                  title={S4_STR.nextEpisodeAria}
                  disabled={!canNextEpisode}
                  onClick={goNextEpisode}
                  style={{ padding: "0 4px" }}
                >
                  <ChevronR size={12} />
                </button>
              </span>
            )}
            {metaChips.map(([key, value]) => (
              <span key={key} className="wr-chip">
                <b>{key}</b> : {value}
              </span>
            ))}
          </div>
        )}

        {/* AI 제안 블록 (suggestions) — 본문 위 */}
        {activeSuggestions.length > 0 && (
          <div className="wr-doc" style={{ paddingBottom: 0 }}>
            {activeSuggestions.map((s) => (
              <SuggBlock
                key={s.id}
                sugg={s}
                color={suggColor(s)}
                acceptLabel={L4(language, { ko: "본문 삽입", en: "Insert into draft" })}
                rejectLabel={L4(language, { ko: "거절", en: "Dismiss" })}
                onAccept={acceptSuggestion}
                onReject={rejectSuggestion}
              />
            ))}
          </div>
        )}

        {/* HUGE-PASTE 알림 — 비차단 (붙여넣기는 그대로 진행, 안내만) */}
        {pasteNotice && (
          <div className="wr-doc" style={{ paddingBottom: 0 }}>
            <div className="wr-srow" role="status" aria-live="polite">
              <span className="rdot amber" />
              {L4(language, {
                ko: "대용량 붙여넣기 감지 — 저장에 시간이 걸릴 수 있습니다",
                en: "Large paste detected — saving may take a moment",
              })}
            </div>
          </div>
        )}

        {/* QB-tabwriting-ide (1) — 찾기·바꾸기 바 (Ctrl+H 또는 상단 버튼 토글).
            대상 = editDraft textarea·바꾼 결과는 applyFindReplace(=setEditDraft) 경유로
            undo 링버퍼와 정합. Escape 닫기·일치 수 실시간·다음/이전·전체 바꾸기·aria. */}
        {findOpen && (
          <FindReplaceBar
            text={editDraft}
            textareaRef={editDraftRef}
            onReplace={applyFindReplace}
            onClose={() => setFindOpen(false)}
            language={language}
          />
        )}

        {/* 실제 원고 에디터 — editDraft 바인딩 (StudioShell 디바운스 자동저장).
            F4 (c) — data-font: loreguard.css 의 .wr-doc[data-font] 변수 3종이 적용되고
            textarea 는 font:inherit 라 부모 font-family 를 그대로 상속 (스타일 변경 0). */}
        <div className="wr-doc" data-font={fontMode} style={{ flex: 1, display: "flex" }}>
          <textarea
            ref={editDraftRef}
            className="wr-editor"
            aria-label={L4(language, { ko: "원고 본문 편집", en: "Edit manuscript body" })}
            value={editDraft}
            onKeyDown={onEditorKeyDown}
            onChange={(e) => {
              // ⚠ IME 조합 중에도 무조건 실행 — isComposingRef 로 gate 금지 (타이핑 유실 방지).
              //   디바운스(StudioShell)가 키 입력을 이미 합치므로 별도 가드 불필요.
              const next = e.target.value;
              if (hugePasteRef.current) {
                // HUGE-PASTE — 이 1회의 상태 반영만 transition (paste 차단/절단 X)
                hugePasteRef.current = false;
                startTransition(() => setEditDraft(next));
              } else {
                setEditDraft(next);
              }
            }}
            onPaste={(e) => {
              // onPaste 는 값 변경 전에 발화 → 플래그만 세우고 네이티브 paste 는 그대로 둠
              const text = e.clipboardData?.getData("text") ?? "";
              if (text.length > 100_000) {
                hugePasteRef.current = true;
                setPasteNotice(true);
              }
            }}
            onCompositionStart={() => {
              // S2 타이핑 로거 전용 추적 — setEditDraft gate 에 사용 금지 (동작 변화 0)
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            placeholder={L4(language, { ko: "여기에 이야기를 써 내려가세요…", en: "Write your story here…" })}
            spellCheck={false}
            style={{
              flex: 1,
              width: "100%",
              minHeight: 360,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              lineHeight: 1.9,
            }}
          />
        </div>

        {/* S7 — 집필 통계 스트립 (접이식 하단 위젯 — analyzeText/computeCPM 재사용).
            top bar 자수 3단위와 중복 없는 보완 지표만. key = 세션·회차 — 전환 시
            remount 로 CPM baseline 폐기 (타 원고 속도 혼입 차단·S1 폐기 원칙 공유). */}
        <WritingStatsStrip
          key={`${snapshotSessionId ?? "none"}:${snapshotEpisode ?? "draft"}`}
          text={editDraft}
          language={language}
        />

        {/* S4 — AI 결과 strip: NEW 완료만 (완료 경계 effect). 접힘 미리보기 + 펼치기.
            [원고에 삽입] = acceptSuggestion 동일 시퀀스 / [무시] = dismiss.
            세션·회차 전환 시 자동 폐기 — stale 본문 주입 차단 (S1 원칙 공유). */}
        {aiResult && (
          <div className="wr-doc" style={{ paddingBottom: 0 }}>
            <div className="wr-sugg blue" role="status" aria-live="polite" aria-label={S4_STR.aiResultTitle}>
              <div className="wr-sugg-body">
                <div className="wr-line-row">
                  <span className="wr-n">{S4_STR.aiResultBadge}</span>
                  <span
                    className="wr-t"
                    style={
                      aiResultExpanded
                        ? { whiteSpace: "pre-wrap", maxHeight: 280, overflowY: "auto", display: "block" }
                        : undefined
                    }
                  >
                    {aiResultExpanded ? aiResult.content : aiResultPreview}
                  </span>
                </div>
              </div>
              <div className="wr-sugg-actions">
                {aiResultNeedsToggle && (
                  <button
                    type="button"
                    className="mini-btn"
                    aria-expanded={aiResultExpanded}
                    aria-label={aiResultExpanded ? S4_STR.collapseResult : S4_STR.expandResult}
                    onClick={() => setAiResultExpanded((v) => !v)}
                  >
                    {aiResultExpanded ? S4_STR.collapseResult : S4_STR.expandResult}
                  </button>
                )}
                <button
                  type="button"
                  className="mini-btn ok"
                  aria-label={`${S4_STR.aiResultTitle} — ${S4_STR.insertToDraft}`}
                  onClick={insertAiResult}
                >
                  <Check size={14} />
                  {S4_STR.insertToDraft}
                </button>
                <button
                  type="button"
                  className="mini-btn no"
                  aria-label={`${S4_STR.aiResultTitle} — ${S4_STR.dismissResult}`}
                  onClick={dismissAiResult}
                >
                  <X size={14} />
                  {S4_STR.dismissResult}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* S4 — 토큰 미터(실 tokenUsage 존재 시에만·근사치 그대로 표시) + 재생성 (엔진 AI_REWRITE) */}
        {(tokenUsage || latestAssistantMsg) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 28px 0" }}>
            {tokenUsage && (
              <span className="pill gray" aria-label={S4_STR.tokenMeterAria}>
                {tokenUsage.used.toLocaleString()} / {tokenUsage.budget.toLocaleString()} {S4_STR.tokenUnit}
                {generationTime != null ? ` · ${generationTime}${S4_STR.secondsUnit}` : ""}
              </span>
            )}
            {latestAssistantMsg && (
              <button
                type="button"
                className="mini-btn"
                style={{ marginLeft: "auto" }}
                aria-label={S4_STR.regenerateAria}
                title={S4_STR.regenerateAria}
                disabled={isGenerating}
                onClick={regenerateLatest}
              >
                <Sync size={13} />
                {S4_STR.regenerate}
              </button>
            )}
          </div>
        )}

        {/* AI 생성바 — 집필 핵심 액션 (wd-input 디자인 재사용, 실 엔진 handleSend).
            isGenerating: 입력 비활성 + 스피너 + 중단(handleCancel).
            !hasAiAccess: 클릭 시 실제 API 키 모달 (silent failure 금지).
            F4 — 인라인 model picker + @멘션 typeahead (기존 바 확장 — 재설계 X).
            position:relative = 멘션 드롭다운 anchor (위로 펼침 — 본문 침범 X). */}
        <div className="wd-input" style={{ margin: "12px 28px 18px", position: "relative" }}>
          {/* F4 (b) — @멘션 드롭다운 (캐릭터·세계관 필드·회차 — 실 config 만) */}
          {mentionOpen && (
            <MentionDropdown
              items={mentionFiltered}
              activeIndex={mentionActiveIdx}
              listboxId={mentionListboxId}
              language={language}
              onSelect={selectMention}
            />
          )}
          {/* F4 (a) — 인라인 모델 셀렉트 (provider 결정 = 생성 경로와 동일·noa-lg-model 영속) */}
          <ModelPickerInline language={language} hostedProviders={hostedProviders} disabled={isGenerating} />
          <input
            ref={genInputRef}
            className="wd-in-field"
            role="combobox"
            aria-expanded={mentionOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={mentionOpen ? mentionListboxId : undefined}
            aria-activedescendant={mentionOpen ? `${mentionListboxId}-opt-${mentionActiveIdx}` : undefined}
            aria-label={L4(language, {
              ko: "AI 생성 지시 입력 — @ 로 캐릭터·세계관·회차 멘션",
              en: "AI generation prompt — type @ to mention characters, world fields, episodes",
            })}
            placeholder={L4(language, {
              ko: "AI에게 다음 전개를 지시하세요… (@로 캐릭터·설정 참조)",
              en: "Tell the AI what happens next… (@ to reference characters or lore)",
            })}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              updateMention(e.target);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              // F4 (b) — 드롭다운 열림: ↑↓ 순환 / Enter 선택 / Escape 닫기 / Tab 닫기
              if (mentionOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionFiltered.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((i) => (i - 1 + mentionFiltered.length) % mentionFiltered.length);
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault(); // 멘션 확정 — 생성 제출 아님
                  selectMention(mentionFiltered[mentionActiveIdx]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  mentionSuppressRef.current = mentionState?.start ?? null;
                  setMentionState(null);
                  return;
                }
                if (e.key === "Tab") setMentionState(null); // 포커스 이동은 그대로 (트랩 금지)
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitGenerate();
              }
            }}
            onBlur={() => setMentionState(null)}
            disabled={isGenerating}
          />
          {isGenerating ? (
            armedCancel ? (
              /* CANCEL CONFIRM — arm 상태 (5초 자동 해제). 확인에서만 실제 abort. */
              <>
                <span className="pill amber" role="alert">
                  {L4(language, {
                    ko: "생성 중단? 진행된 내용은 폐기됩니다",
                    en: "Stop generating? Progress so far will be discarded",
                  })}
                </span>
                <button
                  type="button"
                  className="mini-btn no"
                  aria-label={L4(language, { ko: "생성 중단 확인", en: "Confirm stop generation" })}
                  onClick={() => {
                    setArmedCancel(false);
                    // S4 — 사용자 중단 마킹: 완료 경계 effect 가 부분 결과를 strip 으로 올리지 않음
                    cancelledByUserRef.current = true;
                    handleCancel();
                  }}
                >
                  <X size={13} />
                  {L4(language, { ko: "확인", en: "Confirm" })}
                </button>
                <button
                  type="button"
                  className="mini-btn"
                  aria-label={L4(language, { ko: "생성 계속 (중단 취소)", en: "Keep generating (cancel stop)" })}
                  onClick={() => setArmedCancel(false)}
                >
                  {L4(language, { ko: "취소", en: "Cancel" })}
                </button>
              </>
            ) : (
              <>
                <span className="pill blue">
                  <Sync size={12} className="animate-spin" />
                  {L4(language, { ko: "생성 중…", en: "Generating…" })}
                </span>
                <button
                  type="button"
                  className="wd-in-send"
                  aria-label={L4(language, { ko: "생성 중단", en: "Stop generation" })}
                  title={L4(language, { ko: "생성 중단", en: "Stop generation" })}
                  onClick={() => setArmedCancel(true)}
                >
                  <X size={16} />
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              className="wd-in-send"
              aria-label={L4(language, { ko: "AI 생성", en: "Generate with AI" })}
              title={L4(language, { ko: "AI 생성", en: "Generate with AI" })}
              onClick={submitGenerate}
              disabled={hasAiAccess && !input.trim()}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </section>

      {/* right — 초안 컨트롤 패널 */}
      <aside className="wr-panel">
        <div className="wr-panel-head">
          <span>{L4(language, { ko: "초안 컨트롤", en: "Draft Controls" })}</span>
          <Settings size={16} />
        </div>

        {/* 버전 스냅샷 (versionedBackups) — A/B mock 토글 대체 */}
        <div className="pcard">
          <div className="pcard-h">
            <Clock size={15} />
            {L4(language, { ko: "버전 스냅샷", en: "Version snapshots" })}
            {refreshBackupList && (
              <button
                type="button"
                className="mini-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => refreshBackupList()}
              >
                <Sync size={13} />
                {L4(language, { ko: "새로고침", en: "Refresh" })}
              </button>
            )}
          </div>
          {backups.length === 0 ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
              {L4(language, { ko: "저장된 스냅샷이 없습니다", en: "No saved snapshots" })}
            </div>
          ) : (
            backups.map((b) => (
              <Fragment key={b.timestamp}>
                <div className="wr-srow">
                  <span className="rdot blue" />
                  {b.label}
                  {armedRestore === b.timestamp ? (
                    /* RESTORE CONFIRM — arm 상태 (5초 자동 해제). 확인에서만 실제 복원. */
                    <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                      <button
                        type="button"
                        className="mini-btn ok"
                        aria-label={L4(language, { ko: "복원 확인 — 현재 작업 대체", en: "Confirm restore — replaces current work" })}
                        disabled={restoring != null || !doRestoreVersionedBackup}
                        onClick={() => restoreBackup(b.timestamp)}
                      >
                        <Check size={13} />
                        {L4(language, { ko: "확인", en: "Confirm" })}
                      </button>
                      <button
                        type="button"
                        className="mini-btn no"
                        aria-label={L4(language, { ko: "복원 취소", en: "Cancel restore" })}
                        onClick={() => setArmedRestore(null)}
                      >
                        {L4(language, { ko: "취소", en: "Cancel" })}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="mini-btn"
                      style={{ marginLeft: "auto" }}
                      aria-label={`${L4(language, { ko: "버전 복원", en: "Restore version" })} — ${b.label}`}
                      disabled={restoring != null || !doRestoreVersionedBackup}
                      onClick={() => setArmedRestore(b.timestamp)}
                    >
                      {restoring === b.timestamp
                        ? L4(language, { ko: "복원 중…", en: "Restoring…" })
                        : L4(language, { ko: "복원", en: "Restore" })}
                    </button>
                  )}
                </div>
                {armedRestore === b.timestamp && (
                  <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
                    <span className="rdot amber" />
                    {L4(language, {
                      ko: "정말 복원할까요? 현재 작업이 대체됩니다",
                      en: "Restore this snapshot? Your current work will be replaced",
                    })}
                  </div>
                )}
              </Fragment>
            ))
          )}
        </div>

        {/* 오염 방지 요약 — directorReport.findings */}
        <div className="pcard">
          <div className="pcard-h">
            <Shield size={15} />
            {L4(language, { ko: "오염 방지 요약", en: "Contamination guard" })}
            {directorScore != null && (
              <span
                className={"pill " + (findings.length === 0 ? "green" : "amber")}
                style={{ marginLeft: "auto" }}
              >
                {L4(language, { ko: `${Math.round(directorScore)}점`, en: `${Math.round(directorScore)} pts` })}
              </span>
            )}
          </div>
          {directorReport == null ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
              {L4(language, { ko: "생성 후 검수 결과가 표시됩니다", en: "Review results appear after generation" })}
            </div>
          ) : contaminationRows.length === 0 ? (
            <div className="wr-srow">
              <span className="rdot green" />
              {L4(language, { ko: "검출된 문제 없음", en: "No issues found" })}
              <b style={{ marginLeft: "auto" }}>{L4(language, { ko: "0건", en: "0" })}</b>
            </div>
          ) : (
            contaminationRows.map(([kind, count]) => (
              <div key={kind} className="wr-srow">
                <span className="rdot amber" />
                {kind}
                <b style={{ marginLeft: "auto" }}>{L4(language, { ko: `${count}건`, en: `${count}` })}</b>
              </div>
            ))
          )}
          <button
            type="button"
            className="btn"
            style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
            onClick={() => setLoreguardTab("plot")}
          >
            {L4(language, { ko: "룰북에서 자세히", en: "Details in the rulebook" })} <ChevronR size={14} />
          </button>
        </div>

        {/* S7 — AI 주입 컨텍스트 미리보기 (접이식·기본 접힘) — 실제 주입 소스 요약만 (PART 2.5) */}
        <ContextRefCard config={config} language={language} />

        {/* S5 — 자가 점검 (판단용) — 결정적 카운트 표시 전용 (PART 3.6 writingMetrics).
            중립 숫자만 — 색상 fail 상태 없음·임계 없음·어떤 동작도 차단하지 않음 (advisory). */}
        <div className="pcard">
          <div className="pcard-h">
            <Pen size={15} />
            {S5_STR.selfCheckTitle}
            <button
              type="button"
              className="mini-btn"
              style={{ marginLeft: "auto" }}
              aria-expanded={selfCheckOpen}
              aria-label={S5_STR.selfCheckToggleAria}
              onClick={() => setSelfCheckOpen((v) => !v)}
            >
              {selfCheckOpen ? S5_STR.selfCheckCollapse : S5_STR.selfCheckExpand}
            </button>
          </div>
          {selfCheckOpen && (
            <>
              {(
                [
                  [S5_STR.rowDeclarative, writingMetrics.declarativeEndings],
                  [S5_STR.rowExplanatory, writingMetrics.explanatoryEndings],
                  [S5_STR.rowRepeatedStart, writingMetrics.repeatedStartPairs],
                ] as const
              ).map(([label, count]) => (
                <div key={label} className="wr-srow" style={{ alignItems: "flex-start" }}>
                  <span className="rdot gray" style={{ marginTop: 5 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {label}
                    <span style={{ display: "block", color: "var(--c-sub, #888)", fontSize: 11.5 }}>
                      {S5_STR.advisoryCaption}
                    </span>
                  </span>
                  <b>
                    {count.toLocaleString()}
                    {S5_STR.countUnit}
                  </b>
                </div>
              ))}
              {/* S5 — voice 보호 정책 표명 (Layer 51/85/88) — 검출 '기능' 아님 (엔진 부재·정직 표기) */}
              <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
                {S5_STR.voiceNotice}
              </div>
            </>
          )}
        </div>

        {/* 합성 로그 — lastReport.issues */}
        <div className="pcard">
          <div className="pcard-h">
            <Clock size={15} />
            {L4(language, { ko: "합성 로그", en: "Synthesis log" })}
          </div>
          <div className="log">
            {logIssues.length === 0 ? (
              <div className="log-row">
                <span className="log-dot gray" />
                <span className="log-m">
                  {L4(language, { ko: "아직 생성된 회차가 없습니다", en: "No episodes generated yet" })}
                </span>
              </div>
            ) : (
              logIssues.map((issue, i) => (
                <div key={i} className="log-row">
                  <span className={"log-dot " + sevColor(issue.severity)} />
                  {lastReport && (
                    <span className="log-t">{clock(lastSaveTime ?? Date.now())}</span>
                  )}
                  <span className="log-m">
                    {issue.category}: {issue.message}
                  </span>
                </div>
              ))
            )}
          </div>
          {lastReport && (
            <div className="wr-srow" style={{ marginTop: 8 }}>
              <span className="rdot green" />
              {L4(language, { ko: "등급", en: "Grade" })} {lastReport.grade} ·{" "}
              {L4(language, { ko: "AI톤", en: "AI tone" })} {lastReport.aiTonePercent}%
              <b style={{ marginLeft: "auto" }}>EOS {lastReport.eosScore}</b>
            </div>
          )}
        </div>

        {/* 삽입 / 대체 CTA — 직전 AI 생성 메시지 반영 */}
        <div className="wr-cta">
          <button
            type="button"
            className="btn primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={!editDraft}
            onClick={() => editDraftRef.current?.focus()}
          >
            <Pen size={15} />
            {L4(language, { ko: "본문 편집", en: "Edit draft" })}
          </button>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={openExport}
          >
            <Download size={15} />
            {L4(language, { ko: "원고함", en: "Manuscripts" })}
          </button>
        </div>

        {/* Synthesis Queue — pipelineResult.stages */}
        <div className="pcard">
          <div className="pcard-h">
            <Layers size={15} />
            Synthesis Queue
          </div>
          {stages.length === 0 ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
              {L4(language, { ko: "파이프라인 실행 기록이 없습니다", en: "No pipeline runs yet" })}
            </div>
          ) : (
            <div className="wr-queue">
              {stages.map((st) => {
                const [en, ko, avatar] = stageLabel[st.stage] ?? [st.stage, st.stage, "S"];
                const color = stageStatusColor(st.status);
                const pct = st.status === "passed" ? 100 : st.status === "running" ? 50 : st.status === "failed" ? 100 : 0;
                return (
                  <div key={st.stage} className="wr-q">
                    <div className={"wr-q-ic " + color}>
                      {color === "green" ? <Check size={14} /> : <Plus size={14} />}
                    </div>
                    <div className="wr-q-en">{en}</div>
                    <div className="wr-q-ko">{ko}</div>
                    <span className={"pill " + color}>{stageStatusLabel[st.status] ?? st.status}</span>
                    <div className="tbar" style={{ marginTop: "8px" }}>
                      <span
                        style={{
                          width: pct + "%",
                          background: color === "green" ? "var(--c-green)" : "var(--c-amber)",
                        }}
                      />
                    </div>
                    <div className="wr-q-foot">
                      <span className="wr-q-av">{avatar}</span>
                      {st.score != null
                        ? L4(language, { ko: `${Math.round(st.score)}점`, en: `${Math.round(st.score)} pts` })
                        : pct + "%"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* PART 4 mount — 원고함·출고 slide-over ('loreguard:open-export' 이벤트 수신) */}
      <ManuscriptExportPanel />

      {/* PART 5 mount — 문체 스튜디오 slide-over ('loreguard:open-style' 이벤트 수신).
          여기(early return 이후)에 mount 되므로 currentSession null 가드 자동 충족. */}
      <StyleStudioPanel />

      {/* S3 mount — 창작 과정 확인서 slide-over ('loreguard:open-cp' 이벤트 수신).
          동일하게 early return 이후 mount — currentSession null 가드 자동 충족. */}
      <CpJournalPanel />

      {/* S8 mount — 퇴고 slide-over ('loreguard:open-revision' 이벤트 수신).
          패널 본체는 별도 파일 (B 에이전트 소유) — 이 파일은 PART 4/5 패턴대로 mount 만.
          early return 이후 mount — currentSession null 가드 자동 충족. */}
      <RevisionPanel />

      {/* Z1d mount — IP 자산화 slide-over ('loreguard:open-ipasset' 이벤트 수신).
          패널 본체는 별도 파일 (Z1b 소유 — ../IpAssetPanel) — PART 4/5 패턴대로 mount 만.
          early return 이후 mount — currentSession null 가드 자동 충족. */}
      <IpAssetPanel />
    </div>
  );
}

// ============================================================
// PART 4 — ManuscriptExportPanel (원고함·출고 slide-over)
//
// 오픈: window CustomEvent 'loreguard:open-export'
//       (집필 헤더 Expand / 우측 CTA '원고함' 버튼이 dispatch — PART 3 openExport).
// 닫기: 닫기 버튼 / Escape / 오버레이 클릭.
// export: useStudioExport 로컬 인스턴스 — TabTranslate 하단 바와 동일 패턴
//         (export 경로는 projects/currentSession 읽기 전용 → setter no-op 안전).
// 출고 검수: runPublishAudit (publish-audit.ts 로컬 규칙 엔진, 외부 API 없음)
//         — 현재 회차 본문(편집 중 editDraft 우선) 대상, 실 검출 결과만 표시.
// ============================================================

/** PublishAudit severity → 디자인 팔레트 도트 색 (amber/blue/gray 한정 — sevColor 와 동일 원칙) */
function auditSevColor(sev: AuditSeverity): "amber" | "blue" | "gray" {
  if (sev === "high" || sev === "medium") return "amber";
  if (sev === "low") return "blue";
  return "gray"; // info
}

function ManuscriptExportPanel() {
  const {
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setCurrentSessionId,
    setCurrentProjectId,
    setConfig,
    language,
    isKO,
    writingMode,
    editDraft,
  } = useStudio();

  const [open, setOpen] = useState(false);
  const [audit, setAudit] = useState<PublishAuditReport | null>(null);

  // [Z1c-mid-ports] Web Share capability — lazy init 1회 감지 (canShare 는 SSR 안전 가드 내장).
  // 패널은 open 게이트(미오픈 = null 렌더)라 hydration 불일치 없음. 미지원 = 버튼 미노출·무동작.
  const [shareSupported] = useState(() => canShare());

  // 오픈 이벤트 청취 — unmount 시 cleanup
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-export", onOpen);
    return () => window.removeEventListener("loreguard:open-export", onOpen);
  }, []);

  // Escape 닫기 — 패널 오픈 중에만 청취
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // export 엔진 — TabTranslate 하단 바(useStudioExport 로컬 인스턴스)와 동일 패턴.
  // 이 패널은 export 만 호출 (import/세션 변경 X) — projects/currentSession 읽기 전용이므로
  // setProjects/setSessions no-op 안전.
  const exportApi = useStudioExport({
    currentSession,
    sessions,
    currentSessionId,
    currentProjectId,
    projects,
    setProjects: () => {},
    setCurrentProjectId,
    setSessions: () => {},
    setCurrentSessionId,
    // 구 AppTab 내비 차단 — 이 패널은 export 만 쓰므로(import 미배선) no-op 안전
    setActiveTab: () => {},
    isKO,
    language,
    writingMode,
    editDraft,
  });

  // 회차 원고 목록 — currentSession.config.manuscripts (episode 순)
  const manuscripts = useMemo<EpisodeManuscript[]>(() => {
    const list = currentSession?.config?.manuscripts ?? [];
    return [...list].sort((a, b) => a.episode - b.episode);
  }, [currentSession]);

  const currentEpisode = currentSession?.config?.episode ?? null;

  // 검수 대상 본문 — 편집 중이면 editDraft(라이브), 아니면 현재 회차 저장 원고
  // (S6 i18n — label 은 표시 전용·비교 로직 없음 → language 의존 추가)
  const auditTarget = useMemo<{ label: string; content: string } | null>(() => {
    if (editDraft.trim()) {
      return {
        label: L4(language, { ko: "편집 중 원고", en: "draft in editing" }),
        content: editDraft,
      };
    }
    const ms =
      manuscripts.find((m) => m.episode === currentEpisode) ??
      manuscripts[manuscripts.length - 1];
    if (ms?.content?.trim()) {
      return {
        label: L4(language, { ko: `EP.${ms.episode} 저장 원고`, en: `EP.${ms.episode} saved manuscript` }),
        content: ms.content,
      };
    }
    return null;
  }, [editDraft, manuscripts, currentEpisode, language]);

  // ── X4 품질 하네스 — 프로젝트(장르·등급·플랫폼) 맞춤 검증 셋. 일치 시 config 저장본 재사용,
  //    불일치/없음 시 in-memory 생성 (영속은 검수 실행/재생성 액션 시 setConfig — 렌더 중 부수효과 금지) ──
  const storyConfig = currentSession?.config;
  const harnessInput = useMemo(
    () => ({
      genre: koreanGenreIdFromStoryGenre(storyConfig?.genre),
      grade: gradeFromPrismMode(storyConfig?.prismMode),
      platform: storyConfig?.publishPlatform ?? "NONE",
    }),
    [storyConfig?.genre, storyConfig?.prismMode, storyConfig?.publishPlatform],
  );
  const { harness } = useMemo(
    () => loadOrBuildHarness(storyConfig?.qualityHarness, harnessInput),
    [storyConfig?.qualityHarness, harnessInput],
  );

  const runAudit = useCallback(() => {
    if (!auditTarget) return;
    setAudit(runPublishAudit(auditTarget.content, harnessToAuditOptions(harness)));
    // 사용 기록 + 영속 (additive — config.qualityHarness·같은 프로젝트 재방문 시 load)
    const used = markHarnessUsed(harness);
    setConfig((prev) => ({ ...prev, qualityHarness: used }));
  }, [auditTarget, harness, setConfig]);

  // 하네스 재생성 — 현 장르·등급·플랫폼 기준 신규 생성 + 즉시 영속 (useCount 0 리셋)
  const regenerateHarness = useCallback(() => {
    const fresh = buildHarness(harnessInput);
    setConfig((prev) => ({ ...prev, qualityHarness: fresh }));
  }, [harnessInput, setConfig]);

  // ── PART 4.5 — ④ 플랫폼 자수 적합 (checkPlatformFit 순수 함수 재사용·'free' 제외 5 플랫폼) ──
  const platformFits = useMemo(
    () =>
      auditTarget == null
        ? []
        : PLATFORM_SPECS.filter((p) => p.id !== "free").map((spec) => ({
            spec,
            fit: checkPlatformFit(auditTarget.content, spec.id),
          })),
    [auditTarget],
  );

  // ── PART 4.5 — ⑤ IP 준비도 (computeIPReadiness 기존 산식 그대로·입력 = 작가 자가 평가 5축).
  //    데스크톱 ExportPanel 과 동일 입력 방식 (슬라이더·기본 60) — 자동 측정 엔진이 아님 (기능 가장 금지). ──
  const [ipParts, setIpParts] = useState<IPReadinessParts>({
    rights: 60,
    market: 60,
    adaptation: 60,
    assetPackage: 60,
    riskControl: 60,
  });
  const ipResult = useMemo(() => computeIPReadiness(ipParts), [ipParts]);

  // ── PART 4.5 — ⑥ 작업 영수증 (buildReceipt chg_152 표준·실 수행 내역만 — 미수행은 ✗ skipped 로 정직 기재) ──
  const [receipt, setReceipt] = useState("");
  const issueReceipt = useCallback(() => {
    const did: { action: string; evidence: string }[] = [];
    const skipped: { action: string; reason: string }[] = [];
    if (audit && auditTarget) {
      did.push({
        action: L4(language, { ko: "출고 검수 (publish-audit)", en: "Publish audit" }),
        evidence: L4(language, {
          ko: `${audit.overallScore}점 · ${audit.findings.length}건 검출 · ${auditTarget.label}`,
          en: `${audit.overallScore} pts · ${audit.findings.length} findings · ${auditTarget.label}`,
        }),
      });
    } else {
      skipped.push({
        action: L4(language, { ko: "출고 검수", en: "Publish audit" }),
        reason: L4(language, { ko: "미실행 — [검수 실행] 버튼으로 수행", en: "Not run — use the [Run audit] button" }),
      });
    }
    if (auditTarget && platformFits.length > 0) {
      const okCount = platformFits.filter((p) => p.fit.withinRange).length;
      did.push({
        action: L4(language, { ko: "플랫폼 자수 적합 검사 (5 플랫폼)", en: "Platform length fit check (5 platforms)" }),
        evidence: L4(language, {
          ko: `적합 ${okCount}/${platformFits.length} · ${platformFits[0].fit.chars.toLocaleString()}자`,
          en: `${okCount}/${platformFits.length} within range · ${platformFits[0].fit.chars.toLocaleString()} chars`,
        }),
      });
    } else {
      skipped.push({
        action: L4(language, { ko: "플랫폼 자수 적합 검사", en: "Platform length fit check" }),
        reason: L4(language, { ko: "검수할 원고 없음", en: "No manuscript to check" }),
      });
    }
    did.push({
      action: L4(language, {
        ko: "IP 준비도 산출 (Layer 60 · 작가 자가 평가 5축)",
        en: "IP readiness (Layer 60 · author self-assessed 5 axes)",
      }),
      evidence: L4(language, {
        ko: `${ipResult.score}점 · tier ${ipResult.tier}`,
        en: `${ipResult.score} pts · tier ${ipResult.tier}`,
      }),
    });
    setReceipt(
      buildReceipt({
        did,
        skipped,
        metrics: {
          chars: auditTarget ? auditTarget.content.length : undefined,
          dialogueRatio: audit ? audit.stats.dialogueRatio * 100 : undefined,
        },
      }),
    );
  }, [audit, auditTarget, platformFits, ipResult, language]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "원고함·출고", en: "Manuscript library and publishing" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Download size={16} />
          {L4(language, { ko: "원고함 · 출고", en: "Manuscripts · Publishing" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* ① 회차 원고 목록 — config.manuscripts 실데이터 */}
        <div className="pcard">
          <div className="pcard-h">
            <Layers size={15} />
            {L4(language, { ko: "회차 원고", en: "Episode manuscripts" })}
            <span className="pill gray" style={{ marginLeft: "auto" }}>
              {L4(language, { ko: `${manuscripts.length}편`, en: `${manuscripts.length} episodes` })}
            </span>
          </div>
          {manuscripts.length === 0 ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
              {L4(language, { ko: "저장된 회차 원고가 없습니다", en: "No saved episode manuscripts" })}
            </div>
          ) : (
            manuscripts.map((m, i) => (
              <div key={`${m.episode}-${i}`} className="wr-srow">
                <span className={"rdot " + (m.episode === currentEpisode ? "green" : "gray")} />
                EP.{m.episode} {m.title || L4(language, { ko: "무제", en: "Untitled" })}
                <b>
                  {L4(language, {
                    ko: `${(m.charCount ?? m.content.length).toLocaleString()}자`,
                    en: `${(m.charCount ?? m.content.length).toLocaleString()} chars`,
                  })}
                </b>
              </div>
            ))
          )}
        </div>

        {/* ② 내보내기 — useStudioExport 실 엔진 (no-op 호출 방지 위해 조건 disabled) */}
        <div className="pcard">
          <div className="pcard-h">
            <Download size={15} />
            {L4(language, { ko: "내보내기", en: "Export" })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="mini-btn"
              disabled={!currentProjectId}
              onClick={() => exportApi.exportProjectManuscripts("txt")}
            >
              {L4(language, { ko: "TXT (전 회차)", en: "TXT (all episodes)" })}
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={!currentSession}
              onClick={exportApi.handleExportEPUB}
            >
              EPUB
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={!currentSession}
              onClick={exportApi.handleExportDOCX}
            >
              DOCX
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={projects.length === 0}
              onClick={exportApi.exportAllJSON}
            >
              {L4(language, { ko: "전체 백업 JSON", en: "Full backup JSON" })}
            </button>
            {/* [Z1c-mid-ports] OS 공유 시트 — 기존 web-share 재사용. capability 감지로
                지원 브라우저에만 노출. 대상 = 검수 대상 본문(편집 중 우선). 취소 = 무동작. */}
            {shareSupported && (
              <button
                type="button"
                className="mini-btn"
                disabled={!auditTarget}
                aria-label={L4(language, {
                  ko: "현재 원고를 OS 공유 시트로 공유",
                  en: "Share the current manuscript via the OS share sheet",
                })}
                onClick={() => {
                  if (!auditTarget) return;
                  const title = `${currentSession?.title?.trim() || "manuscript"} — ${auditTarget.label}`;
                  void (async () => {
                    // 파일 공유 가능 → .txt 파일, 아니면 텍스트 공유 (4000자 안전 상한)
                    const ok = canShareFiles()
                      ? await shareManuscript(title, auditTarget.content, "txt")
                      : await shareText(title, auditTarget.content.slice(0, 4000));
                    if (!ok) return; // 사용자 취소/미지원 — 무동작 (오류 위장 금지)
                  })();
                }}
              >
                {L4(language, { ko: "공유 (OS)", en: "Share (OS)" })}
              </button>
            )}
          </div>
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
            {L4(language, {
              ko: "전체 백업 JSON 은 모든 프로젝트 포함 — 재해 복구용",
              en: "Full backup JSON includes every project — for disaster recovery",
            })}
          </div>
        </div>

        {/* ③ 출고 검수 — runPublishAudit 실 검출 결과만 표시 */}
        <div className="pcard">
          <div className="pcard-h">
            <Shield size={15} />
            {L4(language, { ko: "출고 검수", en: "Publish audit" })}
            {audit && (
              <span
                className={"pill " + (audit.findings.length === 0 ? "green" : "amber")}
                style={{ marginLeft: "auto" }}
              >
                {L4(language, { ko: `${audit.overallScore}점`, en: `${audit.overallScore} pts` })}
              </span>
            )}
          </div>
          {/* X4 — 하네스 요약 1줄 (프로젝트 맞춤 검증 셋) + 재생성 */}
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              {L4(language, { ko: "하네스: ", en: "Harness: " })}
              {L4(language, summarizeHarness(harness))}
            </span>
            <button
              type="button"
              className="mini-btn"
              aria-label={L4(language, { ko: "품질 하네스 재생성", en: "Regenerate quality harness" })}
              title={L4(language, {
                ko: "현재 장르·등급·플랫폼 기준으로 검증 셋을 다시 생성",
                en: "Rebuild the check set from current genre, grade, and platform",
              })}
              onClick={regenerateHarness}
            >
              <Sync size={12} />
              {L4(language, { ko: "재생성", en: "Rebuild" })}
            </button>
          </div>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!auditTarget}
            onClick={runAudit}
          >
            <Check size={14} />
            {auditTarget
              ? L4(language, { ko: `검수 실행 — ${auditTarget.label}`, en: `Run audit — ${auditTarget.label}` })
              : L4(language, { ko: "검수할 원고가 없습니다", en: "No manuscript to audit" })}
          </button>
          {audit == null ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
              {L4(language, {
                ko: "문장부호·맞춤법·띄어쓰기·문장 길이·미완 표식 검사",
                en: "Checks punctuation, spelling, spacing, sentence length, and unfinished markers",
              })}
            </div>
          ) : audit.findings.length === 0 ? (
            <div className="wr-srow" style={{ marginTop: 8 }}>
              <span className="rdot green" />
              {L4(language, { ko: "검출된 문제 없음", en: "No issues found" })}
              <b>{L4(language, { ko: "0건", en: "0" })}</b>
            </div>
          ) : (
            audit.findings.map((f) => (
              <div key={f.id} className="wr-srow" style={{ alignItems: "flex-start" }}>
                <span className={"rdot " + auditSevColor(f.severity)} style={{ marginTop: 5 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {f.title}
                  <span style={{ display: "block", color: "var(--c-sub, #888)", fontSize: 11.5 }}>
                    {f.detail}
                    {f.suggestion ? ` · ${f.suggestion}` : ""}
                  </span>
                </span>
              </div>
            ))
          )}
          {audit && (
            <div className="wr-srow" style={{ marginTop: 8, color: "var(--c-sub, #888)" }}>
              {L4(language, {
                ko: `${audit.stats.totalChars.toLocaleString()}자 · 문단 ${audit.stats.totalParagraphs}개 · 대사 ${Math.round(audit.stats.dialogueRatio * 100)}%`,
                en: `${audit.stats.totalChars.toLocaleString()} chars · ${audit.stats.totalParagraphs} paragraphs · dialogue ${Math.round(audit.stats.dialogueRatio * 100)}%`,
              })}
            </div>
          )}
        </div>

        {/* ④ 플랫폼 자수 적합 — checkPlatformFit (export-spec.ts §4·5 플랫폼·결정적 산식만) */}
        <div className="pcard">
          <div className="pcard-h">
            <Scale size={15} />
            {L4(language, { ko: "플랫폼 자수 적합", en: "Platform length fit" })}
          </div>
          {platformFits.length === 0 ? (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
              {L4(language, { ko: "검수할 원고가 없습니다", en: "No manuscript to check" })}
            </div>
          ) : (
            <>
              <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
                {L4(language, {
                  ko: `기준: ${auditTarget?.label ?? ""} · ${platformFits[0].fit.chars.toLocaleString()}자 (공백 포함)`,
                  en: `Target: ${auditTarget?.label ?? ""} · ${platformFits[0].fit.chars.toLocaleString()} chars (incl. spaces)`,
                })}
              </div>
              {platformFits.map(({ spec, fit }) => (
                <div key={spec.id} className="wr-srow">
                  <span className={"rdot " + (fit.withinRange ? "green" : "amber")} />
                  {spec.label} {spec.minChars.toLocaleString()}~{spec.maxChars.toLocaleString()}
                  <b style={{ marginLeft: "auto" }}>{fit.note}</b>
                </div>
              ))}
              {/* 판단용 안내 — 적합 여부는 정보 제공 전용·export 차단 없음 (S5 advisory 정책 공유) */}
              <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
                {L4(language, {
                  ko: "판단용 — 범위 밖이어도 내보내기는 차단되지 않습니다",
                  en: "Advisory — exporting is never blocked even when out of range",
                })}
              </div>
            </>
          )}
        </div>

        {/* ⑤ IP 준비도 — computeIPReadiness (07_IP자산화 Layer 60·기존 산식). 입력 = 작가 자가 평가 5축 슬라이더 */}
        <div className="pcard">
          <div className="pcard-h">
            <Flag size={15} />
            {L4(language, { ko: "IP 준비도 (Layer 60)", en: "IP readiness (Layer 60)" })}
            <span className="pill gray" style={{ marginLeft: "auto" }}>
              {ipResult.tier} · {L4(language, { ko: `${ipResult.score}점`, en: `${ipResult.score} pts` })}
            </span>
          </div>
          {(
            [
              ["rights", { ko: "권리성", en: "Rights" }],
              ["market", { ko: "시장성", en: "Market" }],
              ["adaptation", { ko: "매체전환성", en: "Adaptation" }],
              ["assetPackage", { ko: "패키지성", en: "Asset package" }],
              ["riskControl", { ko: "리스크관리", en: "Risk control" }],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="wr-srow" style={{ gap: 8 }}>
              <span style={{ width: 76, flexShrink: 0 }}>{L4(language, label)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={ipParts[k]}
                aria-label={L4(language, {
                  ko: `IP 준비도 — ${label.ko} 자가 평가 (0~100)`,
                  en: `IP readiness — self-assessed ${label.en} (0–100)`,
                })}
                onChange={(e) => setIpParts((s) => ({ ...s, [k]: Number(e.target.value) }))}
                style={{ flex: 1, minWidth: 0 }}
              />
              <b style={{ width: 28, textAlign: "right" }}>{ipParts[k]}</b>
            </div>
          ))}
          {/* 정직 표기 — 자동 측정 아님 (작가 자가 평가 입력 → 가중 산식만 계산) */}
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
            {L4(language, {
              ko: "작가 자가 평가 — 산식: 권리25·시장20·전환25·패키지20·리스크10 가중 + cap",
              en: "Author self-assessment — formula: rights 25 · market 20 · adaptation 25 · package 20 · risk 10 weighted + caps",
            })}
          </div>
        </div>

        {/* ⑥ 작업 영수증 — buildReceipt (00_핵심 chg_152). 실 수행 내역만 ✓ / 미수행 ✗ 정직 기재 */}
        <div className="pcard">
          <div className="pcard-h">
            <Quote size={15} />
            {L4(language, { ko: "작업 영수증", en: "Work receipt" })}
          </div>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={issueReceipt}
          >
            <Check size={14} />
            {L4(language, { ko: "영수증 발급 (00_핵심)", en: "Issue receipt" })}
          </button>
          {receipt ? (
            <pre
              style={{
                maxHeight: 200,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontSize: 11,
                color: "var(--c-sub, #888)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: 8,
                margin: "8px 0 0",
                background: "transparent",
              }}
            >
              {receipt}
            </pre>
          ) : (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
              {L4(language, {
                ko: "수행 내역(검수·플랫폼 적합·IP 준비도)을 표준 영수증으로 발급합니다",
                en: "Issues a standard receipt of what was actually run (audit, platform fit, IP readiness)",
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// PART 5 — StyleStudioPanel (문체 스튜디오 slide-over)
//
// 오픈: window CustomEvent 'loreguard:open-style'
//       (집필 헤더 '문체' 버튼이 dispatch — PART 3 openStyle).
// 닫기: 닫기 버튼 / Escape / 오버레이 클릭 — PART 4 와 동일 패턴.
// 내용: 기존 문체 시스템 UI(StyleTab, 구 셸 'style' 탭과 동일 컴포넌트)를
//       StudioTabRouter 와 동일한 실 context props 로 mount.
//       styleProfile 편집 → updateCurrentSession 영속 → buildStyleDNA → 프롬프트
//       체인은 기존 배선 그대로 (이 패널은 mount 만 추가).
// 가드: currentSession/config 없으면 미렌더 (PART 3 early return 과 이중 가드).
// ============================================================

function StyleStudioPanel() {
  const {
    currentSession,
    language,
    updateCurrentSession,
    triggerSave,
    saveFlash,
    showAiLock,
    hostedProviders,
  } = useStudio();

  const [open, setOpen] = useState(false);

  // 오픈 이벤트 청취 — unmount 시 cleanup
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-style", onOpen);
    return () => window.removeEventListener("loreguard:open-style", onOpen);
  }, []);

  // Escape 닫기 — 패널 오픈 중에만 청취
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const config = currentSession?.config;
  if (!open || !currentSession || !config) return null;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "문체 스튜디오", en: "Style Studio" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Pen size={16} />
          {L4(language, { ko: "문체 스튜디오", en: "Style Studio" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* 기존 문체 시스템 UI — StudioTabRouter 'style' 분기와 동일 props */}
        <StyleTab
          language={language}
          config={config}
          updateCurrentSession={updateCurrentSession}
          triggerSave={triggerSave}
          saveFlash={saveFlash}
          showAiLock={showAiLock}
          hostedProviders={hostedProviders}
          messages={currentSession.messages}
        />
      </aside>
    </div>
  );
}
