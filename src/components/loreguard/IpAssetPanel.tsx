"use client";

/* ===========================================================
   IpAssetPanel — IP 자산화 slide-over (Z1b-asset-ui)

   오픈: window CustomEvent 'loreguard:open-ipasset'
         (mount 는 Z1d 담당 — CpJournalPanel 과 동일 slide-over 패턴 복제.
          TabWriting 은 본 작업에서 수정하지 않는다).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭.

   탭 3 (.seg 토글):
   ① 준비도 — evaluateReadinessGates 6게이트(G0~G5) 진행·blocking 사유
              + 매체 fit 4점수 카드 (estimate*FromConfig → *FitScore — 추정 시
              confidence 명시 "자동 추정 — 판단용")
   ② 바이블 — buildIpBible 13섹션 미리보기 + 빈 섹션 정직 표시 + MD 다운로드
   ③ 패키지 — 5종(A출판~E해외) 선택 → 포함 섹션 미리보기 → JSON/MD 다운로드
              + 스포일러 등급별 차단 표시 (canExposeInMedia)
              + 프리비주얼 슬롯 참고 (buildPrevisualSlots — visualGuide 포함 패키지)

   소비 엔진 (전부 기존 — 본 파일은 산식 0·조립/표시만):
   - lib/creative/media-fit-score  (4 산식 + computeMediaAvg + estimate*FromConfig)
   - lib/creative/ip-readiness     (evaluateReadinessGates 6게이트)
   - lib/creative/ip-bible-builder (buildIpBible 13섹션 + buildSubmissionPackage 5종)
   - lib/creative/spoiler-guard    (canExposeInMedia 노출 게이트)
   - lib/creative/previsual-slots  (buildPrevisualSlots 슬롯 plan)

   [정직 — 판단용 라벨 의무]
   - 모든 점수 = StoryConfig 휴리스틱 자동 추정 (confidence 0.55~0.65 엔진 고정 표명).
     실측·LLM 평가 아님. 패널 헤더 + 점수 카드에 "자동 추정 — 판단용" 상시 표기.
   - 점수에 경고색 금지 — 점수 숫자는 중립 잉크 토큰만 사용.
   - 6게이트 5축 입력은 아래 PROXY 주석의 출처 그대로 (새 산식 발명 0):
     rights/riskControl = 30 보수 고정 (media-fit 권리 축과 동일 컨벤션 — config 검증 불가),
     market = estimateGlobalAppealFromConfig.parts.genreGlobalDemand (장르 수요 proxy),
     adaptation = computeMediaAvg (4 매체 평균), assetPackage = 바이블 채움률.
     proxy 출처는 UI 에 전부 노출 (판단용).
   - 엔진이 산출하는 한국어 verdict·reason 문구는 원문 그대로 표시 (무변조 전달).
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Book, Check, Download, Layers, Lock, Shield, X } from "@/components/loreguard/icons";
import type { StoryConfig } from "@/lib/studio-types";
import {
  computeMediaAvg,
  dramaFitScore,
  estimateDramaFitFromConfig,
  estimateGameFitFromConfig,
  estimateGlobalAppealFromConfig,
  estimateWebtoonFitFromConfig,
  gameFitScore,
  globalAppealScore,
  webtoonFitScore,
} from "@/lib/creative/media-fit-score";
import {
  evaluateReadinessGates,
  type IPReadinessParts,
  type ReadinessGatesResult,
} from "@/lib/creative/ip-readiness";
import {
  buildIpBible,
  buildSubmissionPackage,
  IP_BIBLE_SECTION_KEYS,
  type IpBible,
  type IpBibleCluster,
  type IpBibleSection,
  type SpoilerGrade,
  type SubmissionPackage,
  type SubmissionPackageType,
} from "@/lib/creative/ip-bible-builder";
import {
  canExposeInMedia,
  type MediaExposureDecision,
  type MediaTarget,
  type SpoilerLevel,
} from "@/lib/creative/spoiler-guard";
import {
  buildPrevisualSlots,
  type MediumSlotPlan,
  type PrevisualSlotsResult,
} from "@/lib/creative/previsual-slots";

// ============================================================
// PART 1 — 상수 · 순수 헬퍼 (다운로드 · 매핑 · Markdown 직렬화)
// ============================================================

const PACKAGE_TYPES: readonly SubmissionPackageType[] = ["A", "B", "C", "D", "E"];

/**
 * 바이블 SpoilerGrade(§1.1 safe/mixed/ending) → spoiler-guard SpoilerLevel 매핑.
 * [추정 표명] 두 사양의 등급 체계 간 1:1 명세 없음 — 보수 방향 해석 (판단용):
 * safe → Public(자유) · mixed → Internal(회차 확인) · ending → Restricted(도달 증명 필요).
 * publicAtEpisode 정보가 없으므로 엔진이 mixed=WARNING·ending=BLOCKED 보수 판정.
 */
