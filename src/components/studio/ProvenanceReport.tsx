'use client';

// ============================================================
// ProvenanceReport — `_4` Provenance Report 화면
// ============================================================
//
// stitch_lore_guard `_4` 화면 — 3축 점수 + Active Actors + Chronology +
// Cryptographic Ledger.
//
// 사상 정합 (Visual Charter v1.0):
//   - Sharp 0px corners (Witness Seal 만 50%)
//   - Newsreader serif 헤드 + Public Sans 본문 + Inter mono 데이터
//   - Gold #D4AF37 / Royal Blue #4169E1 / Charcoal #1A1A1A 트라이어드
//   - 외부 link 0건 — 모든 시각 요소 inline
//
// 격리 §1 준수: studio-types.ts / save-engine 의존 0.
//
// [C] 안전성: events 빈 배열 방어, axis 0 fallback, NaN 방지
// [G] 성능: useMemo + analyzeProvenance 단일 reduce
// [K] 간결성: helper 4개 + main 1개
// ============================================================

import React, { useMemo } from 'react';
import { ShieldCheck, Activity, Users, FileText } from 'lucide-react';
import {
  analyzeProvenance,
  PROVENANCE_AXIS_LABELS,
  type ProvenanceActor,
  type ProvenanceChronologyDay,
  type ProvenanceLedgerRow,
} from '@/lib/creative-process/provenance-analyzer';
import { VISUAL_TOKENS } from '@/lib/creative-process/visual-tokens';
import { LIMITATION_TEXT_4LANG } from '@/lib/creative-process/limitation-text';
import type { CreativeEvent, CertificateLanguage } from '@/lib/creative-process/types';

// ============================================================
// PART 1 — Props
// ============================================================

export interface ProvenanceReportProps {
  events: CreativeEvent[];
  language: CertificateLanguage;
  hashes?: {
    manuscriptHash?: string;
    timelineHash?: string;
    sourceSummaryHash?: string;
    sealNumber?: string | null;
  };
  /** 화면 헤더 — 작품명 (생략 시 4언어 default) */
  workTitle?: string;
  className?: string;
}

// ============================================================
// PART 2 — i18n
// ============================================================

const LABELS = {
  ko: {
    title: '출처 보고서',
    subtitle: '3축 점수 · 활성 행위자 · 연대기 · 암호 장부',
    axesHeader: '핵심 지표',
    actorsHeader: '활성 행위자',
    chronologyHeader: '연대기',
    ledgerHeader: '암호 장부',
    eventsLogged: '기록된 이벤트',
    totalEvents: '총 이벤트',
    noEvents: '기록된 이벤트가 없습니다.',
    last: '최근',
    share: '비중',
    actorType_human: '작가',
    actorType_ai: 'AI',
    actorType_system: '시스템',
    actorType_collaborator: '협업자',
  },
  en: {
    title: 'Provenance Report',
    subtitle: '3-axis scores · Active actors · Chronology · Cryptographic ledger',
    axesHeader: 'Core Metrics',
    actorsHeader: 'Active Actors',
    chronologyHeader: 'Chronology',
    ledgerHeader: 'Cryptographic Ledger',
    eventsLogged: 'Events Logged',
    totalEvents: 'Total Events',
    noEvents: 'No events recorded.',
    last: 'Last',
    share: 'Share',
    actorType_human: 'Human',
    actorType_ai: 'AI',
    actorType_system: 'System',
    actorType_collaborator: 'Collaborator',
  },
  ja: {
    title: 'プロビナンスレポート',
    subtitle: '3軸スコア · 活発な行為者 · 年代記 · 暗号台帳',
    axesHeader: '主要指標',
    actorsHeader: '活発な行為者',
    chronologyHeader: '年代記',
    ledgerHeader: '暗号台帳',
    eventsLogged: '記録イベント',
    totalEvents: '総イベント',
    noEvents: 'イベントが記録されていません。',
    last: '最終',
    share: '比率',
    actorType_human: '作者',
    actorType_ai: 'AI',
    actorType_system: 'システム',
    actorType_collaborator: '協力者',
  },
  zh: {
    title: '来源报告',
    subtitle: '3轴评分 · 活跃行为者 · 年表 · 加密账本',
    axesHeader: '核心指标',
    actorsHeader: '活跃行为者',
    chronologyHeader: '年表',
    ledgerHeader: '加密账本',
    eventsLogged: '记录事件',
    totalEvents: '总事件',
    noEvents: '未记录任何事件。',
    last: '最近',
    share: '占比',
    actorType_human: '作者',
    actorType_ai: 'AI',
    actorType_system: '系统',
    actorType_collaborator: '协作者',
  },
} as const;

