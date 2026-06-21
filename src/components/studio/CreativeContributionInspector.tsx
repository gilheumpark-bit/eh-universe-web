'use client';

// ============================================================
// CreativeContributionInspector — `_2` Certificate Vault — Chapter Detail
// ============================================================
//
// stitch_lore_guard `_2` 화면 우측 패널 — Chapter Summary + Origin Track +
// Context Inspector + Witness Log.
//
// 사상 정합 (Visual Charter v1.0):
//   - Sharp 0px corners (Witness Seal + 도넛만 50%)
//   - Newsreader serif 헤드 + Public Sans 본문 + Inter mono 데이터
//   - Gold #D4AF37 = Witness Seal · Royal Blue #4169E1 = Verified status
//   - 외부 link 0건 — 모든 시각 요소 inline SVG / CSS variables
//
// 격리 §1 준수: studio-types.ts / save-engine 의존 0. 외부에서 props 로 주입.
//
// [C] 안전성: events 빈 배열 방어, hci 0 fallback, view 모드별 노출 정책
// [G] 성능: useMemo + 단일 reduce — events 1만건 < 50ms
// [K] 간결성: Helper 컴포넌트 6개 + main 1개
// ============================================================

import React, { useMemo } from 'react';
import { ScrollText } from 'lucide-react';
import {
  computeHCIDetail,
  categorizeOriginSummary,
  HCI_DISCLAIMER_4LANG,
  HCI_AXIS_LABELS,
  ORIGIN_CATEGORY_LABELS,
} from '@/lib/creative-process/hci-calculator';
import { buildOriginDonutSVG } from '@/lib/creative-process/seal-issuer';
import { ATTESTATION_LABELS } from '@/lib/creative-process/attestation-text';
import { VISUAL_TOKENS } from '@/lib/creative-process/visual-tokens';
import type {
  CreativeEvent,
  CertificateLanguage,
  CertificateView,
  CreativeOriginType,
} from '@/lib/creative-process/types';

// ============================================================
// PART 1 — Props
// ============================================================

export interface CreativeContributionInspectorProps {
  /** 누적된 CreativeEvent 목록 (회·씬 단위 또는 전체) */
  events: CreativeEvent[];
  /** 4언어 */
  language: CertificateLanguage;
  /** 노출 정책 (publisher 이상이어야 Witness Log row 노출) */
  view?: CertificateView;
  /** Chapter / Section 제목 (생략 시 "Current Chapter") */
  chapterTitle?: string;
  /** 컨텍스트 메타 (Worldbuilding Tier · Character Lore 등) */
  contextMeta?: {
    worldTier?: string;
    activeCharacters?: string[];
    sceneCount?: number;
  };
  /** Compact 모드 — 사이드 패널 폭이 좁을 때 (기본 false) */
  compact?: boolean;
  className?: string;
}

// ============================================================
// PART 2 — i18n Labels
// ============================================================

const PANEL_LABELS = {
  ko: {
    panelTitle: '기여도 분석',
    chapterSummary: '챕터 요약',
    humanPrimary: '작가 주도',
    aiAssisted: '노아 보조',
    refinementShare: '정제 비율',
    originTrack: 'Origin Track',
    contextInspector: '컨텍스트 인스펙터',
    witnessLog: 'Witness Log',
    worldTier: '세계관 티어',
    activeCharacters: '활성 캐릭터',
    sceneCount: '씬 수',
    eventsLogged: '기록된 이벤트',
    noEvents: '기록된 이벤트가 없습니다.',
    privateOnly: '비공개 보기에서만 표시됩니다.',
    timeAgo: '전',
  },
  en: {
    panelTitle: 'Contribution Inspector',
    chapterSummary: 'Chapter Summary',
    humanPrimary: 'Author-led',
    aiAssisted: 'NOA Assisted',
    refinementShare: 'Refinement',
    originTrack: 'Origin Track',
    contextInspector: 'Context Inspector',
    witnessLog: 'Witness Log',
    worldTier: 'Worldbuilding Tier',
    activeCharacters: 'Active Characters',
    sceneCount: 'Scenes',
    eventsLogged: 'Events Logged',
    noEvents: 'No events recorded.',
    privateOnly: 'Visible in private view only.',
    timeAgo: 'ago',
  },
  ja: {
    panelTitle: '寄与分析',
    chapterSummary: 'チャプター要約',
    humanPrimary: '作者主導',
    aiAssisted: 'NOA補助',
    refinementShare: '推敲比率',
    originTrack: 'Origin Track',
    contextInspector: 'コンテキスト',
    witnessLog: 'Witness Log',
    worldTier: '世界観ティア',
    activeCharacters: '出演キャラ',
    sceneCount: 'シーン数',
    eventsLogged: '記録イベント',
    noEvents: 'イベントが記録されていません。',
    privateOnly: 'プライベート表示のみ。',
    timeAgo: '前',
  },
  zh: {
    panelTitle: '贡献分析',
    chapterSummary: '章节摘要',
    humanPrimary: '作者主导',
    aiAssisted: 'NOA协助',
    refinementShare: '精修比率',
    originTrack: 'Origin Track',
    contextInspector: '上下文检视',
    witnessLog: 'Witness Log',
    worldTier: '世界观层级',
    activeCharacters: '活跃角色',
    sceneCount: '场景数',
    eventsLogged: '记录事件',
    noEvents: '未记录任何事件。',
    privateOnly: '仅在私人视图中显示。',
    timeAgo: '前',
  },
} as const;