const GRADE_TO_LEVEL: Readonly<Record<SpoilerGrade, SpoilerLevel>> = Object.freeze({
  safe: "Public",
  mixed: "Internal",
  ending: "Restricted",
});

/**
 * 패키지 → 매체 변환 게이트 대상 (canExposeInMedia mediaTarget).
 * [추정 표명] 사양에 패키지→매체 명세 없음 — 패키지 성격 기반 보수 매핑 (판단용):
 * B 영상화=video · C 웹툰화=image · D 라이선스(캐릭 일러/표지)=cover(§3.4 최보수) ·
 * A 출판/E 해외 = 기본 image 게이트(§3.1).
 */
const PACKAGE_MEDIA_TARGET: Readonly<Record<SubmissionPackageType, MediaTarget>> =
  Object.freeze({ A: "image", B: "video", C: "image", D: "cover", E: "image" });

/** 군집 한국어 라벨 (표준 §1.0 — 표시용). */
const CLUSTER_KO: Readonly<Record<IpBibleCluster, string>> = Object.freeze({
  entry: "진입",
  story: "스토리",
  setting: "설정",
  business: "제작·사업",
});

/** 스포일러 등급 표시 라벨. */
const SPOILER_KO: Readonly<Record<SpoilerGrade, string>> = Object.freeze({
  safe: "안전",
  mixed: "혼합",
  ending: "결말",
});

/** Blob 다운로드 (CpJournalPanel triggerDownload 동일 — 실패는 throw → 호출부 표면화) */
function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 파일명 안전화 — 경로·예약 문자 제거 + 40자 상한. */
function sanitizeFilename(s: string): string {
  const t = s.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return t.length > 0 ? t : "work";
}

/** YYYY-MM-DD (파일명용). */
function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 비어 있지 않은 문자열인가 (G0 premise 증빙 판정용). */
function hasNonEmptyText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** 슬롯 plan 의 채워진 슬롯 수 (scene + default — unfilled 제외). */
function countFilledSlots(plan: MediumSlotPlan): number {
  let n = 0;
  for (const cat of plan.categories) {
    for (const slot of cat.slots) {
      if (slot.value !== null) n += 1;
    }
  }
  return n;
}

/** 바이블 섹션 1개 → Markdown 블록 (입력 데이터 무변조 — 형식만). */
function sectionToMd(s: IpBibleSection): string {
  const lines: string[] = [
    `## [${s.code}] ${s.title} — ${CLUSTER_KO[s.cluster]} · 스포일러 ${SPOILER_KO[s.spoiler]}`,
  ];
  if (s.filled) {
    for (const [label, value] of Object.entries(s.fields)) {
      lines.push(`- **${label}**: ${value}`);
    }
  } else {
    lines.push(`> (빈 섹션 — 정직 표시) ${s.missingNote ?? "입력 데이터 없음"}`);
  }
  if (s.pendingSlots.length > 0) {
    lines.push(`- _작가 작성 영역(미채움 슬롯)_: ${s.pendingSlots.join(" · ")}`);
  }
  return lines.join("\n");
}

/** 바이블 전체 → Markdown 문서. */
function bibleToMarkdown(bible: IpBible): string {
  const head = [
    `# IP 바이블 — ${bible.workTitle}`,
    "",
    `- 생성일: ${todayStamp()}`,
    `- 채움: ${bible.filledCount}/${bible.totalSections} 섹션`,
    `- 용도: 판단용 — 자동 조립 (법적 효력 없음)`,
    "",
    `> ${bible.honesty}`,
    "",
  ];
  const body = IP_BIBLE_SECTION_KEYS.map((key) => sectionToMd(bible.sections[key]));
  return head.concat(body.join("\n\n")).join("\n");
}

