"use client";

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Grid, Star, Trash2 } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { GeneratedVisualAsset, VisualPromptCard } from '@/lib/studio-types';

type GalleryImage = GeneratedVisualAsset & { cardTitle: string; cardId: string };
type TimelineRow = readonly [number, GalleryImage[]];

function deriveGalleryData(
  cards: VisualPromptCard[],
  filterEp: number | 'all',
  showFavOnly: boolean,
): {
  allImages: GalleryImage[];
  filtered: GalleryImage[];
  epOptions: number[];
  timeline: TimelineRow[];
} {
  const allImages: GalleryImage[] = [];
  const epSet = new Set<number>();
  const epMap = new Map<number, GalleryImage[]>();

  for (const card of cards) {
    epSet.add(card.episode);
    const cardTitle = card.title || `EP${card.episode} Card`;
    for (const img of card.generatedImages ?? []) {
      const row: GalleryImage = { ...img, cardTitle, cardId: card.id };
      allImages.push(row);
      if (img.assignedEpisode != null) epSet.add(img.assignedEpisode);
      const bucket = img.assignedEpisode ?? 0;
      const existing = epMap.get(bucket);
      if (existing) existing.push(row);
      else epMap.set(bucket, [row]);
    }
  }

  allImages.sort((a, b) => b.createdAt - a.createdAt);

  const filtered = allImages.filter((image) => {
    if (filterEp !== 'all' && image.assignedEpisode !== filterEp) return false;
    if (showFavOnly && !image.favorite) return false;
    return true;
  });

  return {
    allImages,
    filtered,
    epOptions: Array.from(epSet).sort((a, b) => a - b),
    timeline: Array.from(epMap.entries()).sort((a, b) => a[0] - b[0]),
  };
}

export function SceneGallery({
  cards,
  lang,
  totalEpisodes,
  onUpdateCard,
  onDeleteImage,
}: {
  cards: VisualPromptCard[];
  lang: string;
  totalEpisodes: number;
  onUpdateCard: (card: VisualPromptCard) => void;
  onDeleteImage: (cardId: string, imageId: string) => void;
}) {
  const [filterEp, setFilterEp] = useState<number | 'all'>('all');
  const [showFavOnly, setShowFavOnly] = useState(false);

  const { allImages, filtered, epOptions, timeline } = useMemo(
    () => deriveGalleryData(cards, filterEp, showFavOnly),
    [cards, filterEp, showFavOnly],
  );

  const toggleFavorite = (cardId: string, imageId: string) => {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (!card) return;
    onUpdateCard({
      ...card,
      generatedImages: (card.generatedImages ?? []).map((image) =>
        image.id === imageId ? { ...image, favorite: !image.favorite } : image,
      ),
    });
  };

  const assignEpisode = (cardId: string, imageId: string, ep: number) => {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (!card) return;
    onUpdateCard({
      ...card,
      generatedImages: (card.generatedImages ?? []).map((image) =>
        image.id === imageId ? { ...image, assignedEpisode: ep } : image,
      ),
    });
  };

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <Grid className="w-10 h-10 text-text-tertiary mb-3" />
        <p className="text-[12px] text-text-tertiary">
          {L4(lang, {
            ko: '준비된 시각 시안이 없습니다. 카드에서 시안을 준비하세요.',
            en: 'No visual previews yet. Create previews from cards.',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ds-card">
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">
          {L4(lang, { ko: '에피소드 타임라인', en: 'Episode Timeline', ja: 'エピソードタイムライン', zh: '剧集时间线' })}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeline.map(([ep, imgs]) => (
            <button
              key={ep}
              onClick={() => setFilterEp(ep === 0 ? 'all' : ep)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-[transform,opacity,background-color,border-color,color] ${
                filterEp === ep ? 'border-accent-purple/40 bg-accent-purple/10' : 'border-border bg-bg-secondary/50 hover:border-border'
              }`}
            >
              <span className="text-[10px] font-bold text-text-secondary">
                {ep === 0 ? L4(lang, { ko: '미배정', en: 'Unassigned', ja: '未割当', zh: '未分配' }) : `EP.${ep}`}
              </span>
              <div className="flex -space-x-1.5">
                {imgs.slice(0, 3).map((image) => (
                  <Image
                    key={image.id}
                    src={image.imageUrl}
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

      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={filterEp}
            onChange={(event) => setFilterEp(event.target.value === 'all' ? 'all' : Number(event.target.value))}
            className="bg-bg-secondary/80 border border-border rounded-lg px-3 py-1.5 text-[10px] text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 appearance-none pr-6 transition-colors"
          >
            <option value="all">{L4(lang, { ko: '전체 에피소드', en: 'All Episodes', ja: '全エピソード', zh: '所有剧集' })}</option>
            {epOptions.map((ep) => (
              <option key={ep} value={ep}>EP.{ep}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        </div>
        <button
          onClick={() => setShowFavOnly(!showFavOnly)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-[transform,opacity,background-color,border-color,color] ${
            showFavOnly
              ? 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber'
              : 'bg-bg-secondary/50 border-border text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Star className="w-3 h-3" /> {L4(lang, { ko: '즐겨찾기', en: 'Favorites', ja: 'お気に入り', zh: '收藏' })}
        </button>
        <span className="text-[9px] text-text-tertiary ml-auto">
          {filtered.length} / {allImages.length} {L4(lang, { ko: '이미지', en: 'images', ja: '画像', zh: '图片' })}
        </span>
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {filtered.map((image) => (
          <div key={image.id} className="break-inside-avoid rounded-xl overflow-hidden border border-border/40 bg-bg-secondary/50 group">
            <div className="relative">
              <Image src={image.imageUrl} alt={image.cardTitle} unoptimized fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end gap-1 p-2">
                <button
                  onClick={() => toggleFavorite(image.cardId, image.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    image.favorite ? 'bg-accent-amber/30 text-accent-amber' : 'bg-bg-primary/60 text-text-tertiary hover:text-accent-amber'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" fill={image.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => onDeleteImage(image.cardId, image.id)}
                  className="p-1.5 rounded-lg bg-bg-primary/60 text-text-tertiary hover:text-accent-red transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-2.5 py-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-text-secondary truncate">{image.cardTitle}</p>
              <div className="flex items-center gap-1.5">
                <select
                  value={image.assignedEpisode ?? ''}
                  onChange={(event) => assignEpisode(image.cardId, image.id, Number(event.target.value) || 0)}
                  className="flex-1 bg-bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-[9px] text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors"
                >
                  <option value="">{L4(lang, { ko: '에피소드 배정', en: 'Assign EP', ja: 'エピソード割当', zh: '分配剧集' })}</option>
                  {Array.from({ length: totalEpisodes }, (_, index) => index + 1).map((ep) => (
                    <option key={ep} value={ep}>EP.{ep}</option>
                  ))}
                </select>
                {image.favorite && <Star className="w-2.5 h-2.5 text-accent-amber" fill="currentColor" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
