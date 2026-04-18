// ============================================================
// PART 1 — imports & types (dynamic StyleStudioView + safe fallbacks)
// ============================================================
import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { StoryConfig, Message } from '@/lib/studio-types';
import TabAssistant from '@/components/studio/TabAssistant';
import RhythmAnalyzer from '@/components/studio/RhythmAnalyzer';
import { createT, L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { TabHeader } from '@/components/studio/TabHeader';

const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse p-6" aria-label="style-loading">
      <div className="h-8 bg-bg-secondary rounded-xl w-1/3 mb-3" />
      <div className="h-48 bg-bg-secondary rounded-2xl" />
    </div>
  ),
});

interface StyleTabProps {
  language: 'KO' | 'EN' | 'JP' | 'CN';
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
  showAiLock?: boolean;
  hostedProviders?: Record<string, boolean>;
  messages?: Message[];
}

// ============================================================
// PART 2 — StyleTab component
// ============================================================
const StyleTab: React.FC<StyleTabProps> = ({
  language,
  config,
  updateCurrentSession,
  triggerSave,
  saveFlash,
  showAiLock = false,
  hostedProviders = {},
  messages = [],
}) => {
  const t = createT(language);

  // [K] 리듬 패널 기본값: 메시지가 있을 때만 의미가 있으므로 기본 true.
  //     사용자가 접으면 false로 전환 — messages가 비면 버튼 자체가 렌더되지 않음(아래 guard).
  //     showRhythm === 표시 여부 토글 (닫기=false, 열기=true). UX 개선으로 숨김 방지 기본 펼침.
  const [showRhythm, setShowRhythm] = useState<boolean>(true);

  // [C] messages 유효성: 배열 + 최소 1개 + 유효 role (빈 값/비정상 페이로드 방어)
  const hasValidMessages =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.some((m) => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant'));

  // [G] onProfileChange는 매 렌더마다 재생성될 필요 없음 — useCallback으로 고정
  const handleProfileChange = useCallback(
    (profile: StoryConfig['styleProfile']) => {
      try {
        updateCurrentSession({
          config: { ...config, styleProfile: profile },
        });
      } catch (err) {
        logger.warn('StyleTab', 'profile update failed', err);
      }
    },
    [config, updateCurrentSession],
  );

  const toggleRhythm = useCallback(() => setShowRhythm((prev) => !prev), []);

  return (
    <>
      <TabHeader
        icon="🎨"
        title={L4(language, { ko: '문체', en: 'Style', ja: '文体', zh: '文体' })}
        description={L4(language, {
          ko: '레이더 6축으로 문체 조정 · 프리셋 추천',
          en: 'Tune style via 6-axis radar · preset recommendations',
          ja: '6軸レーダーでスタイル調整・プリセット推奨',
          zh: '通过 6 轴雷达调节文体 · 预设推荐',
        })}
      />
      <StyleStudioView
        language={language}
        initialProfile={config.styleProfile}
        onProfileChange={handleProfileChange}
      />
      {/* 문장 리듬 분석 — messages가 유효할 때만 표시 */}
      {hasValidMessages && (
        <div className="max-w-6xl mx-auto px-4 pt-2 pb-2">
          <button
            onClick={toggleRhythm}
            aria-pressed={showRhythm}
            aria-label={L4(language, {
              ko: '문장 리듬 분석 토글',
              en: 'Toggle sentence rhythm',
              ja: '文章リズム分析の切り替え',
              zh: '切换句子节奏分析',
            })}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] ${
              showRhythm
                ? 'bg-accent-purple text-bg-primary border-accent-purple'
                : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
            }`}
          >
            📐{' '}
            {L4(language, {
              ko: '문장 리듬 분석',
              en: 'Sentence Rhythm',
              ja: '文章リズム分析',
              zh: '句子节奏分析',
            })}
          </button>
          {showRhythm && (
            <div className="mt-3">
              <RhythmAnalyzer messages={messages} language={language} />
            </div>
          )}
        </div>
      )}
      {!showAiLock && (
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <TabAssistant tab="style" language={language} config={config} hostedProviders={hostedProviders} />
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
        <button
          onClick={triggerSave}
          aria-label={L4(language, {
            ko: '스타일 설정 저장',
            en: 'Save style setting',
            ja: 'スタイル設定を保存',
            zh: '保存风格设置',
          })}
          className={`btn-ripple group flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-mono transition-[transform,opacity,background-color,border-color,color] duration-300 ${
            saveFlash
              ? 'bg-accent-green text-bg-primary animate-save-bounce-glow'
              : 'bg-gradient-to-r from-accent-purple to-accent-purple/80 text-bg-primary hover:shadow-[0_4px_20px_rgba(141,123,195,0.3)] hover:-translate-y-0.5 active:scale-95'
          }`}
        >
          <span className={`transition-transform duration-200 ${saveFlash ? 'animate-icon-pop' : 'group-hover:scale-110'}`}>
            {saveFlash ? '✓' : '💾'}
          </span>
          <span className={saveFlash ? 'animate-text-swap-in' : ''}>
            {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
          </span>
        </button>
      </div>
    </>
  );
};

export default StyleTab;