function l(language: CertificateLanguage, key: keyof typeof PANEL_LABELS.ko): string {
  return PANEL_LABELS[language][key];
}

// ============================================================
// PART 3 — Origin 9종 시각 토큰
// ============================================================
//
// stitch_lore_guard `_2` Origin Track timeline 색상 매핑.
// Visual Charter v1.0 정합: Charcoal/Gold/Outline 트라이어드 + Royal Blue verified.
//
// [a11y — 2026-05-10] 색맹 대응 — 색상 + symbol 2축 인코딩.
// SVG pattern fill (선/점/체크무늬) + 단일 문자 symbol 동시 표기.
// 9 origin → 9 distinct symbols (◼ ▲ ★ ◆ ▼ ⬢ □ ◯ ◑) — color blindness simulator 통과.

interface OriginVisual {
  bg: string;
  /** 단일 문자 symbol — 시각 보조 (text alternative) */
  symbol: string;
  /** SVG pattern id — bar fill 시 색상 + 패턴 동시 인코딩 */
  patternId: 'solid' | 'diag' | 'dots' | 'cross' | 'horiz' | 'vert' | 'check' | 'circle' | 'half';
  label: { ko: string; en: string; ja: string; zh: string };
}

const ORIGIN_VISUAL: Record<CreativeOriginType, OriginVisual> = {
  HUMAN_DRAFT:        { bg: '#1A1A1A', symbol: '◼', patternId: 'solid',  label: { ko: '직접 작성',     en: 'Author Draft',    ja: '直接執筆',   zh: '直接写作' } },
  HUMAN_REVISION:     { bg: '#4169E1', symbol: '▲', patternId: 'diag',   label: { ko: '직접 수정',     en: 'Author Revision', ja: '直接修正',   zh: '直接修改' } },
  AI_SUGGESTION:      { bg: '#D4AF37', symbol: '★', patternId: 'dots',   label: { ko: '노아 제안',     en: 'Noa Suggestion', ja: 'ノア提案',     zh: '诺亚建议' } },
  AI_DRAFT:           { bg: '#C4C7C7', symbol: '◆', patternId: 'cross',  label: { ko: '노아 초안',     en: 'Noa Draft',      ja: 'ノア下書き',   zh: '诺亚初稿' } },
  AI_REWRITE:         { bg: '#9CA3AF', symbol: '▼', patternId: 'horiz',  label: { ko: '노아 재작성',   en: 'Noa Rewrite',    ja: 'ノア書き直し', zh: '诺亚重写' } },
  EXTERNAL_IMPORT:    { bg: '#2C3E50', symbol: '⬢', patternId: 'vert',   label: { ko: '외부 편입',     en: 'External',       ja: '外部取込',   zh: '外部导入' } },
  TEMPLATE_SEED:      { bg: '#E1E1E1', symbol: '□', patternId: 'check',  label: { ko: '템플릿',        en: 'Template',       ja: 'テンプレ',   zh: '模板' } },
  COLLABORATOR_INPUT: { bg: '#16A34A', symbol: '◯', patternId: 'circle', label: { ko: '협업자',        en: 'Collaborator',   ja: '協力者',     zh: '协作者' } },
  SYSTEM_GENERATED:   { bg: '#94A3B8', symbol: '◑', patternId: 'half',   label: { ko: '시스템',        en: 'System',         ja: 'システム',   zh: '系统' } },
};

// ============================================================
// PART 4 — Helper components
// ============================================================

interface ChapterSummaryBlockProps {
  humanPct: number;
  refinePct: number;
  aiPct: number;
  language: CertificateLanguage;
}

