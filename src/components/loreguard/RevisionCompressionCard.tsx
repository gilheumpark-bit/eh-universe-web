"use client";

/* ===========================================================
   RevisionCompressionCard — RevisionPanel (g) 신호 압축 카드
   [X3-heinrich-compression 2026-06-11]

   하인리히 300→29→1 (claude3 _도구/_하인리히_신호압축_결함피라미드.md):
   · RevisionPanel 의 (a) 퇴고 이슈 / (b) 표현 습관 / (d) QA 4감사관 raw 검출을
     클러스터·FMEA 우선순위로 압축 → vital-few (BLOCKER/WARN/NIT/KEEP·상한 29)
     + 1 verdict (PASS/HOLD/FAIL) 우선 표시.
   · raw 목록은 부모의 "전체 보기" 토글로 항상 접근 가능 (정보 은닉 아님) —
     토글 버튼은 이 카드 헤더에 있고 상태는 부모(RevisionPanel)가 소유.
   · near-miss (사양 §2): 이 카드가 unmount(=패널 닫힘·세션 이탈)될 때
     WARN(BLOCKER 아님)이 남아 있었으면 "무시 1회"로 localStorage 누적 →
     임계 도달 키는 다음 마운트에서 WARN 승격 신호.
   · 도메인 → FMEA 수치 매핑은 사양 문서에 없음 — 보수적 기본값 (각 매핑 주석).
   · 중립 표시 (점수 색 경고 없음) + '판단용' 라벨 — RevisionPanel 정책 동일.
   =========================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { RevisionIssue, RevisionIssueKind, RevisionMetrics } from "@/lib/desktop/revision-analysis";
import type { SignatureHit, SignatureKind } from "@/lib/creative/ai-signature-scan";
import type { AuditFinding, AuditSeverity } from "@/lib/creative/qa-auditor";
import {
  compressFindings,
  recordNearMiss,
  listNearMisses,
  promotedNearMissKeys,
  isNearMissPromoted,
  type NearMissEntry,
  type RawFinding,
  type DecisionGrade,
} from "@/lib/creative/signal-compression";

// ============================================================
// PART 1 — raw 검출 → RawFinding 매핑 (FMEA 보수 기본값)
//   원칙: severity 4 = 출고 차단성(마크다운 잔여·따옴표 붕괴류) · 3 = 문체 경고 ·
//   2 = 참고. severity 5(BLOCKER 직결)는 근거 문서 없이 부여하지 않음 (작가 판단
//   영역 보존). confidence: 결정적 정규식 0.8~0.9 · 휴리스틱 0.7.
// ============================================================

/** % 크기 → occurrence 1-5 근사 (step% 당 +1·보수 클램프). */
function occFromPct(pct: number, step: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 1;
  return Math.max(1, Math.min(5, 1 + Math.floor(pct / step)));
}

/** 퇴고 이슈 kind → FMEA 고정 수치 (보수 기본값 — 문서에 도메인 매핑 없음). */
const ISSUE_FMEA: Record<RevisionIssueKind, { sev: number; det: number; conf: number }> = {
  "tell-heavy": { sev: 3, det: 2, conf: 0.8 },
  repetition: { sev: 3, det: 2, conf: 0.8 },
  "low-variety": { sev: 2, det: 3, conf: 0.7 },
  "low-dialogue": { sev: 2, det: 3, conf: 0.7 },
  // 출고 부적합 잔여(§1.3 — 0이어야 함) = 출고 차단성 → severity 4·정규식 확정 0.9
  "markdown-residue": { sev: 4, det: 2, conf: 0.9 },
};

/** QA 감사관 severity → FMEA severity (high=4·mid=3·low=2 — 보수: 5 미부여). */
const QA_SEV: Record<AuditSeverity, number> = { high: 4, mid: 3, low: 2 };