/** 패키지 → Markdown 문서 (스포일러 노출 판정 포함 — 판정 reason 엔진 원문). */
function packageToMarkdown(
  pkg: SubmissionPackage,
  workTitle: string,
  exposures: ReadonlyMap<string, MediaExposureDecision>,
): string {
  const head = [
    `# IP 제출 패키지 ${pkg.type} (${pkg.label}) — ${workTitle}`,
    "",
    `- 생성일: ${todayStamp()}`,
    `- 포함 섹션: ${pkg.includedKeys.length} (미채움 ${pkg.emptyIncludedCount})`,
    `- 결말 스포일러 섹션 포함: ${pkg.containsEndingSpoiler ? "예 — 공개 범위 주의" : "아니오"}`,
    `- 매체 노출 게이트 대상: ${PACKAGE_MEDIA_TARGET[pkg.type]}`,
    `- 용도: 판단용 — 자동 조립 (법적 효력 없음)`,
    "",
    `> ${pkg.note}`,
    "",
  ];
  const body = pkg.sections.map((s) => {
    const exp = exposures.get(s.key);
    const expLine = exp
      ? `\n- _매체 노출 판정_: ${exp.judgment} — ${exp.reason}`
      : "";
    return sectionToMd(s) + expLine;
  });
  return head.concat(body.join("\n\n")).join("\n");
}

// ============================================================
// PART 2 — 분석 파이프라인 (config → 기존 엔진 산출물 조립 · 산식 발명 0)
// ============================================================

interface MediaFitCard {
  key: "webtoon" | "game" | "drama" | "global";
  score: number;
  verdict: string;
  /** 엔진 표명 confidence (0.55~0.65 — 자동 추정 한계). */
  confidence: number;
}

interface IpAssetAnalysis {
  fits: MediaFitCard[];
  mediaAvg: number;
  parts: IPReadinessParts;
  /** 5축 입력 출처 정직 표기 (판단용 — UI 전부 노출). */
  partsProvenance: string[];
  gates: ReadinessGatesResult;
  bible: IpBible;
  previsual: PrevisualSlotsResult;
}

/**
 * StoryConfig → 기존 엔진 5종 산출물 조립. 순수·동기 (LLM/fetch 0).
 * 모든 수치 = 엔진 결과 무변조 전달. PROXY 만 출처 명시 후 연결.
 */