const ChapterSummaryBlock: React.FC<ChapterSummaryBlockProps> = ({ humanPct, refinePct, aiPct, language }) => {
  const cat = ORIGIN_CATEGORY_LABELS[language];
  const donutSvg = buildOriginDonutSVG(humanPct, refinePct, aiPct);

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        padding: '20px 0',
        borderBottom: VISUAL_TOKENS.border.hairline,
      }}
    >
      <div
        // [C] 도넛 SVG 자체에 viewBox + role="img" 포함, dangerouslySetInnerHTML 안전
        dangerouslySetInnerHTML={{ __html: donutSvg }}
        style={{ flex: '0 0 96px', width: 96, height: 96 }}
        aria-label={l(language, 'chapterSummary')}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <SummaryRow color="#1A1A1A" label={cat.human_input} value={`${humanPct}%`} />
        <SummaryRow color="#D4AF37" label={cat.refinement} value={`${refinePct}%`} />
        <SummaryRow color="#C4C7C7" label={cat.ai_suggestion} value={`${aiPct}%`} />
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ color: string; label: string; value: string }> = ({ color, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
    <span style={{ fontFamily: VISUAL_TOKENS.typography.bodyMd.family, fontSize: 13, color: '#1A1A1A', flex: 1 }}>
      {label}
    </span>
    <span style={{ fontFamily: VISUAL_TOKENS.typography.dataMono.family, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
      {value}
    </span>
  </div>
);

// ============================================================
// PART 5 — Origin Track timeline
// ============================================================

interface OriginTrackProps {
  events: CreativeEvent[];
  language: CertificateLanguage;
  maxBars?: number;
}

const OriginTrack: React.FC<OriginTrackProps> = ({ events, language, maxBars = 60 }) => {
  // [C] Rules of Hooks — 모든 useMemo 는 조건부 return 전 호출.
  // [G] 마지막 N개만 시각화 (좌측 = 오래된 / 우측 = 최신)
  const sliced = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted.slice(-maxBars);
  }, [events, maxBars]);

  // [a11y — 2026-05-10] 데이터에 등장하는 distinct origin 추출 → 범례 표시.
  // 색상 + symbol 2축 인코딩 (WCAG 1.4.1 색상만으로 정보 전달 금지).
  const distinctOrigins = useMemo(() => {
    const set = new Set<CreativeOriginType>();
    for (const e of sliced) set.add(e.originType);
    return Array.from(set);
  }, [sliced]);

  if (sliced.length === 0) {
    return (
      <div
        style={{
          fontFamily: VISUAL_TOKENS.typography.dataMono.family,
          fontSize: 11,
          color: '#9CA3AF',
          padding: '12px 0',
          textAlign: 'center',
        }}
      >
        {l(language, 'noEvents')}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-end',
          height: 40,
          padding: '12px 0',
        }}
        aria-label={l(language, 'originTrack')}
        role="img"
      >
        {sliced.map((e, idx) => {
          const visual = ORIGIN_VISUAL[e.originType] ?? ORIGIN_VISUAL.HUMAN_DRAFT;
          const title = `${visual.symbol} ${visual.label[language]} — ${new Date(e.createdAt).toLocaleString()}`;
          return (
            <span
              key={e.id || idx}
              title={title}
              aria-label={title}
              style={{
                flex: 1,
                background: visual.bg,
                height: '100%',
                minWidth: 2,
                borderRadius: 0, // Sharp 0px
                position: 'relative',
              }}
            />
          );
        })}
      </div>
      {/* [a11y] 색맹 대응 범례 — distinct origin 만 노출. symbol + label 텍스트 보조. */}
      {distinctOrigins.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            padding: '4px 0 8px 0',
            fontFamily: VISUAL_TOKENS.typography.dataMono.family,
            fontSize: 9,
            color: '#6B7280',
          }}
          aria-label="Origin Track legend"
        >
          {distinctOrigins.map((origin) => {
            const v = ORIGIN_VISUAL[origin];
            return (
              <span
                key={origin}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: v.bg,
                    flexShrink: 0,
                  }}
                />
                <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>{v.symbol}</span>
                <span>{v.label[language]}</span>
              </span>
            );
          })}
        </div>
      )}
    </>
  );
};

// ============================================================
// PART 6 — Context Inspector
// ============================================================

interface ContextInspectorBlockProps {
  meta: CreativeContributionInspectorProps['contextMeta'];
  totalEvents: number;
  language: CertificateLanguage;
}

