"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Image as ImageIcon, Settings } from 'lucide-react';
import { ChatSession, VisualPromptCard, StoryConfig, AppLanguage } from '@/lib/studio-types';
import { createVisualCard, createCardFromAnalysis } from '@/lib/visual-defaults';
import VisualPromptEditor from '../VisualPromptEditor';
import type { ImageGenProvider } from '@/services/imageGenerationService';

interface VisualTabProps {
  config: StoryConfig;
  setConfig: (c: StoryConfig) => void;
  currentSession: ChatSession | null;
  language: AppLanguage;
}

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=VisualTabProps

// ============================================================
// PART 2 — Component
// ============================================================

export default function VisualTab({ config, setConfig, currentSession, language }: VisualTabProps) {
  const isKO = language === 'KO';
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const cards = config.visualPromptCards ?? [];
  const episode = config.episode ?? 1;

  // Image generation API key + provider (persisted in localStorage)
  const [imgProvider, setImgProvider] = useState<ImageGenProvider>('openai');
  const [imgApiKey, setImgApiKey] = useState('');
  const [showImgSettings, setShowImgSettings] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('noa-img-provider');
      const savedKey = localStorage.getItem('noa-img-apikey');
      if (saved === 'openai' || saved === 'stability') setImgProvider(saved);
      if (savedKey) setImgApiKey(savedKey);
    } catch { /* SSR safe */ }
  }, []);

  const saveImgSettings = () => {
    try {
      localStorage.setItem('noa-img-provider', imgProvider);
      localStorage.setItem('noa-img-apikey', imgApiKey);
    } catch { /* quota */ }
    setShowImgSettings(false);
  };

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

  const updateCard = (updated: VisualPromptCard) => {
    updateCards(cards.map(c => c.id === updated.id ? updated : c));
  };

  const deleteCard = (id: string) => {
    updateCards(cards.filter(c => c.id !== id));
    if (selectedCardId === id) setSelectedCardId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Episode list + card list */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        {/* Analyzed episodes */}
        <div className="ds-card">
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">
            NOI — Narrative Origin Imaging
          </div>
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">
            {isKO ? '분석 완료 회차' : 'Analyzed Episodes'}
          </div>
          {analyzedEpisodes.length === 0 ? (
            <p className="text-[11px] text-text-tertiary">
              {isKO ? '원고탭에서 챕터 분석을 먼저 실행하세요' : 'Run chapter analysis in Manuscript tab first'}
            </p>
          ) : (
            <div className="space-y-1">
              {analyzedEpisodes.map(ep => (
                <button
                  key={ep}
                  onClick={() => generateFromAnalysis(ep)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] bg-black/40 border border-border hover:border-blue-600/40 text-text-secondary hover:text-blue-300 transition-all"
                >
                  <span>EP.{ep}</span>
                  <span className="text-[9px] text-text-tertiary">
                    {isKO ? '카드 생성' : 'Generate'}
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
              {isKO ? `카드 (${cards.length})` : `Cards (${cards.length})`}
            </span>
            <button onClick={addEmptyCard} className="text-text-tertiary hover:text-blue-400 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {cards.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all ${
                  selectedCardId === c.id
                    ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300'
                    : 'bg-black/30 border border-transparent text-text-tertiary hover:border-border hover:text-text-secondary'
                }`}
              >
                <div className="font-semibold truncate">{c.title || `EP${c.episode} Card`}</div>
                <div className="text-[9px] text-text-tertiary mt-0.5">{c.shotType} · EP{c.episode}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Image Generation Settings */}
        <div className="ds-card">
          <button onClick={() => setShowImgSettings(!showImgSettings)}
            className="w-full flex items-center justify-between text-[10px] font-black text-text-tertiary uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Settings className="w-3 h-3" />
              {isKO ? '이미지 생성 설정' : 'Image Gen Settings'}
            </span>
            <span>{showImgSettings ? '▲' : '▼'}</span>
          </button>
          {showImgSettings && (
            <div className="mt-3 space-y-2">
              <select value={imgProvider} onChange={e => setImgProvider(e.target.value as ImageGenProvider)}
                className="w-full bg-black/50 border border-border rounded-lg px-3 py-2 text-[11px] outline-none">
                <option value="openai">OpenAI DALL-E 3</option>
                <option value="stability">Stability AI (SDXL)</option>
              </select>
              <input
                type="password"
                value={imgApiKey}
                onChange={e => setImgApiKey(e.target.value)}
                placeholder={isKO ? 'API 키 입력...' : 'API Key...'}
                className="w-full bg-black/50 border border-border rounded-lg px-3 py-2 text-[11px] outline-none"
              />
              <button onClick={saveImgSettings}
                className="w-full py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-300 hover:bg-blue-600/30 transition-all">
                {isKO ? '저장' : 'Save'}
              </button>
              {imgApiKey && (
                <p className="text-[9px] text-green-400">
                  {isKO ? '키 설정됨 — 카드 편집기에서 "이미지 생성" 버튼 사용 가능' : 'Key set — "Generate" button available in card editor'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Editor */}
      <div className="flex-1 min-w-0">
        {selectedCard ? (
          <div className="bg-bg-secondary/20 border border-border rounded-2xl p-6">
            <VisualPromptEditor
              card={selectedCard}
              onChange={updateCard}
              onDelete={() => deleteCard(selectedCard.id)}
              isKO={isKO}
              characters={config.characters}
              imageApiKey={imgApiKey || undefined}
              imageProvider={imgApiKey ? imgProvider : undefined}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ImageIcon className="w-12 h-12 text-text-tertiary mb-4" />
            <h3 className="text-lg font-black text-text-tertiary mb-2">
              {isKO ? '비주얼 카드를 선택하거나 생성하세요' : 'Select or create a visual card'}
            </h3>
            <p className="text-[12px] text-text-tertiary max-w-md">
              {isKO
                ? '원고탭에서 챕터 분석 후 자동 생성하거나, + 버튼으로 빈 카드를 만들 수 있습니다.'
                : 'Auto-generate from chapter analysis or create an empty card with the + button.'}
            </p>
            <button
              onClick={addEmptyCard}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-semibold hover:bg-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> {isKO ? '빈 카드 만들기' : 'Create Empty Card'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=visual tab container | inputs=config,session | outputs=visual design UI
