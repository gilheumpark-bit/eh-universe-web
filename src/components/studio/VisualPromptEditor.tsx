"use client";

import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { VisualPromptCard, VisualShotType, VisualLevelPack } from '@/lib/studio-types';
import { buildFinalVisualPrompt, buildNegativePrompt } from '@/lib/visual-prompt';
import { VISUAL_PRESETS } from '@/lib/visual-defaults';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

interface VisualPromptEditorProps {
  card: VisualPromptCard;
  onChange: (card: VisualPromptCard) => void;
  onDelete: () => void;
  isKO: boolean;
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

export default function VisualPromptEditor({ card, onChange, onDelete, isKO }: VisualPromptEditorProps) {
  const update = React.useCallback((patch: Partial<VisualPromptCard>) => {
    onChange({ ...card, ...patch, updatedAt: Date.now() });
  }, [card, onChange]);
  const updateLevel = React.useCallback((key: keyof VisualLevelPack, val: 0 | 1 | 2 | 3) => {
    update({ levels: { ...card.levels, [key]: val } });
  }, [card.levels, update]);

  const finalPrompt = buildFinalVisualPrompt(card);
  const negPrompt = buildNegativePrompt(card);

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
          className="flex-1 ds-input text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        <select
          value={card.shotType}
          onChange={e => update({ shotType: e.target.value as VisualShotType })}
          className="bg-black/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
        >
          {SHOT_TYPES.map(s => (
            <option key={s.value} value={s.value}>{isKO ? s.ko : s.en}</option>
          ))}
        </select>
      </div>

      {/* Presets */}
      <div>
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">
          {isKO ? '프리셋' : 'Presets'}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISUAL_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => update({ levels: { ...p.levels }, shotType: p.defaultShotType || card.shotType })}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-text-tertiary hover:text-text-secondary hover:border-zinc-600 transition-all"
            >
              {p.name}
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
                    className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all ${
                      card.levels[key] === v
                        ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 border'
                        : 'bg-zinc-900 border border-zinc-800 text-text-tertiary hover:text-text-secondary'
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
                  className="w-full ds-input text-xs text-[11px] text-text-secondary placeholder-zinc-700 outline-none resize-none focus:border-zinc-600"
                />
              </div>
            );
          })}
        </div>
      </details>

      {/* Final Prompt Preview */}
      <div className="bg-black/60 border border-zinc-800 rounded-xl p-4">
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
          {finalPrompt || (isKO ? '레벨을 조절하면 자동 생성됩니다' : 'Adjust levels to auto-generate')}
        </p>
        {negPrompt && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
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
