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

function displayLedgerHash(value: string): string {
  const cleaned = value.replace(/^0x/i, '').trim();
  if (!cleaned) return '—';
  return cleaned.length > 24 ? `${cleaned.slice(0, 16)}...${cleaned.slice(-8)}` : cleaned;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
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
    actorType_ai: '노아',
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
    actorType_human: 'Author',
    actorType_ai: 'NOA',
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
    actorType_ai: 'ノア',
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
    actorType_ai: '诺亚',
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
  let tone: 'charcoal' | 'muted' | 'subtle' | 'gold' | 'danger' = 'charcoal';
  if (polarity === 'lower') {
    tone = score > 50 ? 'danger' : score > 25 ? 'gold' : 'charcoal';
  } else {
    tone = score >= 50 ? 'charcoal' : score >= 25 ? 'muted' : 'subtle';
  }

  // Bar width %
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="cp-axis-card">
      <div className="cp-axis-label">
        {label}
      </div>
      <div className={cx('cp-axis-score', `cp-tone-${tone}`)}>
        {score.toFixed(1)}
      </div>
      <div className="cp-axis-meta">
        / 100 · {desc}
      </div>
      <progress className={cx('cp-meter', `cp-meter-${tone}`)} value={pct} max={100} aria-label={`${label}: ${score.toFixed(1)}`} />
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
    return <p className="cp-muted-note">{t.noEvents}</p>;
  }
  return (
    <table className="cp-table cp-actor-table">
      <thead>
        <tr className="cp-table-head-row">
          <th
            scope="col"
            className="cp-th cp-th-left cp-th-first"
          >
            Actor
          </th>
          <th
            scope="col"
            className="cp-th cp-th-right"
          >
            {t.eventsLogged}
          </th>
          <th
            scope="col"
            className="cp-th cp-th-right"
          >
            {t.share}
          </th>
          <th
            scope="col"
            className="cp-th cp-th-right cp-th-last"
          >
            {t.last}
          </th>
        </tr>
      </thead>
      <tbody>
        {actors.map((a, i) => (
          <tr key={`${a.actorType}-${a.actorId}-${i}`} className="cp-ledger-row">
            <td
              className="cp-td cp-td-first cp-actor-cell"
            >
              <span
                className="cp-actor-type"
              >
                [{actorTypeLabel(a.actorType, language)}]
              </span>
              <span className="cp-actor-id">{a.actorId}</span>
            </td>
            <td
              className="cp-td cp-td-num"
            >
              {a.eventCount}
            </td>
            <td
              className="cp-td cp-td-num"
            >
              {a.share.toFixed(1)}%
            </td>
            <td
              className="cp-td cp-td-num cp-td-last cp-td-muted"
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
    return <p className="cp-muted-note">{t.noEvents}</p>;
  }
  // 최대 7일만 표시 — 가독성 우선
  const recent = days.slice(-12);
  const maxTotal = Math.max(...recent.map((d) => d.total), 1);

  return (
    <div className="cp-chrono-grid">
      {recent.map((d) => {
        return (
          <div
            key={d.date}
            title={`${d.date} · ${d.total} events`}
            className="cp-chrono-cell"
          >
            <progress className="cp-chrono-progress" value={d.total} max={maxTotal} aria-label={`${d.date}: ${d.total}`} />
            <span className="cp-chrono-date">
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
    return <p className="cp-muted-note">—</p>;
  }
  return (
    <table className="cp-table cp-ledger-table">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="cp-ledger-row">
            <td
              className="cp-td cp-td-first cp-ledger-label"
            >
              {r.label}
            </td>
            <td
              className="cp-td cp-ledger-hash"
            >
              {displayLedgerHash(r.hash)}
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
      className={cx('cp-provenance', className)}
    >
      {/* Disclaimer first line */}
      <p className="cp-disclaimer">
        {LIMITATION_TEXT_4LANG[language]}
      </p>

      {/* Header */}
      <header className="cp-provenance-header">
        <h2 className="cp-provenance-title">
          {t.title}
        </h2>
        <p className="cp-provenance-subtitle">{t.subtitle}</p>
        <p className="cp-report-meta">
          {finalTitle} · {t.totalEvents}: {report.totalEvents}
        </p>
      </header>

      {/* Section 1 — Axes */}
      <div className="cp-report-section">
        <h3 className="cp-section-title">
          <ShieldCheck size={12} aria-hidden="true" className="cp-section-icon" />
          {t.axesHeader}
        </h3>
        <div className="cp-axis-grid">
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
      <div className="cp-report-section">
        <h3 className="cp-section-title">
          <Users size={12} aria-hidden="true" className="cp-section-icon" />
          {t.actorsHeader}
        </h3>
        <ActorTable actors={report.actors} language={language} />
      </div>

      {/* Section 3 — Chronology */}
      <div className="cp-report-section">
        <h3 className="cp-section-title">
          <Activity size={12} aria-hidden="true" className="cp-section-icon" />
          {t.chronologyHeader}
        </h3>
        <ChronologyBlock days={report.chronology} language={language} />
      </div>

      {/* Section 4 — Ledger */}
      <div>
        <h3 className="cp-section-title">
          <FileText size={12} aria-hidden="true" className="cp-section-icon" />
          {t.ledgerHeader}
        </h3>
        <LedgerTable rows={report.ledger} language={language} />
      </div>
    </section>
  );
};

export default ProvenanceReport;
