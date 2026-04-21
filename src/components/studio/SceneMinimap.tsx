"use client";

// ============================================================
// SceneMinimap — 집필 중 현재 화 씬 위치 시각화 미니맵
// ============================================================
// 2026-04-21 (P2): 작가가 글 쓰면서 "지금 몇 씬째지?", "이 화 전체 흐름은?" 한 눈에.
//
// 데이터 소스: currentSession.config.episodeSceneSheets[현재 화].scenes
// 디자인:
//   - 가로 트랙 (각 씬 = 한 segment)
//   - tone별 색상 (감동=blue, 긴장=red, 개그=yellow, 액션=amber, 일상=green, 반전=purple)
//   - 활성 씬: amber outline + 살짝 확대
//   - hover: tooltip with sceneName + tone
//   - 클릭: data-scene-index 마커로 스크롤 (RightChatPanel과 동일)
//
// 위치: 집필 탭 에디터 상단 sticky bar (height ~32px)
// ============================================================

import React, { useCallback } from 'react';
import type { EpisodeSceneSheet, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Tone → Color 매핑 (genre-review.ts 톤과 일관)
// ============================================================

const TONE_COLORS: Record<string, string> = {
  // KO
  '감동': 'bg-accent-blue/60',
  '긴장': 'bg-accent-red/70',
  '개그': 'bg-amber-300/70',
  '액션': 'bg-accent-amber/80',
  '일상': 'bg-accent-green/60',
  '반전': 'bg-accent-purple/70',
  '공포': 'bg-zinc-700/80',
  '서사': 'bg-zinc-500/60',
  // EN fallback
  'touching': 'bg-accent-blue/60',
  'tension': 'bg-accent-red/70',
  'comedy': 'bg-amber-300/70',
  'action': 'bg-accent-amber/80',
  'daily': 'bg-accent-green/60',
  'twist': 'bg-accent-purple/70',
  'horror': 'bg-zinc-700/80',
  'narrative': 'bg-zinc-500/60',
};

function toneToColor(tone: string | undefined): string {
  if (!tone) return 'bg-bg-tertiary/50';
  const normalized = tone.toLowerCase().trim();
  return TONE_COLORS[tone] || TONE_COLORS[normalized] || 'bg-bg-tertiary/50';
}

// ============================================================
// PART 2 — Props + Component
// ============================================================

export interface SceneMinimapProps {
  /** 현재 에피소드 번호 (1-based) */
  currentEpisode: number;
  /** 전체 에피소드 씬시트 배열 */
  episodeSceneSheets: EpisodeSceneSheet[] | undefined;
  language: AppLanguage;
  /** 활성 씬 인덱스 (0-based). null이면 미강조. */
  activeSceneIndex?: number | null;
}

export function SceneMinimap({
  currentEpisode,
  episodeSceneSheets,
  language,
  activeSceneIndex = null,
}: SceneMinimapProps) {
  const sheet = (episodeSceneSheets ?? []).find(s => s.episode === currentEpisode);
  const scenes = sheet?.scenes ?? [];

  // 클릭 → 해당 씬 마커로 스크롤 (RightChatPanel과 동일 로직)
  const handleSceneClick = useCallback((sceneIndex: number) => {
    try {
      const direct = document.querySelector(`[data-scene-index="${sceneIndex}"]`);
      if (direct instanceof HTMLElement) {
        direct.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Fallback — ProseMirror 단락 비례 분할
      const proseMirror = document.querySelector<HTMLElement>('.novel-editor-wrapper .ProseMirror');
      if (!proseMirror) return;
      const paragraphs = proseMirror.querySelectorAll<HTMLElement>('p');
      if (paragraphs.length === 0 || scenes.length === 0) return;
      const ratio = sceneIndex / Math.max(1, scenes.length - 1);
      const idx = Math.min(paragraphs.length - 1, Math.floor(ratio * paragraphs.length));
      paragraphs[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      logger.warn('SceneMinimap', 'scene scroll failed', err);
    }
  }, [scenes.length]);

  if (scenes.length === 0) {
    return null; // 씬시트 미설정 시 미표시 (몰입 방해 X)
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 border-b border-border/40 bg-bg-secondary/30 backdrop-blur-sm"
      role="navigation"
      aria-label={L4(language, { ko: '씬 미니맵', en: 'Scene minimap', ja: 'シーンミニマップ', zh: '场景缩略图' })}
    >
      <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider font-mono shrink-0">
        EP.{currentEpisode}
      </span>
      <div className="flex-1 flex items-center gap-0.5 min-w-0">
        {scenes.map((scene, i) => {
          const isActive = activeSceneIndex === i;
          const colorClass = toneToColor(scene.tone);
          const tooltip = `#${i + 1} ${scene.sceneName || ''}${scene.tone ? ` · ${scene.tone}` : ''}`;
          return (
            <button
              key={scene.sceneId || i}
              type="button"
              onClick={() => handleSceneClick(i)}
              className={`relative flex-1 h-2 rounded-sm transition-all duration-200 ${colorClass} ${
                isActive
                  ? 'ring-2 ring-accent-amber ring-offset-1 ring-offset-bg-secondary scale-y-150 z-10'
                  : 'hover:scale-y-125'
              }`}
              title={tooltip}
              aria-label={tooltip}
              aria-current={isActive ? 'true' : undefined}
            />
          );
        })}
      </div>
      <span className="text-[9px] text-text-tertiary font-mono tabular-nums shrink-0">
        {scenes.length}{L4(language, { ko: '씬', en: 'sc', ja: 'シーン', zh: '场' })}
      </span>
    </div>
  );
}

export default SceneMinimap;
