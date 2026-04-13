"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus, Image as ImageIcon, Settings, Star, Trash2,
  Play, Loader2, Grid, ChevronDown, Zap,
} from 'lucide-react';
import {
  ChatSession, VisualPromptCard, StoryConfig, AppLanguage,
  GeneratedVisualAsset,
} from '@/lib/studio-types';
import { createVisualCard, createCardFromAnalysis } from '@/lib/visual-defaults';
import { buildFinalVisualPrompt, buildNegativePrompt } from '@/lib/visual-prompt';
import { generateImage } from '@/services/imageGenerationService';
import VisualPromptEditor from '../VisualPromptEditor';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { ImageGenProvider } from '@/services/imageGenerationService';
import { hasDgxService as hasDgxServiceFn } from '@/lib/ai-providers';

interface VisualTabProps {
  config: StoryConfig;
  setConfig: (c: StoryConfig) => void;
  currentSession: ChatSession | null;
  language: AppLanguage;
}

type TabView = 'editor' | 'gallery';

interface BatchProgress {
  running: boolean;
  current: number;
  total: number;
  currentCardTitle: string;
  completed: string[];
  errors: string[];
}

// IDENTITY_SEAL: PART-1 | role=imports+types | inputs=none | outputs=VisualTabProps,TabView,BatchProgress

// ============================================================
// PART 2 — Scene Gallery Sub-component
// ============================================================

