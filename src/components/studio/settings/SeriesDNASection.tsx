'use client';

// ============================================================
// PART 1 — Imports & Types (SeriesDNASection)
// ============================================================
//
// Settings > Writing 탭 하단에 표시되는 시리즈 DNA 분석 섹션.
// 작가 개인 패턴 / 자주 쓰는 장치 / 회수율 등 — 로컬 분석만.
// 외부 전송 절대 금지(M3 원칙 #5).

import React, { useMemo } from 'react';
import { Activity, FileText } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, EpisodeSceneSheet, SceneDirectionData } from '@/lib/studio-types';
import {
  analyzeSeriesDNA,
  renderDNAReport,
  type SeriesDirectionDNA,
} from '@/lib/series-direction-dna';

interface SeriesDNASectionProps {
  language: AppLanguage;
  /** 화별 씬시트 — config.episodeSceneSheets 그대로 전달 */
  episodeSceneSheets: EpisodeSceneSheet[];
}

// ============================================================
// PART 2 — Component
// ============================================================

export function SeriesDNASection({ language, episodeSceneSheets }: SeriesDNASectionProps) {
  // EpisodeSceneSheet[] → Record<number, SceneDirectionData>
  const dna: SeriesDirectionDNA = useMemo(() => {
    const map: Record<number, SceneDirectionData> = {};
    for (const sheet of episodeSceneSheets) {
      if (sheet.directionSnapshot) {
        map[sheet.episode] = sheet.directionSnapshot;
      }
    }
    return analyzeSeriesDNA(map);
  }, [episodeSceneSheets]);

  const reportMd = useMemo(() => renderDNAReport(dna, language), [dna, language]);

  const handleExport = () => {
    try {
      const blob = new Blob([reportMd], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `series-dna-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download 차단 환경 — silent fail
    }
  };

  // ============================================================
  // PART 3 — Render
  // ============================================================

  return (
    <section
      aria-label={L4(language, {
        ko: '시리즈 DNA 분석',
        en: 'Series DNA analysis',
        ja: 'シリーズDNA分析',
        zh: '系列DNA分析',
      })}
      className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-4"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-purple" aria-hidden="true" />
          {L4(language, {
            ko: '시리즈 DNA',
            en: 'Series DNA',
            ja: 'シリーズDNA',
            zh: '系列DNA',
          })}
        </h3>
        {dna.episodesAnalyzed > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-bg-primary border border-border text-text-secondary text-xs font-medium hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            title={L4(language, {
              ko: '리포트 내보내기 (.md)',
              en: 'Export report (.md)',
              ja: 'レポートをエクスポート (.md)',
              zh: '导出报告 (.md)',
            })}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            {L4(language, { ko: '내보내기', en: 'Export', ja: 'エクスポート', zh: '导出' })}
          </button>
        )}
      </header>

      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: '로컬 분석 — 외부로 전송되지 않습니다.',
          en: 'Local analysis only — no external transmission.',
          ja: 'ローカル分析のみ — 外部送信なし。',
          zh: '仅限本地分析 — 不向外部传输。',
        })}
      </p>

      {dna.episodesAnalyzed === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">
          {L4(language, {
            ko: '씬시트 데이터가 없습니다. 에피소드를 작성하면 여기에 분석이 표시됩니다.',
            en: 'No scene sheet data. Write episodes to see analysis here.',
            ja: 'シーンシートデータがありません。エピソードを書くと分析が表示されます。',
            zh: '没有场景表数据。撰写剧集后将在此显示分析。',
          })}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DNAStat
            label={L4(language, { ko: '분석 화수', en: 'Episodes', ja: '分析話数', zh: '已分析' })}
            value={`${dna.episodesAnalyzed}/${dna.totalEpisodes}`}
          />
          <DNAStat
            label={L4(language, { ko: '클리프 사용률', en: 'Cliff rate', ja: 'クリフ使用率', zh: '悬念率' })}
            value={`${(dna.personalPatterns.cliffhangerUsage * 100).toFixed(0)}%`}
          />
          <DNAStat
            label={L4(language, { ko: '복선 회수율', en: 'Foreshadow', ja: '伏線回収', zh: '伏笔回收' })}
            value={`${(dna.personalPatterns.foreshadowDepth * 100).toFixed(0)}%`}
          />
          <DNAStat
            label={L4(language, { ko: '화당 훅', en: 'Hooks/Ep', ja: '1話フック', zh: '每话钩' })}
            value={dna.personalPatterns.avgHooksPerEpisode.toFixed(1)}
          />
        </div>
      )}

      {/* 마크다운 미리보기 (간단) */}
      {dna.episodesAnalyzed > 0 && (
        <details className="rounded-lg border border-border bg-bg-primary">
          <summary className="cursor-pointer p-3 text-xs font-bold text-text-secondary hover:text-text-primary min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-lg">
            {L4(language, {
              ko: '전체 리포트 보기',
              en: 'View full report',
              ja: '全レポート表示',
              zh: '查看完整报告',
            })}
          </summary>
          <pre className="p-3 text-[10px] text-text-secondary whitespace-pre-wrap font-mono overflow-x-auto">
            {reportMd}
          </pre>
        </details>
      )}
    </section>
  );
}

// ============================================================
// PART 4 — Stat tile
// ============================================================

function DNAStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-text-primary font-mono">{value}</div>
    </div>
  );
}

export default SeriesDNASection;

// IDENTITY_SEAL: SeriesDNASection | role=DNA settings panel | inputs=props | outputs=JSX