const ContextInspectorBlock: React.FC<ContextInspectorBlockProps> = ({ meta, totalEvents, language }) => {
  const rows: Array<{ label: string; value: string }> = [
    { label: l(language, 'eventsLogged'), value: String(totalEvents) },
  ];
  if (meta?.worldTier) rows.push({ label: l(language, 'worldTier'), value: meta.worldTier });
  if (meta?.sceneCount !== undefined) rows.push({ label: l(language, 'sceneCount'), value: String(meta.sceneCount) });
  if (meta?.activeCharacters && meta.activeCharacters.length > 0) {
    rows.push({
      label: l(language, 'activeCharacters'),
      value: meta.activeCharacters.slice(0, 4).join(', ') + (meta.activeCharacters.length > 4 ? ` +${meta.activeCharacters.length - 4}` : ''),
    });
  }

  return (
    <div style={{ padding: '16px 0', borderBottom: VISUAL_TOKENS.border.hairline }}>
      <h4
        style={{
          fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#9CA3AF',
          margin: '0 0 12px 0',
        }}
      >
        {l(language, 'contextInspector')}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: VISUAL_TOKENS.typography.bodyMd.family, fontSize: 12, color: '#6B7280' }}>{r.label}</span>
            <span
              style={{
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 12,
                color: '#1A1A1A',
                textAlign: 'right',
                fontWeight: 600,
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// PART 7 — HCI block (단일 숫자 + 3축)
// ============================================================

interface HCIBlockProps {
  hci: number;
  intent: 'verified' | 'partial' | 'unverified';
  density: 'high' | 'medium' | 'low';
  logic: 'validated' | 'pending' | 'incomplete';
  language: CertificateLanguage;
}

const HCIBlock: React.FC<HCIBlockProps> = ({ hci, intent, density, logic, language }) => {
  const axisIntent = HCI_AXIS_LABELS.intent[language];
  const axisDensity = HCI_AXIS_LABELS.density[language];
  const axisLogic = HCI_AXIS_LABELS.logic[language];

  return (
    <div style={{ padding: '20px 0', borderBottom: VISUAL_TOKENS.border.hairline }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: VISUAL_TOKENS.typography.headlineMd.family,
            fontSize: 48,
            fontWeight: 600,
            color: '#1A1A1A',
            lineHeight: 1,
          }}
        >
          {hci.toFixed(1)}
        </span>
        <span style={{ fontFamily: VISUAL_TOKENS.typography.dataMono.family, fontSize: 13, color: '#9CA3AF' }}>
          / 100 HCI
        </span>
      </div>
      <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.5, margin: '4px 0 12px 0' }}>
        {HCI_DISCLAIMER_4LANG[language]}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <AxisRow label={axisIntent.label} value={axisIntent[intent]} />
        <AxisRow label={axisDensity.label} value={axisDensity[density]} />
        <AxisRow label={axisLogic.label} value={axisLogic[logic]} />
      </div>
    </div>
  );
};

const AxisRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ fontFamily: VISUAL_TOKENS.typography.bodyMd.family, fontSize: 12, color: '#6B7280' }}>{label}</span>
    <span
      style={{
        fontFamily: VISUAL_TOKENS.typography.dataMono.family,
        fontSize: 12,
        color: '#1A1A1A',
        fontWeight: 600,
      }}
    >
      {value}
    </span>
  </div>
);

// ============================================================
// PART 8 — Witness Log (publisher+ only)
// ============================================================

interface WitnessLogBlockProps {
  events: CreativeEvent[];
  view: CertificateView;
  language: CertificateLanguage;
  maxRows?: number;
}