function analyzeIpAsset(config: StoryConfig | null | undefined): IpAssetAnalysis {
  // --- 매체 fit 4점수 (estimate → 산식 — 둘 다 기존 엔진) ---
  const webtoonEst = estimateWebtoonFitFromConfig(config);
  const gameEst = estimateGameFitFromConfig(config);
  const dramaEst = estimateDramaFitFromConfig(config);
  const globalEst = estimateGlobalAppealFromConfig(config);
  const webtoon = webtoonFitScore(webtoonEst.parts);
  const game = gameFitScore(gameEst.parts);
  const drama = dramaFitScore(dramaEst.parts);
  const global = globalAppealScore(globalEst.parts);

  const mediaAvg = computeMediaAvg({
    webtoon: webtoon.score,
    game: game.score,
    drama: drama.score,
    global: global.score,
  });

  // --- 1차 바이블 (assetPackage proxy = 채움률 산출용) ---
  const firstBible = buildIpBible(config, {
    webtoonFit: webtoon.score,
    gameFit: game.score,
    dramaFit: drama.score,
  });

  // --- G4 증빙: 5 패키지 중 emptyIncludedCount===0 존재 여부 (검증 가능 사실) ---
  let packageComplete = false;
  for (const t of PACKAGE_TYPES) {
    if (buildSubmissionPackage(firstBible, t).emptyIncludedCount === 0) {
      packageComplete = true;
      break;
    }
  }

  // --- 6게이트 5축 입력 (PROXY — 새 산식 발명 0 · 출처 전부 표기) ---
  const assetPackagePct =
    Math.round((firstBible.filledCount / firstBible.totalSections) * 1000) / 10;
  const parts: IPReadinessParts = {
    // 권리: config 로 검증 불가 — media-fit 권리 축과 동일 보수 고정 30
    rights: 30,
    // 시장성 proxy: estimateGlobalAppealFromConfig 의 장르 글로벌 수요 추정 축
    market: globalEst.parts.genreGlobalDemand,
    // 각색 가능성 proxy: 4 매체 fit 단순 평균 (computeMediaAvg)
    adaptation: mediaAvg,
    // 자산 패키지 완성도 proxy: 바이블 13섹션 채움률(%)
    assetPackage: assetPackagePct,
    // 리스크 통제: 리스크 register 부재 — 검증 불가 보수 고정 30
    riskControl: 30,
  };
  const partsProvenance = [
    "rights 30 — config 검증 불가, 보수 고정 (media-fit 권리 축 컨벤션 동일)",
    `market ${parts.market} — proxy: 장르 글로벌 수요 자동 추정 (estimateGlobalAppealFromConfig)`,
    `adaptation ${parts.adaptation} — proxy: 4 매체 fit 평균 (computeMediaAvg)`,
    `assetPackage ${parts.assetPackage} — proxy: 바이블 채움률 ${firstBible.filledCount}/${firstBible.totalSections}`,
    "riskControl 30 — 리스크 register 부재, 보수 고정",
  ];

  // --- G0/G4/G5 증빙: 검증 가능한 것만 제공 · 불가 항목 undefined → UNPROVEN (정직) ---
  const gates = evaluateReadinessGates(parts, mediaAvg, {
    hasPremise: hasNonEmptyText(config?.corePremise) || hasNonEmptyText(config?.synopsis),
    // ending/arc/revision log/red flags — config 로 검증 불가 → 미제공 (UNPROVEN 보수 차단)
    packageComplete,
  });

  // --- 최종 바이블 (ipReadiness 점수 포함 — 점수 무변조 전달) ---
  const bible = buildIpBible(config, {
    webtoonFit: webtoon.score,
    gameFit: game.score,
    dramaFit: drama.score,
    ipReadiness: { score: gates.verdict.score, tier: gates.verdict.tier },
  });

  // --- 프리비주얼 슬롯 plan (참고 — config 에서 기계 대응 가능분만 주입) ---
  const previsual = buildPrevisualSlots({
    episode: config?.episode,
    setting: config?.setting,
    characters: Array.isArray(config?.characters)
      ? config.characters.map((c) => ({ name: c?.name }))
      : undefined,
  });

  return {
    fits: [
      { key: "webtoon", score: webtoon.score, verdict: webtoon.verdict, confidence: webtoonEst.confidence },
      { key: "game", score: game.score, verdict: game.verdict, confidence: gameEst.confidence },
      { key: "drama", score: drama.score, verdict: drama.verdict, confidence: dramaEst.confidence },
      { key: "global", score: global.score, verdict: global.verdict, confidence: globalEst.confidence },
    ],
    mediaAvg,
    parts,
    partsProvenance,
    gates,
    bible,
    previsual,
  };
}

type AssetView = "readiness" | "bible" | "package";

// ============================================================
// PART 3 — 메인 컴포넌트 (slide-over · 탭 3 · 다운로드)
// ============================================================