/** 표현 습관 kind 라벨 (압축 결정 표시용). */
const SIG_KIND_LABEL: Record<SignatureKind, { ko: string; en: string; ja: string; zh: string }> = {
  hedging: {
    ko: "어색한 표현 후보 — 모호한 어미",
    en: "Awkward phrasing — hedging",
    ja: "違和感のある表現 — ぼかした語尾",
    zh: "生硬表达 — 含糊收尾",
  },
  formulaic: {
    ko: "어색한 표현 후보 — 상투 표현",
    en: "Awkward phrasing — stock phrase",
    ja: "違和感のある表現 — 定型表現",
    zh: "生硬表达 — 套话表达",
  },
  tell: {
    ko: "어색한 표현 후보 — 설명 과다",
    en: "Awkward phrasing — over-explaining",
    ja: "違和感のある表現 — 説明過多",
    zh: "生硬表达 — 解释偏多",
  },
  generic: {
    ko: "어색한 표현 후보 — 밋밋한 종결",
    en: "Awkward phrasing — flat ending",
    ja: "違和感のある表現 — 平板な結び",
    zh: "生硬表达 — 收尾偏平",
  },
};

const VERDICT_LABEL: Record<string, { ko: string; en: string }> = {
  PASS: { ko: "준비됨", en: "Ready" },
  HOLD: { ko: "검토", en: "Review" },
  FAIL: { ko: "재정리 필요", en: "Revise" },
};

/** verdict 부가 설명. */
const VERDICT_DESC: Record<string, { ko: string; en: string }> = {
  PASS: { ko: "출고 가능 수준", en: "ready to publish" },
  HOLD: { ko: "먼저 볼 항목을 정리하세요", en: "review the top items first" },
  FAIL: { ko: "큰 흐름부터 다시 정리 필요", en: "rework the main flow first" },
};

/** 등급 표시 순서 (BLOCKER 우선 — 사양 vital-few). */
const GRADE_DISPLAY_ORDER: readonly DecisionGrade[] = ["BLOCKER", "WARN", "NIT", "KEEP"];

const GRADE_LABEL: Record<DecisionGrade, { ko: string; en: string }> = {
  BLOCKER: { ko: "중요", en: "Important" },
  WARN: { ko: "확인", en: "Check" },
  NIT: { ko: "참고", en: "Note" },
  KEEP: { ko: "유지", en: "Keep" },
};

/**
 * (a)(b)(d) raw 검출 + 강점(KEEP·과교정 차단 §8) → RawFinding[]. 순수 변환.
 */
function buildCompressionInput(args: {
  metrics: RevisionMetrics;
  issues: RevisionIssue[];
  sigHits: SignatureHit[];
  sigScore: number;
  audit: AuditFinding[];
  lang: (t: { ko: string; en: string; ja?: string; zh?: string }) => string;
}): RawFinding[] {
  const { metrics, issues, sigHits, sigScore, audit, lang } = args;
  const out: RawFinding[] = [];

  // (a) 퇴고 이슈 — kind 별 클러스터 키 (같은 root cause = 같은 습관)
  for (const it of issues) {
    const m = ISSUE_FMEA[it.kind];
    const occurrence =
      it.kind === "tell-heavy"
        ? occFromPct(metrics.tellPct, 15)
        : it.kind === "repetition"
          ? occFromPct(metrics.repetitionPct, 15)
          : it.kind === "markdown-residue"
            ? Math.max(1, Math.min(5, metrics.artifacts.length))
            : 2; // low-variety/low-dialogue — 빈도 개념 없음 → 보수 2
    out.push({
      source: "revision",
      clusterKey: `revision:${it.kind}`,
      label: it.hint,
      severity: m.sev,
      occurrence,
      detection: m.det,
      confidence: m.conf,
    });
  }

  // (b) 표현 습관 — kind 단위 클러스터 (같은 글쓰기 습관 = 같은 root cause)
  const byKind = new Map<SignatureKind, number>();
  for (const h of sigHits) byKind.set(h.kind, (byKind.get(h.kind) ?? 0) + h.count);
  for (const [kind, count] of byKind) {
    out.push({
      source: "ai-signature",
      clusterKey: `ai-signature:${kind}`,
      label: lang(SIG_KIND_LABEL[kind]),
      detail: lang({ ko: `적중 ${count}회`, en: `${count} hits` }),
      severity: 2, // 문체 양념 — 참고 수준 (보수)
      occurrence: Math.max(1, Math.min(5, 1 + Math.floor(count / 3))),
      detection: 3,
      confidence: 0.7,
    });
  }

  // (d) QA 4감사관 — 발견별 (issue 선두 12자 = 휴리스틱 식별·세션 내 안정)
  for (const fnd of audit) {
    out.push({
      source: "qa-auditor",
      clusterKey: `qa:${fnd.perspective}:${fnd.issue.slice(0, 12)}`,
      label: fnd.issue,
      severity: QA_SEV[fnd.severity],
      occurrence: 2,
      detection: 2,
      confidence: 0.8,
    });
  }

  // KEEP — 유지할 강점 (사양 §8 "KEEP 반드시 포함·과교정 차단"). 충분 분량일 때만.
  if (metrics.chars >= 300) {
    if (metrics.artifacts.length === 0) {
      out.push({
        source: "revision",
        clusterKey: "keep:no-artifacts",
        label: lang({ ko: "출고 잔여물 0 (마크다운·이모지 없음)", en: "No publish residue (markdown/emoji clean)" }),
        polarity: "strength",
        severity: 1,
        occurrence: 1,
        detection: 1,
        confidence: 0.9,
      });
    }
    if (sigScore < 10) {
      out.push({
        source: "ai-signature",
        clusterKey: "keep:low-ai-signature",
        label: lang({
          ko: "표현 습관 안정적",
          en: "Writing style looks clean",
          ja: "表現のクセは安定",
          zh: "表达习惯较稳定",
        }),
        polarity: "strength",
        severity: 1,
        occurrence: 1,
        detection: 1,
        confidence: 0.8,
      });
    }
    if (metrics.sentenceVariety >= 25) {
      out.push({
        source: "revision",
        clusterKey: "keep:sentence-variety",
        label: lang({ ko: "문장 장단 리듬 다양", en: "Varied sentence rhythm" }),
        polarity: "strength",
        severity: 1,
        occurrence: 1,
        detection: 1,
        confidence: 0.8,
      });
    }
  }

  return out;
}