function SceneGallery({
  cards, isKO, totalEpisodes, onUpdateCard, onDeleteImage,
}: {
  cards: VisualPromptCard[];
  isKO: boolean;
  totalEpisodes: number;
  onUpdateCard: (card: VisualPromptCard) => void;
  onDeleteImage: (cardId: string, imageId: string) => void;
}) {
  const [filterEp, setFilterEp] = useState<number | 'all'>('all');
  const [showFavOnly, setShowFavOnly] = useState(false);

  // Collect all images across all cards
  const allImages = useMemo(() => {
    const imgs: Array<GeneratedVisualAsset & { cardTitle: string; cardId: string }> = [];
    for (const card of cards) {
      for (const img of card.generatedImages ?? []) {
        imgs.push({ ...img, cardTitle: card.title || `EP${card.episode} Card`, cardId: card.id });
      }
    }
    return imgs.sort((a, b) => b.createdAt - a.createdAt);
  }, [cards]);

  const filtered = useMemo(() => {
    let list = allImages;
    if (filterEp !== 'all') list = list.filter(i => i.assignedEpisode === filterEp);
    if (showFavOnly) list = list.filter(i => i.favorite);
    return list;
  }, [allImages, filterEp, showFavOnly]);

  // Episode set for dropdown
  const epOptions = useMemo(() => {
    const set = new Set<number>();
    for (const card of cards) {
      set.add(card.episode);
      for (const img of card.generatedImages ?? []) {
        if (img.assignedEpisode != null) set.add(img.assignedEpisode);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [cards]);

  const toggleFavorite = (cardId: string, imageId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const updated = {
      ...card,
      generatedImages: (card.generatedImages ?? []).map(img =>
        img.id === imageId ? { ...img, favorite: !img.favorite } : img
      ),
    };
    onUpdateCard(updated);
  };

  const assignEpisode = (cardId: string, imageId: string, ep: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const updated = {
      ...card,
      generatedImages: (card.generatedImages ?? []).map(img =>
        img.id === imageId ? { ...img, assignedEpisode: ep } : img
      ),
    };
    onUpdateCard(updated);
  };

  // Mini-timeline: images grouped by episode
  const timeline = useMemo(() => {
    const map = new Map<number, Array<GeneratedVisualAsset & { cardTitle: string }>>();
    for (const img of allImages) {
      const ep = img.assignedEpisode ?? 0;
      if (!map.has(ep)) map.set(ep, []);
      map.get(ep)!.push(img);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [allImages]);

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <Grid className="w-10 h-10 text-text-tertiary mb-3" />
        <p className="text-[12px] text-text-tertiary">
          {isKO ? '생성된 이미지가 없습니다. 카드에서 이미지를 생성하세요.' : 'No images yet. Generate images from cards.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mini Episode Timeline */}
      <div className="ds-card">
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">
          {isKO ? '에피소드 타임라인' : 'Episode Timeline'}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeline.map(([ep, imgs]) => (
            <button
              key={ep}
              onClick={() => setFilterEp(ep === 0 ? 'all' : ep)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                filterEp === ep ? 'border-accent-purple/40 bg-accent-purple/10' : 'border-border bg-bg-secondary/50 hover:border-border'
              }`}
            >
              <span className="text-[10px] font-bold text-text-secondary">
                {ep === 0 ? (isKO ? '미배정' : 'Unassigned') : `EP.${ep}`}
              </span>
              <div className="flex -space-x-1.5">
                {imgs.slice(0, 3).map(img => (
                  <Image
                    key={img.id}
                    src={img.imageUrl}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="w-6 h-6 rounded-md border border-black/50 object-cover"
                  />
                ))}
                {imgs.length > 3 && (
                  <span className="w-6 h-6 rounded-md bg-black/60 border border-border flex items-center justify-center text-[8px] text-text-tertiary">
                    +{imgs.length - 3}
                  </span>
                )}
              </div>
              <span className="text-[8px] text-text-tertiary">{imgs.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={filterEp}
            onChange={e => setFilterEp(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-bg-secondary/80 border border-border rounded-lg px-3 py-1.5 text-[10px] text-text-secondary outline-none appearance-none pr-6 transition-colors"
          >
            <option value="all">{isKO ? '전체 에피소드' : 'All Episodes'}</option>
            {epOptions.map(ep => (
              <option key={ep} value={ep}>EP.{ep}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        </div>
        <button
          onClick={() => setShowFavOnly(!showFavOnly)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
            showFavOnly
              ? 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber'
              : 'bg-bg-secondary/50 border-border text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Star className="w-3 h-3" /> {isKO ? '즐겨찾기' : 'Favorites'}
        </button>
        <span className="text-[9px] text-text-tertiary ml-auto">
          {filtered.length} / {allImages.length} {isKO ? '이미지' : 'images'}
        </span>
      </div>

      {/* Masonry-style Grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {filtered.map(img => (
          <div key={img.id} className="break-inside-avoid rounded-xl overflow-hidden border border-border/40 bg-bg-secondary/50 group">
            <div className="relative">
              {/* dynamic AI-generated URL, unoptimized for lazy load */}
              <Image src={img.imageUrl} alt={img.cardTitle} unoptimized fill className="object-cover" />
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end gap-1 p-2">
                <button
                  onClick={() => toggleFavorite(img.cardId, img.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    img.favorite ? 'bg-accent-amber/30 text-accent-amber' : 'bg-bg-primary/60 text-text-tertiary hover:text-accent-amber'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" fill={img.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => onDeleteImage(img.cardId, img.id)}
                  className="p-1.5 rounded-lg bg-bg-primary/60 text-text-tertiary hover:text-accent-red transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Info strip */}
            <div className="px-2.5 py-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-text-secondary truncate">{img.cardTitle}</p>
              <div className="flex items-center gap-1.5">
                <select
                  value={img.assignedEpisode ?? ''}
                  onChange={e => assignEpisode(img.cardId, img.id, Number(e.target.value) || 0)}
                  className="flex-1 bg-bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-[9px] text-text-tertiary outline-none transition-colors"
                >
                  <option value="">{isKO ? '에피소드 배정' : 'Assign EP'}</option>
                  {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => (
                    <option key={ep} value={ep}>EP.{ep}</option>
                  ))}
                </select>
                {img.favorite && <Star className="w-2.5 h-2.5 text-accent-amber" fill="currentColor" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=scene gallery | inputs=cards,config | outputs=gallery grid+timeline

// ============================================================
// PART 3 — Batch Generation Logic
// ============================================================

function useBatchGeneration(
  cards: VisualPromptCard[],
  imgApiKey: string,
  imgProvider: ImageGenProvider,
  updateCard: (card: VisualPromptCard) => void,
) {
  const [progress, setProgress] = useState<BatchProgress>({
    running: false, current: 0, total: 0,
    currentCardTitle: '', completed: [], errors: [],
  });
  const abortRef = useRef(false);

  const start = useCallback(async () => {
    // Cards without any generated images
    const pending = cards.filter(c => !(c.generatedImages && c.generatedImages.length > 0));
    if (pending.length === 0 || !imgApiKey) return;

    abortRef.current = false;
    setProgress({ running: true, current: 0, total: pending.length, currentCardTitle: '', completed: [], errors: [] });

    for (let i = 0; i < pending.length; i++) {
      if (abortRef.current) break;
      const card = pending[i];
      setProgress(p => ({ ...p, current: i + 1, currentCardTitle: card.title || `EP${card.episode} Card` }));

      const prompt = buildFinalVisualPrompt(card);
      const neg = buildNegativePrompt(card);
      if (!prompt) {
        setProgress(p => ({ ...p, errors: [...p.errors, `${card.title || card.id}: empty prompt`] }));
        continue;
      }

      try {
        const result = await generateImage(imgProvider, prompt, neg, imgApiKey, { n: 1 });
        if (result.error) {
          setProgress(p => ({ ...p, errors: [...p.errors, `${card.title || card.id}: ${result.error}`] }));
        } else if (result.images.length > 0) {
          const asset: GeneratedVisualAsset = {
            id: `ga-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            promptCardId: card.id,
            provider: imgProvider,
            model: imgProvider === 'openai' ? 'dall-e-3' : 'sdxl',
            imageUrl: result.images[0].url,
            promptSnapshot: prompt,
            createdAt: Date.now(),
            assignedEpisode: card.episode,
            revisedPrompt: result.images[0].revised_prompt,
          };
          updateCard({ ...card, generatedImages: [asset, ...(card.generatedImages ?? [])].slice(0, 8) });
          setProgress(p => ({ ...p, completed: [...p.completed, card.title || card.id] }));
        }
      } catch {
        setProgress(p => ({ ...p, errors: [...p.errors, `${card.title || card.id}: network error`] }));
      }
    }

    setProgress(p => ({ ...p, running: false }));
  }, [cards, imgApiKey, imgProvider, updateCard]);

  const cancel = useCallback(() => { abortRef.current = true; }, []);

  return { progress, start, cancel };
}

// IDENTITY_SEAL: PART-3 | role=batch generation hook | inputs=cards,api | outputs=progress,start,cancel

// ============================================================
// PART 3.5 — Premium Loading Text
// ============================================================

const LOADING_MESSAGES_KO = [
  '차원 데이터 스캔 중...',
  'FLUX.1 신경망 활성화...',
  '시각적 구조 합성 중...',
  '텍스처 매핑 계산...',
  '라이팅 시뮬레이션...',
  '최종 픽셀 렌더링...',
  '고해상도 후처리...',
  '아티팩트 제거 중...',
];
const LOADING_MESSAGES_EN = [
  'Scanning dimensional data...',
  'Activating FLUX.1 neural net...',
  'Synthesizing visual structure...',
  'Computing texture mapping...',
  'Simulating lighting...',
  'Rendering final pixels...',
  'Post-processing in HD...',
  'Removing artifacts...',
];

function PremiumLoadingText({ isKO }: { isKO: boolean }) {
  const msgs = isKO ? LOADING_MESSAGES_KO : LOADING_MESSAGES_EN;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3000);
    return () => clearInterval(timer);
  }, [msgs.length]);
  return (
    <div className="h-4 overflow-hidden">
      <span key={idx} className="block text-[10px] text-accent-purple/80 font-mono animate-[fadeIn_0.5s_ease-in]">
        {msgs[idx]}
      </span>
    </div>
  );
}

