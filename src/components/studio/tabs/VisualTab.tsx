"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Image as ImageIcon, Settings,
  Grid,
} from 'lucide-react';
import {
  ChatSession, VisualPromptCard, StoryConfig, AppLanguage,
} from '@/lib/studio-types';
import { createVisualCard, createCardFromAnalysis } from '@/lib/visual-defaults';
import VisualPromptEditor from '../VisualPromptEditor';
import { L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { SceneGallery } from './VisualTab.gallery';

interface VisualTabProps {
  config: StoryConfig;
  setConfig: (c: StoryConfig) => void;
  currentSession: ChatSession | null;
  language: AppLanguage;
}

type TabView = 'editor' | 'gallery';

// IDENTITY_SEAL: PART-1 | role=imports+types | inputs=none | outputs=VisualTabProps,TabView

function purgeLegacyVisualGenerationSecrets(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('noa-img-apikey');
    sessionStorage.removeItem('noa-img-apikey');
    localStorage.removeItem('noa-img-provider');
  } catch {
    /* storage unavailable — visual handoff remains local project data only */
  }
}

// IDENTITY_SEAL: PART-6 | role=legacy visual generation cleanup | inputs=storage | outputs=none

// ============================================================
// PART 7 — Main Component
// ============================================================

export default function VisualTab({ config, setConfig, currentSession: _session, language }: VisualTabProps) {
  const { lang } = useLang();
  const isKO = language === 'KO';
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<TabView>('editor');
  const cards = useMemo(() => config.visualPromptCards ?? [], [config.visualPromptCards]);
  const episode = config.episode ?? 1;
  const totalEpisodes = config.totalEpisodes ?? 1;

  const [showImgSettings, setShowImgSettings] = useState(false);

  useEffect(() => {
    purgeLegacyVisualGenerationSecrets();
  }, []);

  // Episodes that have chapter analysis
  const analyzedEpisodes = useMemo(() => {
    return (config.chapterAnalyses ?? [])
      .map(a => a.episode)
      .filter((ep, i, arr) => arr.indexOf(ep) === i)
      .sort((a, b) => a - b);
  }, [config.chapterAnalyses]);

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null;

  const updateCards = useCallback((newCards: VisualPromptCard[]) => {
    setConfig({ ...config, visualPromptCards: newCards });
  }, [config, setConfig]);

  const addEmptyCard = () => {
    const card = createVisualCard(episode);
    updateCards([...cards, card]);
    setSelectedCardId(card.id);
    setActiveView('editor');
  };

  const generateFromAnalysis = (ep: number) => {
    const a = (config.chapterAnalyses ?? []).find(ca => ca.episode === ep);
    if (!a) return;
    const newCards = createCardFromAnalysis(ep, {
      characterState: a.characterState,
      backgroundState: a.backgroundState,
      sceneState: a.sceneState,
      imagePromptPack: a.imagePromptPack,
    });
    updateCards([...cards, ...newCards]);
    if (newCards.length > 0) setSelectedCardId(newCards[0].id);
  };

  const updateCard = useCallback((updated: VisualPromptCard) => {
    updateCards(cards.map(c => c.id === updated.id ? updated : c));
  }, [cards, updateCards]);

  const deleteCard = (id: string) => {
    updateCards(cards.filter(c => c.id !== id));
    if (selectedCardId === id) setSelectedCardId(null);
  };

  const deleteGalleryImage = (cardId: string, imageId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard({
      ...card,
      generatedImages: (card.generatedImages ?? []).filter(img => img.id !== imageId),
    });
  };

  // Total image count for badge
  const totalImages = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.generatedImages?.length ?? 0), 0);
  }, [cards]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 안내 배너 — Visual 탭이 원고의 시각 미리보기와 어떻게 연결되는지 명시 */}
      {cards.length === 0 && (
        <div className="ds-card rounded-lg border border-accent-amber/25 bg-accent-amber/[0.04] px-4 py-3">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-text-primary">
                {L4(lang, {
                  ko: '🎨 시각 시안 → 원고 Manuscript → 시각 미리보기',
                  en: '🎨 Visual previews → Manuscript → Visual Preview',
                })}
              </p>
              <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
                {L4(lang, {
                  ko: '에피소드별 장면 시안을 노아와 준비하고, 원고 탭의 「시각 미리보기」 화면에서 흐름을 확인할 수 있습니다. 회차 선택 → 카드 추가 → 시안 준비.',
                  en: 'Prepare scene visuals per episode with Noa, then review the flow in Manuscript tab\'s "Visual Preview" view. Pick an episode → add card → create preview.',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      {/* Left: Episode list + card list */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        {/* View toggle */}
        <div className="ds-card flex gap-1 p-1">
          <button
            onClick={() => setActiveView('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
              activeView === 'editor'
                ? 'bg-accent-blue/20 border border-accent-blue/30 text-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> {L4(lang, { ko: '편집기', en: 'Editor', ja: 'エディター', zh: '编辑器' })}
          </button>
          <button
            onClick={() => setActiveView('gallery')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
              activeView === 'gallery'
                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Grid className="w-3 h-3" /> {L4(lang, { ko: '갤러리', en: 'Gallery', ja: 'ギャラリー', zh: '图库' })}
            {totalImages > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-purple-600/30 text-[8px] text-purple-300">{totalImages}</span>
            )}
          </button>
        </div>

        {/* Analyzed episodes */}
        <div className="ds-card">
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">
            NOI — Narrative Origin Imaging
          </div>
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">
            {L4(lang, { ko: '분석 완료 회차', en: 'Analyzed Episodes', ja: '分析完了エピソード', zh: '已分析剧集' })}
          </div>
          {analyzedEpisodes.length === 0 ? (
            <p className="text-[11px] text-text-tertiary">
              {L4(lang, {
                ko: '원고탭에서 챕터 분석을 먼저 실행하세요',
                en: 'Run chapter analysis in Manuscript tab first',
              })}
            </p>
          ) : (
            <div className="space-y-1">
              {analyzedEpisodes.map(ep => (
                <button
                  key={ep}
                  onClick={() => generateFromAnalysis(ep)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] bg-bg-secondary border border-border hover:border-accent-blue/40 text-text-secondary hover:text-accent-blue transition-colors"
                >
                  <span>EP.{ep}</span>
                  <span className="text-[9px] text-text-tertiary">
                    {L4(lang, { ko: '카드 준비', en: 'Create', ja: 'カード準備', zh: '准备卡片' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card list */}
        <div className="ds-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {L4(lang, { ko: `카드 (${cards.length})`, en: `Cards (${cards.length})`, ja: `カード (${cards.length})`, zh: `卡片 (${cards.length})` })}
            </span>
            <button onClick={addEmptyCard} className="text-text-tertiary hover:text-accent-blue transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {cards.map(c => {
              const imgCount = c.generatedImages?.length ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCardId(c.id); setActiveView('editor'); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-[transform,opacity,background-color,border-color,color] ${
                    selectedCardId === c.id && activeView === 'editor'
                      ? 'bg-accent-blue/15 border border-accent-blue/30 text-accent-blue'
                      : 'bg-bg-secondary/50 border border-transparent text-text-tertiary hover:border-border hover:text-text-secondary'
                  }`}
                >
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {c.title || `EP${c.episode} Card`}
                    {imgCount > 0 && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-green-600/20 text-green-400">{imgCount}</span>
                    )}
                  </div>
                  <div className="text-[9px] text-text-tertiary mt-0.5">{c.shotType} · EP{c.episode}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual handoff note */}
        {cards.length > 0 && (
          <div className="ds-card space-y-2">
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {L4(lang, { ko: '시각 자료 정리', en: 'Visual Handoff Notes', ja: '視覚資料整理', zh: '视觉资料整理' })}
            </div>
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              {L4(lang, {
                ko: '이 탭은 외부 제작자에게 전달할 장면 자료와 참고 메모를 정리합니다. 이미지는 앱 안에서 만들지 않습니다.',
                en: 'This tab organizes scene notes and references for an external producer. Images are not created inside the app.',
                ja: 'このタブは外部制作者へ渡す場面資料と参考メモを整理します。画像はアプリ内では作成しません。',
                zh: '此标签用于整理交付给外部制作方的场景资料与参考备忘，不在应用内创建图片。',
              })}
            </p>
          </div>
        )}

        {/* Visual handoff settings */}
        <div className="ds-card">
          <button onClick={() => setShowImgSettings(!showImgSettings)}
            className="w-full flex items-center justify-between text-[10px] font-black text-text-tertiary uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Settings className="w-3 h-3" />
              {L4(lang, { ko: '시각 자료 설정', en: 'Visual Handoff Settings', ja: '視覚資料設定', zh: '视觉资料设置' })}
            </span>
            <span>{showImgSettings ? '▲' : '▼'}</span>
          </button>
          <p className="mt-2 text-[9px] text-text-tertiary">
            {L4(lang, {
              ko: '시각 자료는 작품 내부 메모로만 저장됩니다. 외부 제작은 별도 도구에서 진행하세요.',
              en: 'Visual notes are saved as project notes only. External production happens outside the app.',
            })}
          </p>
          {showImgSettings && (
            <div className="mt-3 space-y-3">
              <div className="px-3 py-2 rounded-lg bg-bg-secondary/50 border border-border text-[10px] text-text-tertiary leading-relaxed">
                {L4(lang, {
                  ko: '프리셋과 레벨은 장면 설명을 정리하는 용도입니다. 모델 선택이나 연결 키 입력은 제공하지 않습니다.',
                  en: 'Presets and levels organize scene descriptions. Model selection and connection keys are not provided here.',
                  ja: 'プリセットとレベルは場面説明を整理するためのものです。モデル選択や接続キー入力は提供しません。',
                  zh: '预设与等级用于整理场景说明。此处不提供模型选择或连接密钥输入。',
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Editor or Gallery */}
      <div className="flex-1 min-w-0">
        {activeView === 'gallery' ? (
          <div className="bg-bg-secondary/20 border border-border rounded-2xl p-6">
            <SceneGallery
              cards={cards}
              lang={lang}
              totalEpisodes={totalEpisodes}
              onUpdateCard={updateCard}
              onDeleteImage={deleteGalleryImage}
            />
          </div>
        ) : selectedCard ? (
          <div className="bg-bg-secondary/20 border border-border rounded-2xl p-6">
            <VisualPromptEditor
              card={selectedCard}
              onChange={updateCard}
              onDelete={() => deleteCard(selectedCard.id)}
              isKO={isKO}
              characters={config.characters}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ImageIcon className="w-12 h-12 text-text-tertiary mb-4" />
            <h3 className="text-lg font-black text-text-tertiary mb-2">
              {L4(lang, {
                ko: '비주얼 카드를 선택하거나 생성하세요',
                en: 'Select or create a visual card',
              })}
            </h3>
            <p className="text-[12px] text-text-tertiary max-w-md">
              {L4(lang, {
                ko: '원고탭에서 챕터 분석 후 초안을 준비하거나, + 버튼으로 빈 카드를 만들 수 있습니다.',
                en: 'Create a draft from chapter analysis or create an empty card with the + button.',
              })}
            </p>
            <button
              onClick={addEmptyCard}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-sm font-semibold hover:bg-accent-blue/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> {L4(lang, { ko: '빈 카드 만들기', en: 'Create Empty Card', ja: '空カードを作成', zh: '创建空卡片' })}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=visual tab container | inputs=config,session | outputs=visual design UI+gallery+batch
