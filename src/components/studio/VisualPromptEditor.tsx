"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Copy, Trash2, Sparkles, Image as ImageIcon, Loader2, Download } from 'lucide-react';
import { VisualPromptCard, VisualShotType, VisualLevelPack, Character, GeneratedVisualAsset } from '@/lib/studio-types';
import { generateImage, ImageGenProvider, ImageGenResult } from '@/services/imageGenerationService';
import { buildFinalVisualPrompt, buildNegativePrompt } from '@/lib/visual-prompt';
import { VISUAL_PRESETS } from '@/lib/visual-defaults';
import { extractConsistencyTags } from '@/lib/noi-auto-tags';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

interface VisualPromptEditorProps {
  card: VisualPromptCard;
  onChange: (card: VisualPromptCard) => void;
  onDelete: () => void;
  isKO: boolean;
  characters?: Character[];
  imageApiKey?: string;
  imageProvider?: ImageGenProvider;
  /** Called after a successful image generation (used by batch generation) */
  onImageGenerated?: (cardId: string) => void;
}

const SHOT_TYPES: { value: VisualShotType; ko: string; en: string }[] = [
  { value: 'key_scene', ko: '대표 장면', en: 'Key Scene' },
  { value: 'character_focus', ko: '인물 중심', en: 'Character Focus' },
  { value: 'background_focus', ko: '배경 중심', en: 'Background Focus' },
  { value: 'cover', ko: '표지', en: 'Cover' },
  { value: 'thumbnail', ko: '썸네일', en: 'Thumbnail' },
  { value: 'object_focus', ko: '오브젝트', en: 'Object Focus' },
];

const LEVEL_KEYS: { key: keyof VisualLevelPack; ko: string; en: string }[] = [
  { key: 'subjectFocus', ko: '인물 강조', en: 'Subject' },
  { key: 'backgroundDensity', ko: '배경 밀도', en: 'Background' },
  { key: 'sceneTension', ko: '긴장도', en: 'Tension' },
  { key: 'emotionIntensity', ko: '감정 표출', en: 'Emotion' },
  { key: 'compositionDrama', ko: '구도 연출', en: 'Composition' },
  { key: 'styleStrength', ko: '스타일', en: 'Style' },
  { key: 'symbolismWeight', ko: '상징', en: 'Symbolism' },
];

const LEVEL_LABELS = ['OFF', 'LOW', 'MID', 'HIGH'];

// IDENTITY_SEAL: PART-1 | role=types and constants | inputs=none | outputs=arrays

// ============================================================
// PART 2 — Component
// ============================================================