export default function IpAssetPanel() {
  const { currentSession, language } = useStudio();
  const config = currentSession?.config;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AssetView>("readiness");
  const [pkgType, setPkgType] = useState<SubmissionPackageType>("A");
  const [lastDownload, setLastDownload] = useState<string[] | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  // ----- 오픈 이벤트 청취 — unmount 시 cleanup (CpJournalPanel 패턴 동일) -----
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-ipasset", onOpen);
    return () => window.removeEventListener("loreguard:open-ipasset", onOpen);
  }, []);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ----- 분석 — 오픈 중에만 계산 (순수·동기 엔진 — 네트워크 0) -----
  const analysis = useMemo(
    () => (open && currentSession ? analyzeIpAsset(config) : null),
    [open, currentSession, config],
  );

  // ----- 선택 패키지 + 섹션별 매체 노출 판정 (canExposeInMedia) -----
  const selectedPkg = useMemo(
    () => (analysis ? buildSubmissionPackage(analysis.bible, pkgType) : null),
    [analysis, pkgType],
  );
  const exposures = useMemo(() => {
    const map = new Map<string, MediaExposureDecision>();
    if (!selectedPkg) return map;
    const target = PACKAGE_MEDIA_TARGET[selectedPkg.type];
    for (const s of selectedPkg.sections) {
      // publicAtEpisode 정보 없음 — 엔진이 회차 미상 보수 판정 (mixed=WARNING·ending=BLOCKED)
      map.set(
        s.key,
        canExposeInMedia(GRADE_TO_LEVEL[s.spoiler], target, {
          currentEpisode: typeof config?.episode === "number" ? config.episode : null,
          publicAtEpisode: null,
        }),
      );
    }
    return map;
  }, [selectedPkg, config]);

  // ----- 다운로드 핸들러 (실패 비침묵 — 에러 표면화) -----
  const workSlug = sanitizeFilename(analysis?.bible.workTitle ?? "");

  const handleBibleMd = useCallback(() => {
    if (!analysis) return;
    setDownloadError(null);
    try {
      const name = `ip-bible_${workSlug}_${todayStamp()}.md`;
      triggerDownload(name, bibleToMarkdown(analysis.bible), "text/markdown;charset=utf-8");
      setLastDownload([name]);
    } catch (err) {
      setLastDownload(null);
      setDownloadError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
    }
  }, [analysis, workSlug]);

  const handlePackageDownload = useCallback(
    (format: "json" | "md") => {
      if (!analysis || !selectedPkg) return;
      setDownloadError(null);
      try {
        const base = `ip-package-${selectedPkg.type}_${workSlug}_${todayStamp()}`;
        if (format === "md") {
          const name = `${base}.md`;
          triggerDownload(
            name,
            packageToMarkdown(selectedPkg, analysis.bible.workTitle, exposures),
            "text/markdown;charset=utf-8",
          );
          setLastDownload([name]);
        } else {
          const name = `${base}.json`;
          const payload = {
            kind: "ip-submission-package",
            generatedAt: new Date().toISOString(),
            workTitle: analysis.bible.workTitle,
            judgmentNote:
              "판단용 — StoryConfig 자동 추정 조립 (confidence 0.55~0.65) · 법적 효력 없음",
            honesty: analysis.bible.honesty,
            package: {
              type: selectedPkg.type,
              label: selectedPkg.label,
              note: selectedPkg.note,
              includedKeys: selectedPkg.includedKeys,
              emptyIncludedCount: selectedPkg.emptyIncludedCount,
              containsEndingSpoiler: selectedPkg.containsEndingSpoiler,
              mediaTarget: PACKAGE_MEDIA_TARGET[selectedPkg.type],
            },
            sections: selectedPkg.sections.map((s) => ({
              key: s.key,
              code: s.code,
              title: s.title,
              cluster: s.cluster,
              spoiler: s.spoiler,
              filled: s.filled,
              fields: s.fields,
              pendingSlots: s.pendingSlots,
              missingNote: s.missingNote,
              mediaExposure: exposures.get(s.key) ?? null,
            })),
          };
          triggerDownload(name, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
          setLastDownload([name]);
        }
      } catch (err) {
        setLastDownload(null);
        setDownloadError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
      }
    },
    [analysis, selectedPkg, exposures, workSlug],
  );

  // ----- 가드: 미오픈/세션 없음 → 미렌더 (CpJournalPanel gating 동일) -----
  if (!open || !currentSession || !analysis) return null;

  const { fits, mediaAvg, partsProvenance, gates, bible, previsual } = analysis;
  const passCount = gates.gates.filter((g) => g.status === "PASS").length;

  const fitLabel: Record<MediaFitCard["key"], string> = {
    webtoon: L4(language, { ko: "웹툰화", en: "Webtoon" }),
    game: L4(language, { ko: "게임화", en: "Game" }),
    drama: L4(language, { ko: "영상화", en: "Drama/Film" }),
    global: L4(language, { ko: "해외 진출", en: "Global" }),
  };
  const pkgShort: Record<SubmissionPackageType, string> = {
    A: L4(language, { ko: "A 출판", en: "A Publish" }),
    B: L4(language, { ko: "B 영상", en: "B Screen" }),
    C: L4(language, { ko: "C 웹툰", en: "C Webtoon" }),
    D: L4(language, { ko: "D 라이선스", en: "D License" }),
    E: L4(language, { ko: "E 해외", en: "E Global" }),
  };
  const judgmentLabel = (j: MediaExposureDecision["judgment"]): string =>
    j === "PASS"
      ? L4(language, { ko: "노출 가능", en: "Exposable" })
      : j === "WARNING"
        ? L4(language, { ko: "작가 확인", en: "Author check" })
        : L4(language, { ko: "차단", en: "Blocked" });

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
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
          <Shield size={16} />
          {L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
          <span className="pill gray">
            {L4(language, { ko: "자동 추정 — 판단용", en: "Auto-estimated — for judgment" })}
          </span>
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

        {/* 정직 고지 — LLM/실측 아님 · 법적 효력 없음 */}
        <div className="wr-srow" style={{ color: "var(--ink-2)" }}>
          {L4(language, {
            ko: "모든 점수·판정은 작품 설정 기반 결정론적 자동 추정입니다 (confidence 0.55~0.65 · 실측/LLM 평가 아님 · 법적 효력 없음).",
            en: "All scores and verdicts are deterministic auto-estimates from your story config (confidence 0.55-0.65, not measured or LLM-judged, no legal effect).",
          })}
        </div>

        {/* 탭 토글 — .seg (기존 세그먼트 클래스 재사용) */}
        <div className="seg" style={{ display: "flex", width: "100%" }}>
          <button
            type="button"
            className={view === "readiness" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "readiness"}
            onClick={() => setView("readiness")}
          >
            {L4(language, { ko: "준비도", en: "Readiness" })}
          </button>
          <button
            type="button"
            className={view === "bible" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "bible"}
            onClick={() => setView("bible")}
          >
            {L4(language, { ko: "바이블", en: "Bible" })}
          </button>
          <button
            type="button"
            className={view === "package" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "package"}
            onClick={() => setView("package")}
          >
            {L4(language, { ko: "패키지", en: "Package" })}
          </button>
        </div>

        {/* ① 준비도 — 6게이트 + blocking + 매체 fit 4점수 */}
        {view === "readiness" && (
          <>
            <div className="pcard">
              <div className="pcard-h">
                <Shield size={15} />
                {L4(language, { ko: "실사 6게이트 (G0→G5)", en: "Due-diligence gates (G0-G5)" })}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {passCount}/6 PASS
                </span>
              </div>
              <div className="wr-srow">
                {L4(language, { ko: "현재 게이트", en: "Current gate" })}
                <b>
                  {gates.gate}
                  {gates.allPassed
                    ? ` · ${L4(language, { ko: "전부 통과", en: "all passed" })}`
                    : ""}
                </b>
              </div>
              <div className="wr-srow">
                {L4(language, { ko: "판정 (사양 §4 band)", en: "Verdict (spec §4 band)" })}
                <b>
                  {gates.verdict.score}/100 · tier {gates.verdict.tier} · {gates.verdict.label}
                </b>
              </div>
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {gates.gates.map((g) => (
                  <li key={g.id} className="wr-srow" style={{ alignItems: "flex-start" }}>
                    <span
                      className={`rdot ${g.status === "PASS" ? "green" : "gray"}`}
                      style={{ marginTop: 4 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                        {g.id} {g.name} — {g.status}
                      </span>
                      {g.reason && (
                        <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                          {g.reason}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {L4(language, {
                  ko: `판정 confidence ${gates.confidence} — 미검증 증빙(결말 lock·아크·퇴고 기록·red flag)은 UNPROVEN 보수 차단.`,
                  en: `Verdict confidence ${gates.confidence} — unverifiable evidence (ending lock, arc, revision log, red flags) stays UNPROVEN (conservative).`,
                })}
              </div>
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
                  {L4(language, {
                    ko: "5축 입력 출처 (proxy — 판단용)",
                    en: "5-axis input provenance (proxy, for judgment)",
                  })}
                </summary>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ink-2)" }}>
                  {partsProvenance.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="pcard">
              <div className="pcard-h">
                <Layers size={15} />
                {L4(language, { ko: "매체 적합도 4점수", en: "Media fit scores" })}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, { ko: `평균 ${mediaAvg}`, en: `avg ${mediaAvg}` })}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 8,
                }}
              >
                {fits.map((f) => (
                  <div
                    key={f.key}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      background: "var(--card-2)",
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-1)" }}>
                      {fitLabel[f.key]}
                    </div>
                    {/* 점수 색 경고 금지 — 중립 잉크 토큰만 */}
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-1)" }}>
                      {f.score}
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>/100</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{f.verdict}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
                      {L4(language, {
                        ko: `자동 추정 — 판단용 · confidence ${f.confidence}`,
                        en: `Auto-estimated — for judgment · confidence ${f.confidence}`,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ② 바이블 — 13섹션 미리보기 + 빈 섹션 정직 표시 + MD 다운로드 */}
        {view === "bible" && (
          <div className="pcard">
            <div className="pcard-h">
              <Book size={15} />
              {L4(language, { ko: "IP 바이블 13섹션", en: "IP Bible (13 sections)" })}
              <span className="pill gray" style={{ marginLeft: "auto" }}>
                {L4(language, {
                  ko: `채움 ${bible.filledCount}/${bible.totalSections}`,
                  en: `${bible.filledCount}/${bible.totalSections} filled`,
                })}
              </span>
            </div>
            <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
              {bible.honesty}
            </div>
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {IP_BIBLE_SECTION_KEYS.map((key) => {
                const s = bible.sections[key];
                const preview = Object.entries(s.fields).slice(0, 2);
                return (
                  <li
                    key={key}
                    className="wr-srow"
                    style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
                  >
                    <span className={`rdot ${s.filled ? "green" : "gray"}`} style={{ marginTop: 5 }} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                        [{s.code}] {s.title}
                      </span>{" "}
                      <span className="pill gray">{CLUSTER_KO[s.cluster]}</span>{" "}
                      <span className="pill gray">
                        {L4(language, { ko: "스포일러", en: "spoiler" })} {SPOILER_KO[s.spoiler]}
                      </span>
                      {s.filled ? (
                        preview.map(([label, value]) => (
                          <span
                            key={label}
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--ink-2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}: {value}
                          </span>
                        ))
                      ) : (
                        <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                          {L4(language, { ko: "(빈 섹션) ", en: "(empty) " })}
                          {s.missingNote}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="btn primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              aria-label={L4(language, {
                ko: "IP 바이블 Markdown 다운로드",
                en: "Download IP Bible as Markdown",
              })}
              onClick={handleBibleMd}
            >
              <Download size={14} />
              {L4(language, { ko: "바이블 다운로드 (MD)", en: "Download bible (MD)" })}
            </button>
          </div>
        )}

        {/* ③ 패키지 — 5종 선택 → 미리보기 → JSON/MD 다운로드 + 스포일러 차단 표시 */}
        {view === "package" && selectedPkg && (
          <>
            <div className="seg" style={{ display: "flex", width: "100%" }}>
              {PACKAGE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={pkgType === t ? "on" : ""}
                  style={{ flex: 1 }}
                  aria-pressed={pkgType === t}
                  onClick={() => setPkgType(t)}
                >
                  {pkgShort[t]}
                </button>
              ))}
            </div>

            <div className="pcard">
              <div className="pcard-h">
                <Layers size={15} />
                {selectedPkg.label}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, {
                    ko: `${selectedPkg.includedKeys.length}섹션 · 미채움 ${selectedPkg.emptyIncludedCount}`,
                    en: `${selectedPkg.includedKeys.length} sections · ${selectedPkg.emptyIncludedCount} empty`,
                  })}
                </span>
              </div>
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {selectedPkg.note}
              </div>
              {selectedPkg.containsEndingSpoiler && (
                <div className="wr-srow" style={{ color: "var(--ink-2)" }}>
                  <Lock size={13} />
                  {L4(language, {
                    ko: "결말 스포일러 섹션 포함 — 공개 범위·전달 대상 확인 필요 (판단용)",
                    en: "Contains ending-spoiler sections — review audience before sharing (for judgment)",
                  })}
                </div>
              )}
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {L4(language, {
                  ko: `매체 노출 게이트: ${PACKAGE_MEDIA_TARGET[selectedPkg.type]} — 등급 매핑 안전→Public·혼합→Internal·결말→Restricted (보수 해석·판단용)`,
                  en: `Media exposure gate: ${PACKAGE_MEDIA_TARGET[selectedPkg.type]} — grade map safe→Public, mixed→Internal, ending→Restricted (conservative, for judgment)`,
                })}
              </div>
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {selectedPkg.sections.map((s) => {
                  const exp = exposures.get(s.key);
                  return (
                    <li
                      key={s.key}
                      className="wr-srow"
                      style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
                    >
                      <span
                        className={`rdot ${s.filled ? "green" : "gray"}`}
                        style={{ marginTop: 5 }}
                      />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                          [{s.code}] {s.title}
                        </span>{" "}
                        <span className="pill gray">{SPOILER_KO[s.spoiler]}</span>{" "}
                        {exp &&
                          (exp.judgment === "PASS" ? (
                            <span className="pill green">
                              <Check size={11} /> {judgmentLabel(exp.judgment)}
                            </span>
                          ) : (
                            <span className="pill gray">
                              {exp.judgment === "BLOCKED" && <Lock size={11} />}{" "}
                              {judgmentLabel(exp.judgment)}
                            </span>
                          ))}
                        {!s.filled && (
                          <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                            {L4(language, { ko: "(빈 섹션) ", en: "(empty) " })}
                            {s.missingNote}
                          </span>
                        )}
                        {exp && exp.judgment !== "PASS" && (
                          <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                            {exp.reason}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-label={L4(language, {
                    ko: `패키지 ${selectedPkg.type} JSON 다운로드`,
                    en: `Download package ${selectedPkg.type} as JSON`,
                  })}
                  onClick={() => handlePackageDownload("json")}
                >
                  <Download size={14} />
                  JSON
                </button>
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-label={L4(language, {
                    ko: `패키지 ${selectedPkg.type} Markdown 다운로드`,
                    en: `Download package ${selectedPkg.type} as Markdown`,
                  })}
                  onClick={() => handlePackageDownload("md")}
                >
                  <Download size={14} />
                  MD
                </button>
              </div>
            </div>

            {/* 프리비주얼 슬롯 참고 — visualGuide 포함 패키지(B/C/D)만 */}
            {selectedPkg.includedKeys.includes("visualGuide") && (
              <div className="pcard">
                <div className="pcard-h">
                  <Layers size={15} />
                  {L4(language, {
                    ko: "프리비주얼 슬롯 (참고 — 자동 추정)",
                    en: "Previsual slots (reference, auto-estimated)",
                  })}
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "이미지 슬롯", en: "Image slots" })}
                  <b>
                    {countFilledSlots(previsual.slotEngine.image)}/
                    {previsual.slotEngine.image.totalSlots}
                  </b>
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "영상 슬롯", en: "Video slots" })}
                  <b>
                    {countFilledSlots(previsual.slotEngine.video)}/
                    {previsual.slotEngine.video.totalSlots}
                  </b>
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "음성 슬롯", en: "Voice slots" })}
                  <b>
                    {countFilledSlots(previsual.slotEngine.voice)}/
                    {previsual.slotEngine.voice.totalSlots}
                  </b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                  {L4(language, {
                    ko: `채움 = 작품 설정 + 사양 기본값 (생성 호출 0 · confidence ${previsual.confidence} — 판단용)`,
                    en: `Filled = story config + spec defaults (no generation calls, confidence ${previsual.confidence}, for judgment)`,
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* 다운로드 결과 — 성공/실패 표면화 (비침묵) */}
        {lastDownload && (
          <div className="wr-srow" role="status" style={{ color: "var(--ink-2)" }}>
            <span className="rdot green" />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {lastDownload.join(" · ")}
            </span>
          </div>
        )}
        {downloadError && (
          <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
            <span className="rdot amber" />
            {L4(language, { ko: "다운로드 실패:", en: "Download failed:" })} {downloadError}
          </div>
        )}
      </aside>
    </div>
  );
}