// ============================================================
// PART 4 — Main Component
// ============================================================

export default function VisualTab({ config, setConfig, currentSession: _session, language }: VisualTabProps) {
  const { IMAGE_GENERATION: imageGenEnabled } = useFeatureFlags();
  const isKO = language === 'KO';
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<TabView>('editor');
  const cards = useMemo(() => config.visualPromptCards ?? [], [config.visualPromptCards]);
  const episode = config.episode ?? 1;
  const totalEpisodes = config.totalEpisodes ?? 1;

  // Image generation API key + provider (persisted in localStorage, lazy init)
  const hasDgxService = hasDgxServiceFn();
  const [imgProvider, setImgProvider] = useState<ImageGenProvider>(() => {
    try {
      const saved = localStorage.getItem('noa-img-provider');
      if (saved === 'openai' || saved === 'stability' || saved === 'local-spark') return saved as ImageGenProvider;
    } catch { /* SSR safe */ }
    return hasDgxService ? 'local-spark' : 'openai';
  });
  const [imgApiKey, setImgApiKey] = useState(() => {
    try {
      return localStorage.getItem('noa-img-apikey') ?? '';
    } catch { return ''; }
  });
  const [showImgSettings, setShowImgSettings] = useState(false);

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

  // Batch generation
  const batch = useBatchGeneration(cards, imgApiKey, imgProvider, updateCard);
  const cardsWithoutImages = cards.filter(c => !(c.generatedImages && c.generatedImages.length > 0)).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Episode list + card list */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        {/* View toggle */}
        <div className="ds-card flex gap-1 p-1">
          <button
            onClick={() => setActiveView('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${
              activeView === 'editor'
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> {isKO ? '편집기' : 'Editor'}
          </button>
          <button
            onClick={() => setActiveView('gallery')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${
              activeView === 'gallery'
                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Grid className="w-3 h-3" /> {isKO ? '갤러리' : 'Gallery'}
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] bg-bg-secondary border border-border hover:border-blue-600/40 text-text-secondary hover:text-accent-blue transition-all"
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
            {cards.map(c => {
              const imgCount = c.generatedImages?.length ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCardId(c.id); setActiveView('editor'); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all ${
                    selectedCardId === c.id && activeView === 'editor'
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300'
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

        {/* Batch Generation */}
        {imageGenEnabled && (imgApiKey || hasDgxService) && cards.length > 0 && (
          <div className="ds-card space-y-2">
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {isKO ? '일괄 생성' : 'Batch Generation'}
            </div>
            {batch.progress.running ? (
              <div className="space-y-3 p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/20 backdrop-blur-sm">
                {/* 엔진 뱃지 */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-accent-purple uppercase tracking-widest">
                    <Zap className="w-3 h-3 animate-pulse" />
                    {hasDgxService ? 'FLUX.1 · DGX 128GB' : imgProvider.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-text-tertiary">
                    {batch.progress.current}/{batch.progress.total}
                  </span>
                </div>
                {/* 프리미엄 로딩 텍스트 */}
                <PremiumLoadingText isKO={isKO} />
                {/* 현재 카드 */}
                <div className="text-[10px] text-text-secondary font-semibold truncate">
                  {batch.progress.currentCardTitle}
                </div>
                {/* 프로그레스 바 */}
                <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-accent-purple via-accent-blue to-accent-purple bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] transition-all duration-500"
                    style={{ width: `${(batch.progress.current / Math.max(batch.progress.total, 1)) * 100}%` }}
                  />
                </div>
                <button
                  onClick={batch.cancel}
                  className="w-full py-1.5 text-[10px] font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/10 transition-all"
                >
                  {isKO ? '중단' : 'Cancel'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={batch.start}
                  disabled={cardsWithoutImages === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-linear-to-r from-blue-600/80 to-purple-600/80 text-white disabled:opacity-30 transition-all active:scale-[0.98]"
                >
                  <Play className="w-3 h-3" />
                  {isKO ? `이미지 없는 카드 전체 생성 (${cardsWithoutImages})` : `Generate All (${cardsWithoutImages} pending)`}
                </button>
                {batch.progress.completed.length > 0 && (
                  <p className="text-[9px] text-green-400">
                    {isKO ? `완료: ${batch.progress.completed.length}건` : `Done: ${batch.progress.completed.length}`}
                  </p>
                )}
                {batch.progress.errors.length > 0 && (
                  <div className="text-[9px] text-red-400 space-y-0.5">
                    {batch.progress.errors.slice(0, 3).map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
          {!imageGenEnabled && (
            <p className="mt-2 text-[9px] text-amber-400/90">
              {isKO
                ? '이미지 생성이 비활성화되어 API 키를 사용할 수 없습니다.'
                : 'Image generation is disabled; API keys are not used.'}
            </p>
          )}
          {showImgSettings && (
            <div className="mt-3 space-y-3">
              {/* Provider 선택 — DGX Spark 강조 */}
              <div className="space-y-1.5">
                {[
                  { id: 'local-spark' as ImageGenProvider, name: 'DGX Spark', badge: '128GB · Free', free: true },
                  { id: 'openai' as ImageGenProvider, name: 'OpenAI DALL-E 3', badge: 'BYOK', free: false },
                  { id: 'stability' as ImageGenProvider, name: 'Stability AI', badge: 'BYOK', free: false },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setImgProvider(p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                      imgProvider === p.id
                        ? p.free
                          ? 'bg-accent-purple/15 border-accent-purple/50 shadow-[0_0_12px_rgba(141,123,195,0.15)]'
                          : 'bg-accent-blue/10 border-accent-blue/40'
                        : 'border-border/40 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${imgProvider === p.id ? (p.free ? 'text-accent-purple' : 'text-accent-blue') : 'text-text-secondary'}`}>
                        {p.free && '⚡ '}{p.name}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      p.free ? 'bg-accent-green/10 text-accent-green' : 'bg-bg-tertiary text-text-tertiary'
                    }`}>
                      {p.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* FLUX 모델 안내 — local-spark 선택 시 */}
              {imgProvider === 'local-spark' && (
                <div className="px-3 py-2 rounded-lg bg-accent-purple/5 border border-accent-purple/20 text-[10px] text-accent-purple leading-relaxed">
                  {isKO
                    ? '💡 프롬프트에 "flux"를 포함하면 FLUX.1 Schnell (FP8) 모델이 자동 가동됩니다. 미포함 시 SDXL 1.0으로 생성합니다.'
                    : '💡 Include "flux" in your prompt to activate FLUX.1 Schnell (FP8). Otherwise SDXL 1.0 is used.'}
                </div>
              )}

              {/* API 키 — BYOK 프로바이더만 */}
              {imgProvider !== 'local-spark' && (
                <input
                  type="password"
                  value={imgApiKey}
                  onChange={e => setImgApiKey(e.target.value)}
                  placeholder={isKO ? 'API 키 입력...' : 'API Key...'}
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[11px] outline-none focus:border-accent-blue"
                />
              )}

              <button onClick={saveImgSettings}
                className="w-full py-2 bg-accent-purple/15 border border-accent-purple/30 rounded-lg text-[10px] font-bold text-accent-purple hover:bg-accent-purple/25 transition-all">
                {isKO ? '저장' : 'Save'}
              </button>

              {imgProvider === 'local-spark' && (
                <p className="text-[9px] text-accent-green">
                  {isKO ? '⚡ DGX Spark 무료 — API 키 없이 바로 사용 가능' : '⚡ DGX Spark Free — No API key needed'}
                </p>
              )}
              {imgProvider !== 'local-spark' && imgApiKey && (
                <p className="text-[9px] text-accent-green">
                  {isKO ? '키 설정됨 — 카드 편집기에서 "이미지 생성" 버튼 사용 가능' : 'Key set — "Generate" button available in card editor'}
                </p>
              )}
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
              isKO={isKO}
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
                ? '원고탭에서 챕터 분석 후 초안을 생성하거나, + 버튼으로 빈 카드를 만들 수 있습니다.'
                : 'Generate draft from chapter analysis or create an empty card with the + button.'}
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

// IDENTITY_SEAL: PART-4 | role=visual tab container | inputs=config,session | outputs=visual design UI+gallery+batch
