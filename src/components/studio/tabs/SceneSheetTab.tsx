"use client";

// ============================================================
// PART 1 — Module Header
// ============================================================
//
// SceneSheetTab.tsx — 에피소드 씬시트 전용 탭.
//
// [2026-05-09] AGENTS.md 네이밍 통합 후속 — 작품 연출(StyleTab) 과
// 에피소드 씬시트(SceneSheet) 두 개념의 별도 진입점 분리.
//
// 역할:
//   - config.episodeSceneSheets 목록 (큰 화면 layout)
//   - 추가/편집/삭제 (EpisodeScenePanel 재사용)
//   - upsertSheet/removeSheet helper 사용 (Tier B 와 일관)
//
// 하위 호환:
//   - RulebookTab + WritingTabInline 의 SceneSheet mount 위치 변경 X
//   - StudioRightPanel 의 EpisodeScenePanel mount 변경 X
//   - 본 탭은 추가 진입점 — 기존 동작 100% 보존
//
// [C] config.episodeSceneSheets ?? [] 폴백
// [K] EpisodeScenePanel 재사용 — UI 중복 X
// ============================================================

import dynamic from 'next/dynamic';
import type { ChatSession, StoryConfig, AppLanguage } from '@/lib/studio-types';
import { upsertSheet, removeSheet } from '@/lib/scene-sheet/helpers';
import { L4 } from '@/lib/i18n';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import TabHeader from '@/components/studio/TabHeader';

const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), {
  ssr: false,
  loading: () => <LoadingSkeleton height={300} />,
});

// ============================================================
// PART 2 — Component
// ============================================================

interface SceneSheetTabProps {
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  currentSession: ChatSession;
  language: AppLanguage;
}

export default function SceneSheetTab({ config, setConfig, currentSession, language }: SceneSheetTabProps) {
  const sheets = config.episodeSceneSheets ?? [];
  const currentEpisode = config.episode ?? 1;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 md:px-6">
      <TabHeader
        icon="🎬"
        title={L4(language, {
          ko: '씬시트',
          en: 'Scene Sheet',
          ja: 'シーンシート',
          zh: '场景表',
        })}
        description={L4(language, {
          ko: '에피소드별 씬 구성 — 작품 전체 연출(StyleTab) 과 별개의 회차 단위 시나리오',
          en: 'Per-episode scene composition — separate from work-level direction (StyleTab)',
          ja: 'エピソードごとのシーン構成 — 作品全体の演出(StyleTab) とは別の回単位シナリオ',
          zh: '按章节的场景构成 — 与作品级演出(StyleTab) 分离的回章单位脚本',
        })}
      />

      {/* 통계 — 누적 씬시트 카운트 */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-tertiary">
        <span>
          {L4(language, { ko: '총 씬시트', en: 'Total sheets', ja: '総シート', zh: '总场景表' })}: {sheets.length}
        </span>
        <span>
          {L4(language, { ko: '현재 화', en: 'Current ep', ja: '現在の回', zh: '当前章节' })}: {currentEpisode}
        </span>
        {sheets.length > 0 && (
          <span>
            {L4(language, {
              ko: `최근 갱신 EP ${[...sheets].sort((a, b) => b.lastUpdate - a.lastUpdate)[0].episode}`,
              en: `Latest EP ${[...sheets].sort((a, b) => b.lastUpdate - a.lastUpdate)[0].episode}`,
              ja: `最新 EP ${[...sheets].sort((a, b) => b.lastUpdate - a.lastUpdate)[0].episode}`,
              zh: `最近 EP ${[...sheets].sort((a, b) => b.lastUpdate - a.lastUpdate)[0].episode}`,
            })}
          </span>
        )}
      </div>

      {/* EpisodeScenePanel 재사용 — StudioRightPanel 과 동일 컴포넌트, 큰 layout */}
      <div className="mt-6">
        <EpisodeScenePanel
          lang={language}
          currentEpisode={currentEpisode}
          episodeSceneSheets={sheets}
          // [2026-05-09] scene-sheet/helpers 사용 (Tier B 와 일관)
          onSave={(sheet) => setConfig(upsertSheet(config, sheet))}
          onDelete={(ep) => setConfig(removeSheet(config, ep))}
          onUpdate={(sheet) => setConfig(upsertSheet(config, sheet))}
        />
      </div>

      {/* 안내 — 다른 진입점 명시 */}
      <div className="mt-8 p-4 rounded-lg bg-bg-secondary/50 border border-border text-xs text-text-tertiary">
        <p className="font-bold mb-2">
          {L4(language, { ko: '관련 진입점', en: 'Related views', ja: '関連エントリ', zh: '相关入口' })}
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            {L4(language, {
              ko: 'RulebookTab — 작품 전체 연출(SceneDirectionData) 편집',
              en: 'RulebookTab — work-level direction (SceneDirectionData) editor',
              ja: 'RulebookTab — 作品全体の演出(SceneDirectionData) 編集',
              zh: 'RulebookTab — 作品级演出(SceneDirectionData) 编辑',
            })}
          </li>
          <li>
            {L4(language, {
              ko: 'WritingTab — 집필 중 인라인 씬 경고 (편집 X, 표시만)',
              en: 'WritingTab — inline scene warnings while writing (display only)',
              ja: 'WritingTab — 執筆中のインラインシーン警告(表示のみ)',
              zh: 'WritingTab — 写作中的内联场景警告(仅显示)',
            })}
          </li>
          <li>
            {L4(language, {
              ko: 'StudioRightPanel — 우측 패널 미니 뷰 (동일 데이터)',
              en: 'StudioRightPanel — right panel mini view (same data)',
              ja: 'StudioRightPanel — 右パネルミニビュー(同一データ)',
              zh: 'StudioRightPanel — 右面板迷你视图(相同数据)',
            })}
          </li>
        </ul>
      </div>

      {/* unused props guard — currentSession 미사용 시 lint 경고 회피 */}
      {currentSession && null}
    </div>
  );
}
