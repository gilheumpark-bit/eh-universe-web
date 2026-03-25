"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { ChatSession, VisualPromptCard, StoryConfig, AppLanguage } from '@/lib/studio-types';
import { createVisualCard, createCardFromAnalysis } from '@/lib/visual-defaults';
import VisualPromptEditor from '../VisualPromptEditor';

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
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">
            NOI — Narrative Origin Imaging
          </div>
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
            {isKO ? '분석 완료 회차' : 'Analyzed Episodes'}
          </div>
          {analyzedEpisodes.length === 0 ? (
            <p className="text-[11px] text-zinc-600">
              {isKO ? '원고탭에서 챕터 분석을 먼저 실행하세요' : 'Run chapter analysis in Manuscript tab first'}
            </p>
          ) : (
            <div className="space-y-1">
              {analyzedEpisodes.map(ep => (
                <button
                  key={ep}
                  onClick={() => generateFromAnalysis(ep)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] bg-black/40 border border-zinc-800 hover:border-blue-600/40 text-zinc-400 hover:text-blue-300 transition-all"
                >
                  <span>EP.{ep}</span>
                  <span className="text-[9px] text-zinc-600">
                    {isKO ? '카드 생성' : 'Generate'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card list */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              {isKO ? `카드 (${cards.length})` : `Cards (${cards.length})`}
            </span>
            <button onClick={addEmptyCard} className="text-zinc-600 hover:text-blue-400 transition-colors">
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
                    : 'bg-black/30 border border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="font-semibold truncate">{c.title || `EP${c.episode} Card`}</div>
                <div className="text-[9px] text-zinc-600 mt-0.5">{c.shotType} · EP{c.episode}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Editor */}
      <div className="flex-1 min-w-0">
        {selectedCard ? (
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-6">
            <VisualPromptEditor
              card={selectedCard}
              onChange={updateCard}
              onDelete={() => deleteCard(selectedCard.id)}
              isKO={isKO}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ImageIcon className="w-12 h-12 text-zinc-800 mb-4" />
            <h3 className="text-lg font-black text-zinc-600 mb-2">
              {isKO ? '비주얼 카드를 선택하거나 생성하세요' : 'Select or create a visual card'}
            </h3>
            <p className="text-[12px] text-zinc-700 max-w-md">
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