// ============================================================
// PART 2 — 카드 컴포넌트 (near-miss 라이프사이클 포함)
// ============================================================

export interface RevisionCompressionCardProps {
  metrics: RevisionMetrics;
  issues: RevisionIssue[];
  sigHits: SignatureHit[];
  sigScore: number;
  audit: AuditFinding[];
  language: AppLanguage;
  /** '판단용 — 작가 결정 영역' 라벨 (부모와 동일 문자열 재사용). */
  judgementLabel: string;
  /** raw 전체 보기 토글 상태 (부모 소유 — raw 섹션 게이팅에 함께 사용). */
  showRaw: boolean;
  onToggleRaw: () => void;
}

export default function RevisionCompressionCard({
  metrics,
  issues,
  sigHits,
  sigScore,
  audit,
  language,
  judgementLabel,
  showRaw,
  onToggleRaw,
}: RevisionCompressionCardProps) {
  // near-miss 레지스트리 — 마운트(=패널 오픈) 시 1회 read (lazy init·SSR 안전: 스토리지 없으면 [])
  const [promoteKeys] = useState<string[]>(() => promotedNearMissKeys());
  const [nearMisses] = useState<NearMissEntry[]>(() => listNearMisses());

  // 압축 — (a)(b)(d) raw → 클러스터·FMEA → vital-few + 1 verdict (순수 계산)
  const compression = useMemo(
    () =>
      compressFindings(
        buildCompressionInput({
          metrics,
          issues,
          sigHits,
          sigScore,
          audit,
          lang: (t) => L4(language, t),
        }),
        { promoteKeys },
      ),
    [metrics, issues, sigHits, sigScore, audit, language, promoteKeys],
  );

  // WARN 스냅샷 유지 → unmount(닫힘) 시 "무시된 경고"로 1회 누적 (사양 §2)
  const warnSnapshotRef = useRef<{ key: string; label: string }[]>([]);
  useEffect(() => {
    warnSnapshotRef.current = compression.decisions
      .filter((d) => d.grade === "WARN")
      .map((d) => ({ key: d.clusterKey, label: d.label }));
  }, [compression]);
  useEffect(() => {
    return () => {
      const snap = warnSnapshotRef.current;
      warnSnapshotRef.current = [];
      for (const w of snap) recordNearMiss(w.key, w.label);
    };
  }, []);

  // 현재 결정과 관련된 near-miss 누적만 표시 (사양 §9 "near-miss 누적: ..." 라인)
  const relevantNearMisses = useMemo(() => {
    if (nearMisses.length === 0 || compression.decisions.length === 0) return [];
    const keys = new Set(compression.decisions.map((d) => d.clusterKey));
    return nearMisses.filter((e) => keys.has(e.key)).slice(0, 4);
  }, [nearMisses, compression]);

  return (
    <div className="pcard">
      <div className="pcard-h">
        {L4(language, { ko: "핵심 퇴고 후보", en: "Key revision points" })}
        <span className="pill gray">{judgementLabel}</span>
        <button
          type="button"
          className="mini-btn rvcomp-toggle"
          aria-pressed={showRaw}
          aria-label={L4(language, {
            ko: showRaw ? "핵심 보기로 전환" : "세부 후보 전체 보기로 전환",
            en: showRaw ? "Switch to key view" : "Switch to full detail view",
          })}
          onClick={onToggleRaw}
        >
          {L4(language, {
            ko: showRaw ? "핵심 보기" : "전체 보기",
            en: showRaw ? "Key view" : "Show all",
          })}
        </button>
      </div>
      {/* 1 verdict + 등급 분포 (PASS/HOLD/FAIL·BLOCKER/WARN/NIT/KEEP — 사양 용어 그대로) */}
      <div className="rvcomp-verdict">
        <span className="rvcomp-verdict-title">
          {L4(language, VERDICT_LABEL[compression.verdict] ?? { ko: compression.verdict, en: compression.verdict })}
        </span>
        <span className="rvcomp-verdict-desc">
          {L4(language, VERDICT_DESC[compression.verdict])}
        </span>
      </div>
      <div className="rvcomp-summary">
        {L4(language, {
          ko: `중요 ${compression.counts.BLOCKER} / 확인 ${compression.counts.WARN} / 참고 ${compression.counts.NIT} / 유지 ${compression.counts.KEEP} · 먼저 볼 항목 ${compression.clusterCount}개, 전체 후보 ${compression.rawCount}개`,
          en: `Important ${compression.counts.BLOCKER} / Check ${compression.counts.WARN} / Note ${compression.counts.NIT} / Keep ${compression.counts.KEEP} · ${compression.clusterCount} key points from ${compression.rawCount} total items`,
        })}
      </div>
      {compression.decisions.length === 0 ? (
        <div className="wr-srow rvcomp-empty-row">
          {L4(language, { ko: "지금 바로 볼 후보는 없습니다", en: "No immediate findings" })}
        </div>
      ) : (
        <ul className="rvcomp-list">
          {GRADE_DISPLAY_ORDER.flatMap((g) =>
            compression.decisions.filter((d) => d.grade === g),
          ).map((d) => (
            <li key={d.clusterKey} className="wr-srow rvcomp-item">
              <span className="pill gray rvcomp-pill">
                {L4(language, GRADE_LABEL[d.grade])}
              </span>
              <span>
                {d.label}
                {d.rawCount > 1 && (
                  <span className="rvcomp-muted-inline">
                    {" "}
                    {L4(language, { ko: `· 관련 항목 ${d.rawCount}건`, en: ` · ${d.rawCount} related items` })}
                  </span>
                )}
                {d.promoted && (
                  <span className="rvcomp-muted-inline">
                    {" "}
                    {L4(language, { ko: "· 이전에도 반복됨", en: " · repeated from earlier checks" })}
                  </span>
                )}
                {d.judge && (
                  <span className="rvcomp-muted-inline">
                    {" "}
                    {L4(language, { ko: "· 작가 확인 필요", en: " · author confirmation needed" })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {compression.droppedByCap > 0 && (
        <p className="rvcomp-footnote">
          {L4(language, {
            ko: `화면 표시 상한을 넘어 ${compression.droppedByCap}건은 접어 두었습니다. 전체 보기에서 모두 확인할 수 있습니다.`,
            en: `${compression.droppedByCap} items are folded because the list is long. Use Show all to see everything.`,
          })}
        </p>
      )}
      {/* near-miss 누적 — 무시된 경고 선행지표 (사양 §2·§9) */}
      {relevantNearMisses.length > 0 && (
        <p className="rvcomp-footnote">
          {L4(language, { ko: "반복해서 남은 후보:", en: "Repeated unresolved points:" })}{" "}
          {relevantNearMisses
            .map(
              (e) =>
                `${e.label} ${L4(language, { ko: `${e.count}회`, en: `×${e.count}` })}${
                  isNearMissPromoted(e) ? L4(language, { ko: " (우선 확인)", en: " (check first)" }) : ""
                }`,
            )
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