export default function VisualPromptEditor({ card, onChange, onDelete, isKO, characters, imageApiKey, imageProvider, onImageGenerated }: VisualPromptEditorProps) {
  const { IMAGE_GENERATION: imageGenEnabled } = useFeatureFlags();
  const update = React.useCallback((patch: Partial<VisualPromptCard>) => {
    onChange({ ...card, ...patch, updatedAt: Date.now() });
  }, [card, onChange]);
  const updateLevel = React.useCallback((key: keyof VisualLevelPack, val: 0 | 1 | 2 | 3) => {
    update({ levels: { ...card.levels, [key]: val } });
  }, [card.levels, update]);

  const finalPrompt = buildFinalVisualPrompt(card);
  const negPrompt = buildNegativePrompt(card);

  // Image generation state — seed from persisted generatedImages
  const [genImages, setGenImages] = useState<ImageGenResult[]>(() =>
    (card.generatedImages ?? []).map(a => ({ url: a.imageUrl, revised_prompt: a.revisedPrompt }))
  );
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!imageApiKey || !imageProvider || !finalPrompt) return;
    setGenLoading(true);
    setGenError(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const options = { 
      n: 1, 
      seed: card.seed, 
      referenceImageUrl: card.referenceImageUrl 
    };

    const result = await generateImage(imageProvider, finalPrompt, negPrompt, imageApiKey, options, ac.signal);
    if (result.error) {
      setGenError(result.error);
    } else {
      setGenImages(prev => [...result.images, ...prev].slice(0, 4));
      // Persist into card.generatedImages for gallery collection
      const newAssets: GeneratedVisualAsset[] = result.images.map(img => ({
        id: `ga-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        promptCardId: card.id,
        provider: imageProvider,
        model: imageProvider === 'openai' ? 'dall-e-3' : 'sdxl',
        imageUrl: img.url,
        promptSnapshot: finalPrompt,
        createdAt: Date.now(),
        assignedEpisode: card.episode,
        revisedPrompt: img.revised_prompt,
      }));
      const existing = card.generatedImages ?? [];
      update({ generatedImages: [...newAssets, ...existing].slice(0, 8) });
      onImageGenerated?.(card.id);
    }
    setGenLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="space-y-5">
      {/* Title + Shot Type */}
      <div className="flex gap-3">
        <input
          value={card.title}
          onChange={e => update({ title: e.target.value })}
          placeholder={isKO ? '카드 제목' : 'Card title'}
          className="flex-1 ds-input text-sm text-white placeholder-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-zinc-600"
        />
        <select
          value={card.shotType}
          onChange={e => update({ shotType: e.target.value as VisualShotType })}
          className="bg-black/40 border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          {SHOT_TYPES.map(s => (
            <option key={s.value} value={s.value}>{isKO ? s.ko : s.en}</option>
          ))}
        </select>
      </div>

      {/* Presets — Premium Card Layout */}
      <div>
        <div className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
          {isKO ? '프리셋' : 'Presets'}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {VISUAL_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => update({ levels: { ...p.levels }, shotType: p.defaultShotType || card.shotType })}
              className="group flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-bg-secondary/50 border border-border text-text-tertiary hover:text-accent-purple hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-colors duration-200"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">🎬</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Controls */}
      <div>
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">
          {isKO ? '레벨 컨트롤' : 'Level Controls'}
        </div>
        <div className="space-y-2">
          {LEVEL_KEYS.map(({ key, ko, en }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 text-[11px] text-text-tertiary font-semibold shrink-0">
                {isKO ? ko : en}
              </span>
              <div className="flex gap-1">
                {([0, 1, 2, 3] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => updateLevel(key, v)}
                    className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-[transform,opacity,background-color,border-color,color] ${
                      card.levels[key] === v
                        ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 border'
                        : 'bg-bg-secondary border border-border text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {LEVEL_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Text Fields (advanced) */}
      <details className="group">
        <summary className="text-[10px] font-black text-text-tertiary uppercase tracking-widest cursor-pointer hover:text-text-secondary">
          {isKO ? '▸ 텍스트 직접 편집 (고급)' : '▸ Manual Text Edit (Advanced)'}
        </summary>
        <div className="mt-3 space-y-2">
          {(['subjectPrompt', 'backgroundPrompt', 'scenePrompt', 'compositionPrompt', 'lightingPrompt', 'stylePrompt', 'negativePrompt'] as const).map(field => {
            const labels: Record<string, string> = isKO
              ? { subjectPrompt: '인물', backgroundPrompt: '배경', scenePrompt: '장면', compositionPrompt: '구도', lightingPrompt: '조명', stylePrompt: '스타일', negativePrompt: '금지 요소' }
              : { subjectPrompt: 'Subject', backgroundPrompt: 'Background', scenePrompt: 'Scene', compositionPrompt: 'Composition', lightingPrompt: 'Lighting', stylePrompt: 'Style', negativePrompt: 'Negative' };
            return (
              <div key={field}>
                <label className="text-[10px] text-text-tertiary font-semibold">{labels[field]}</label>
                <textarea
                  value={card[field] || ''}
                  onChange={e => update({ [field]: e.target.value })}
                  rows={2}
                  className="w-full ds-input text-xs text-[11px] text-text-secondary placeholder-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 resize-none focus:border-zinc-600"
                />
              </div>
            );
          })}
        </div>
      </details>

      {/* Tunneling / Seed (Advanced) */}
      <details className="group">
        <summary className="text-[10px] font-black text-text-tertiary uppercase tracking-widest cursor-pointer hover:text-text-secondary mt-2">
          {isKO ? '▸ Image2Image 터널링 및 시드 (고급)' : '▸ Image2Image Tunneling & Seed (Advanced)'}
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[10px] mb-1 block text-text-tertiary font-semibold">{isKO ? '시드값 (Seed)' : 'Seed'}</label>
            <input
              type="number"
              value={card.seed || ''}
              onChange={e => update({ seed: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 42"
              className="w-full ds-input text-[11px] bg-black/40 border-border text-text-secondary placeholder-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-zinc-600 px-3 py-2 rounded-lg"
            />
            <p className="text-[9px] text-zinc-500 mt-1">
              {isKO ? '시드 값을 고정하면 인물의 얼굴이나 아트 스타일의 시각적 일관성(Consistency)을 유지하기 쉽습니다.' : 'Fixing the seed helps maintain face/style consistency.'}
            </p>
          </div>
          <div>
            <label className="text-[10px] mb-1 block text-text-tertiary font-semibold">{isKO ? '레퍼런스 이미지 URL' : 'Reference Image URL'}</label>
            <input
              type="url"
              value={card.referenceImageUrl || ''}
              onChange={e => update({ referenceImageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full ds-input text-[11px] bg-black/40 border-border text-text-secondary placeholder-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-zinc-600 px-3 py-2 rounded-lg"
            />
            <p className="text-[9px] text-zinc-500 mt-1">
              {isKO ? '컨트롤넷이나 Image2Image 파이프라인에서 참조할 원본 캐릭터의 이미지 주소(URL)입니다.' : 'Source image URL for ControlNet or Image2Image pipeline.'}
            </p>
          </div>
        </div>
      </details>

      {/* Final Prompt Preview */}
      <div className="bg-black/60 border border-border rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
            {isKO ? '최종 프롬프트' : 'Final Prompt'}
          </span>
          <button
            onClick={() => copyToClipboard(finalPrompt)}
            className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-blue-400 transition-colors"
          >
            <Copy className="w-3 h-3" /> {isKO ? '복사' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
          {finalPrompt || (isKO ? '레벨을 조절하면 초안이 생성됩니다' : 'Adjust levels to generate draft')}
        </p>
        {negPrompt && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold text-red-500/60 uppercase">Negative</span>
              <button
                onClick={() => copyToClipboard(negPrompt)}
                className="text-[9px] text-text-tertiary hover:text-red-400"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
            <p className="text-[10px] text-text-tertiary">{negPrompt}</p>
          </div>
        )}
      </div>

      {!imageGenEnabled && (
        <div className="text-[9px] text-text-tertiary bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          {isKO
            ? '이미지 생성 기능이 비활성화되어 있습니다. (관리자 플래그 IMAGE_GENERATION)'
            : 'Image generation is disabled (IMAGE_GENERATION feature flag).'}
        </div>
      )}

      {/* Image Generation Preview */}
      {imageGenEnabled && imageApiKey && imageProvider && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {isKO ? '이미지 생성 프리뷰' : 'Image Generation Preview'}
            </span>
            <button
              onClick={handleGenerate}
              disabled={genLoading || !finalPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-linear-to-r from-blue-600 to-purple-600 text-white disabled:opacity-40 transition-[transform,opacity] active:scale-95"
            >
              {genLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              {genLoading ? (isKO ? '생성 중...' : 'Generating...') : (isKO ? '이미지 생성' : 'Generate')}
            </button>
          </div>

          {genError && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {genError}
            </div>
          )}

          {genImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {genImages.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-border/30 bg-black/30">
                  <Image
                    src={img.url}
                    alt={`Generated ${i + 1}`}
                    width={400}
                    height={400}
                    unoptimized
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a href={img.url} download={`noi-${card.title || 'image'}-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                      <Download className="w-4 h-4 text-white" />
                    </a>
                  </div>
                  {img.revised_prompt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1">
                      <p className="text-[8px] text-text-tertiary line-clamp-2">{img.revised_prompt}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {genImages.length === 0 && !genLoading && !genError && (
            <div className="text-center py-6 border border-border/30 border-dashed rounded-xl text-text-tertiary text-[10px]">
              {isKO ? '"이미지 생성" 버튼을 눌러 프리뷰를 생성하세요' : 'Click "Generate" to create a preview'}
            </div>
          )}
        </div>
      )}

      {imageGenEnabled && !imageApiKey && (
        <div className="text-[9px] text-text-tertiary bg-bg-secondary/30 border border-border/30 rounded-lg px-3 py-2">
          {isKO ? '설정에서 이미지 생성 API 키를 등록하면 프리뷰를 생성할 수 있습니다.' : 'Add an image generation API key in Settings to enable previews.'}
        </div>
      )}

      {/* NOI 일관성 태그 추출 */}
      {characters && characters.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {isKO ? '일관성 태그' : 'Consistency Tags'}
            </span>
            <button
              onClick={() => {
                const allTags: string[] = [...(card.consistencyTags || [])];
                for (const charName of card.selectedCharacters) {
                  const char = characters.find(c => c.name === charName || c.id === charName);
                  if (char) {
                    const tags = extractConsistencyTags(char);
                    for (const tag of tags) {
                      if (!allTags.includes(tag)) allTags.push(tag);
                    }
                  }
                }
                // 선택된 캐릭터가 없으면 전체 캐릭터에서 추출
                if (card.selectedCharacters.length === 0) {
                  for (const char of characters) {
                    const tags = extractConsistencyTags(char);
                    for (const tag of tags) {
                      if (!allTags.includes(tag)) allTags.push(tag);
                    }
                  }
                }
                update({ consistencyTags: allTags });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> {isKO ? '추출' : 'Extract'}
            </button>
          </div>
          {(card.consistencyTags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.consistencyTags!.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-600/10 border border-purple-500/20 text-purple-300">
                  {tag}
                  <button
                    onClick={() => update({ consistencyTags: card.consistencyTags!.filter((_, j) => j !== i) })}
                    className="ml-1 text-purple-400/50 hover:text-red-400"
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-[10px] text-text-tertiary hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3 h-3" /> {isKO ? '카드 삭제' : 'Delete Card'}
      </button>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=visual card editor UI | inputs=VisualPromptCard | outputs=edited card