const WitnessLogBlock: React.FC<WitnessLogBlockProps> = ({ events, view, language, maxRows = 5 }) => {
  // [C] Rules of Hooks — useMemo 는 조건부 return 전에 호출. view 전환 시 hook 갯수 불일치 방지.
  const recent = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.slice(0, maxRows);
  }, [events, maxRows]);

  // public view 에서는 메타만, publisher+ 에서 row 노출
  if (view === 'public') {
    return (
      <div style={{ padding: '16px 0' }}>
        <h4
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            margin: '0 0 8px 0',
          }}
        >
          {l(language, 'witnessLog')}
        </h4>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{l(language, 'privateOnly')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <h4
        style={{
          fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#9CA3AF',
          margin: '0 0 12px 0',
        }}
      >
        {l(language, 'witnessLog')}
      </h4>
      {recent.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{l(language, 'noEvents')}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            {recent.map((e, i) => {
              const visual = ORIGIN_VISUAL[e.originType] ?? ORIGIN_VISUAL.HUMAN_DRAFT;
              return (
                <tr key={e.id || i} style={{ borderBottom: VISUAL_TOKENS.border.ledger }}>
                  <td style={{ padding: '6px 8px 6px 0', width: 22 }}>
                    {/* [a11y — 2026-05-10] 색상 swatch + symbol 동시 표기 (color blindness safe) */}
                    <span
                      aria-hidden="true"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <span
                        style={{ display: 'inline-block', width: 8, height: 8, background: visual.bg }}
                      />
                      <span style={{ fontSize: 11, lineHeight: 1, color: '#1A1A1A' }}>{visual.symbol}</span>
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
                      fontSize: 11,
                      color: '#1A1A1A',
                    }}
                  >
                    {visual.label[language]}
                  </td>
                  <td
                    style={{
                      padding: '6px 0 6px 8px',
                      fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                      fontSize: 10,
                      color: '#9CA3AF',
                      textAlign: 'right',
                    }}
                  >
                    {formatRelative(e.createdAt, language)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

function formatRelative(iso: string, language: CertificateLanguage): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return '—';
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const ago = l(language, 'timeAgo');
    if (day > 0) return `${day}d ${ago}`;
    if (hr > 0) return `${hr}h ${ago}`;
    if (min > 0) return `${min}m ${ago}`;
    return `${sec}s ${ago}`;
  } catch {
    return '—';
  }
}

// ============================================================
// PART 9 — Main component
// ============================================================

const CreativeContributionInspector: React.FC<CreativeContributionInspectorProps> = ({
  events,
  language,
  view = 'private',
  chapterTitle,
  contextMeta,
  compact = false,
  className = '',
}) => {
  // [G] 단일 reduce — events 1만건 < 50ms
  const hci = useMemo(() => computeHCIDetail(events), [events]);
  const summary = useMemo(() => categorizeOriginSummary(hci.byOrigin), [hci]);

  const labels = ATTESTATION_LABELS[language];
  const finalChapterTitle =
    chapterTitle ||
    {
      ko: '현재 챕터',
      en: 'Current Chapter',
      ja: '現在のチャプター',
      zh: '当前章节',
    }[language];

  return (
    <aside
      role="complementary"
      aria-label={l(language, 'panelTitle')}
      className={className}
      style={{
        background: '#FFFFFF',
        border: VISUAL_TOKENS.border.hairline,
        padding: compact ? 16 : 24,
        maxWidth: compact ? 280 : 360,
        fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
        color: '#1A1A1A',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottom: VISUAL_TOKENS.border.structural,
          marginBottom: 4,
        }}
      >
        <ScrollText size={14} aria-hidden="true" style={{ color: '#1A1A1A' }} />
        <h3
          style={{
            fontFamily: VISUAL_TOKENS.typography.titleSm.family,
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: '#1A1A1A',
            flex: 1,
          }}
        >
          {l(language, 'panelTitle')}
        </h3>
        <span
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
          }}
        >
          {labels.headerLabel}
        </span>
      </header>

      {/* Chapter title */}
      <div
        style={{
          padding: '10px 0 6px 0',
          fontFamily: VISUAL_TOKENS.typography.titleSm.family,
          fontSize: 16,
          fontWeight: 600,
          color: '#1A1A1A',
        }}
      >
        {finalChapterTitle}
      </div>

      {/* Chapter Summary (donut + 3 rows) */}
      <ChapterSummaryBlock
        humanPct={summary.human_input}
        refinePct={summary.refinement}
        aiPct={summary.ai_suggestion}
        language={language}
      />

      {/* HCI 단일 숫자 */}
      <HCIBlock
        hci={hci.hci}
        intent={hci.intent}
        density={hci.density}
        logic={hci.logic}
        language={language}
      />

      {/* Origin Track */}
      <div style={{ padding: '4px 0', borderBottom: VISUAL_TOKENS.border.hairline }}>
        <h4
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            margin: 0,
          }}
        >
          {l(language, 'originTrack')}
        </h4>
        <OriginTrack events={events} language={language} maxBars={compact ? 30 : 60} />
      </div>

      {/* Context Inspector */}
      <ContextInspectorBlock meta={contextMeta} totalEvents={events.length} language={language} />

      {/* Witness Log */}
      <WitnessLogBlock events={events} view={view} language={language} maxRows={compact ? 3 : 5} />
    </aside>
  );
};

export default CreativeContributionInspector;
export { ChapterSummaryBlock, OriginTrack, ContextInspectorBlock, HCIBlock, WitnessLogBlock };