function actorTypeLabel(type: ProvenanceActor['actorType'], lang: CertificateLanguage): string {
  const t = LABELS[lang];
  switch (type) {
    case 'human': return t.actorType_human;
    case 'ai': return t.actorType_ai;
    case 'system': return t.actorType_system;
    case 'collaborator': return t.actorType_collaborator;
    default: return type;
  }
}

// ============================================================
// PART 3 — Axis card
// ============================================================

interface AxisCardProps {
  label: string;
  desc: string;
  score: number;
  /** 'higher-is-better' | 'lower-is-better' */
  polarity?: 'higher' | 'lower';
}

const AxisCard: React.FC<AxisCardProps> = ({ label, desc, score, polarity = 'higher' }) => {
  // Color: high score (higher polarity) = charcoal, low = outline
  // For lower polarity (drift), invert: high score = warning, low = ok
  let color = '#1A1A1A';
  if (polarity === 'lower') {
    color = score > 50 ? '#B91C1C' : score > 25 ? '#D4AF37' : '#1A1A1A';
  } else {
    color = score >= 50 ? '#1A1A1A' : score >= 25 ? '#6B7280' : '#9CA3AF';
  }

  // Bar width %
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      style={{
        flex: 1,
        padding: 20,
        border: VISUAL_TOKENS.border.hairline,
        background: '#FFFFFF',
        borderRadius: 0,
      }}
    >
      <div
        style={{
          fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#9CA3AF',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: VISUAL_TOKENS.typography.headlineMd.family,
          fontSize: 40,
          fontWeight: 600,
          color,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {score.toFixed(1)}
      </div>
      <div
        style={{
          fontFamily: VISUAL_TOKENS.typography.dataMono.family,
          fontSize: 10,
          color: '#9CA3AF',
          marginBottom: 12,
        }}
      >
        / 100 · {desc}
      </div>
      <div
        style={{
          height: 4,
          background: '#E1E1E1',
          position: 'relative',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================
// PART 4 — Active Actors table
// ============================================================

const ActorTable: React.FC<{ actors: ProvenanceActor[]; language: CertificateLanguage }> = ({
  actors,
  language,
}) => {
  const t = LABELS[language];
  if (actors.length === 0) {
    return <p style={{ color: '#9CA3AF', fontSize: 12 }}>{t.noEvents}</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: VISUAL_TOKENS.border.structural }}>
          <th
            scope="col"
            style={{
              textAlign: 'left',
              padding: '8px 12px 8px 0',
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
            }}
          >
            Actor
          </th>
          <th
            scope="col"
            style={{
              textAlign: 'right',
              padding: '8px 12px',
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
            }}
          >
            {t.eventsLogged}
          </th>
          <th
            scope="col"
            style={{
              textAlign: 'right',
              padding: '8px 12px',
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
            }}
          >
            {t.share}
          </th>
          <th
            scope="col"
            style={{
              textAlign: 'right',
              padding: '8px 0 8px 12px',
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
            }}
          >
            {t.last}
          </th>
        </tr>
      </thead>
      <tbody>
        {actors.map((a, i) => (
          <tr key={`${a.actorType}-${a.actorId}-${i}`} style={{ borderBottom: VISUAL_TOKENS.border.ledger }}>
            <td
              style={{
                padding: '8px 12px 8px 0',
                fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#9CA3AF',
                  marginRight: 6,
                }}
              >
                [{actorTypeLabel(a.actorType, language)}]
              </span>
              <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{a.actorId}</span>
            </td>
            <td
              style={{
                padding: '8px 12px',
                textAlign: 'right',
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 12,
                color: '#1A1A1A',
              }}
            >
              {a.eventCount}
            </td>
            <td
              style={{
                padding: '8px 12px',
                textAlign: 'right',
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 12,
                color: '#1A1A1A',
              }}
            >
              {a.share.toFixed(1)}%
            </td>
            <td
              style={{
                padding: '8px 0 8px 12px',
                textAlign: 'right',
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 11,
                color: '#9CA3AF',
              }}
            >
              {formatDateOnly(a.lastActiveAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function formatDateOnly(iso: string): string {
  try {
    return iso.slice(0, 10);
  } catch {
    return '—';
  }
}

// ============================================================
// PART 5 — Chronology block (일자별 stack)
// ============================================================

const ChronologyBlock: React.FC<{
  days: ProvenanceChronologyDay[];
  language: CertificateLanguage;
}> = ({ days, language }) => {
  const t = LABELS[language];
  if (days.length === 0) {
    return <p style={{ color: '#9CA3AF', fontSize: 12 }}>{t.noEvents}</p>;
  }
  // 최대 7일만 표시 — 가독성 우선
  const recent = days.slice(-12);
  const maxTotal = Math.max(...recent.map((d) => d.total), 1);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${recent.length}, 1fr)`,
        gap: 6,
        alignItems: 'flex-end',
        height: 100,
        paddingTop: 12,
      }}
    >
      {recent.map((d) => {
        const heightPct = (d.total / maxTotal) * 100;
        return (
          <div
            key={d.date}
            title={`${d.date} · ${d.total} events`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${heightPct}%`,
                background: '#1A1A1A',
                minHeight: 2,
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 9,
                color: '#9CA3AF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// PART 6 — Cryptographic Ledger
// ============================================================

const LedgerTable: React.FC<{ rows: ProvenanceLedgerRow[]; language: CertificateLanguage }> = ({
  rows,
  // language 는 추후 4언어 라벨 추가 시 사용 — 현재는 hash row 만 노출하여 미사용.
  language: _language,
}) => {
  if (rows.length === 0) {
    return <p style={{ color: '#9CA3AF', fontSize: 12 }}>—</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: VISUAL_TOKENS.border.ledger }}>
            <td
              style={{
                padding: '10px 12px 10px 0',
                fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B7280',
                width: 200,
                verticalAlign: 'top',
              }}
            >
              {r.label}
            </td>
            <td
              style={{
                padding: '10px 0',
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 11,
                color: '#1A1A1A',
                wordBreak: 'break-all',
              }}
            >
              {r.hash}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ============================================================
// PART 7 — Main component
// ============================================================

const ProvenanceReport: React.FC<ProvenanceReportProps> = ({
  events,
  language,
  hashes,
  workTitle,
  className = '',
}) => {
  const t = LABELS[language];
  const axisLabels = PROVENANCE_AXIS_LABELS[language];

  const report = useMemo(
    () => analyzeProvenance({ events, language, hashes }),
    [events, language, hashes],
  );

  const finalTitle =
    workTitle ||
    {
      ko: '내 작품',
      en: 'My Work',
      ja: '自作品',
      zh: '我的作品',
    }[language];

  return (
    <section
      aria-label={t.title}
      className={className}
      style={{
        background: '#FFFFFF',
        border: VISUAL_TOKENS.border.hairline,
        padding: 32,
        fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
        color: '#1A1A1A',
      }}
    >
      {/* Disclaimer first line */}
      <p
        style={{
          fontSize: 11,
          color: '#9CA3AF',
          borderBottom: VISUAL_TOKENS.border.hairline,
          paddingBottom: 12,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        {LIMITATION_TEXT_4LANG[language]}
      </p>

      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: VISUAL_TOKENS.typography.headlineMd.family,
            fontSize: 32,
            fontWeight: 500,
            margin: '0 0 8px 0',
            color: '#1A1A1A',
            letterSpacing: '-0.01em',
          }}
        >
          {t.title}
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px 0' }}>{t.subtitle}</p>
        <p
          style={{
            fontFamily: VISUAL_TOKENS.typography.dataMono.family,
            fontSize: 11,
            color: '#9CA3AF',
            margin: 0,
          }}
        >
          {finalTitle} · {t.totalEvents}: {report.totalEvents}
        </p>
      </header>

      {/* Section 1 — Axes */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldCheck size={12} aria-hidden="true" />
          {t.axesHeader}
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <AxisCard
            label={axisLabels.coreIntegrity.label}
            desc={axisLabels.coreIntegrity.desc}
            score={report.axes.coreIntegrity}
            polarity="higher"
          />
          <AxisCard
            label={axisLabels.narrativeDrift.label}
            desc={axisLabels.narrativeDrift.desc}
            score={report.axes.narrativeDrift}
            polarity="lower"
          />
          <AxisCard
            label={axisLabels.controlDensity.label}
            desc={axisLabels.controlDensity.desc}
            score={report.axes.controlDensity}
            polarity="higher"
          />
        </div>
      </div>

      {/* Section 2 — Actors */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Users size={12} aria-hidden="true" />
          {t.actorsHeader}
        </h3>
        <ActorTable actors={report.actors} language={language} />
      </div>

      {/* Section 3 — Chronology */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Activity size={12} aria-hidden="true" />
          {t.chronologyHeader}
        </h3>
        <ChronologyBlock days={report.chronology} language={language} />
      </div>

      {/* Section 4 — Ledger */}
      <div>
        <h3
          style={{
            fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileText size={12} aria-hidden="true" />
          {t.ledgerHeader}
        </h3>
        <LedgerTable rows={report.ledger} language={language} />
      </div>
    </section>
  );
};

export default ProvenanceReport;
