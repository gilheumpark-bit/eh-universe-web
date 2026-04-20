'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// SavePresetDialog — 현재 씬시트를 프리셋으로 저장하는 모달.
// role=dialog + focus-trap + Escape 닫기 + 4언어.
//
// [C] 입력 길이 가드, 빈 이름 차단, focus-trap
// [G] focus 복원, 메모이즈된 카운트
// [K] 저장 로직은 외부 prop으로 분리 — registry import 안 함

import React, { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, SceneDirectionData } from '@/lib/studio-types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { buildPreset, savePreset, countPresetFields, type PresetVisibility } from '@/lib/scene-preset-registry';

interface SavePresetDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (presetId: string) => void;
  language: AppLanguage;
  /** 저장할 sceneDirection 스냅샷 */
  sceneDirection: Partial<SceneDirectionData>;
  /** 메타데이터 */
  currentGenre?: string;
  currentEpisode?: number;
  currentProject?: string;
}

// ============================================================
// PART 2 — Component
// ============================================================

export function SavePresetDialog({
  open,
  onClose,
  onSaved,
  language,
  sceneDirection,
  currentGenre,
  currentEpisode,
  currentProject,
}: SavePresetDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [visibility, setVisibility] = useState<PresetVisibility>('private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTagsText('');
      setVisibility('private');
      setError(null);
    }
  }, [open]);

  // ============================================================
  // PART 3 — Field count preview
  // ============================================================
  const fieldCount = React.useMemo(() => {
    const fakePreset = buildPreset({ name: 'preview', sceneDirection });
    return countPresetFields(fakePreset);
  }, [sceneDirection]);

  // ============================================================
  // PART 4 — Save handler
  // ============================================================

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(L4(language, {
        ko: '이름을 입력해주세요',
        en: 'Please enter a name',
        ja: '名前を入力してください',
        zh: '请输入名称',
      }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const preset = buildPreset({
        name: trimmed,
        description,
        sceneDirection,
        genre: currentGenre,
        tags,
        visibility,
        sourceEpisode: currentEpisode,
        sourceProject: currentProject,
      });
      const ok = await savePreset(preset);
      if (!ok) {
        setError(L4(language, {
          ko: '저장에 실패했습니다',
          en: 'Save failed',
          ja: '保存に失敗しました',
          zh: '保存失败',
        }));
        setSaving(false);
        return;
      }
      onSaved?.(preset.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // ============================================================
  // PART 5 — Render
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-preset-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-primary shadow-2xl"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="save-preset-title" className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Save className="w-4 h-4 text-accent-purple" aria-hidden="true" />
            {L4(language, {
              ko: '프리셋 저장',
              en: 'Save Preset',
              ja: 'プリセット保存',
              zh: '保存预设',
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4">
          {/* 미리보기: 필드 카운트 */}
          <div className="px-3 py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
            <p className="text-xs text-accent-blue font-mono">
              {L4(language, {
                ko: `이 프리셋은 ${fieldCount}개 필드를 포함합니다`,
                en: `This preset will include ${fieldCount} field(s)`,
                ja: `このプリセットは ${fieldCount} 個のフィールドを含みます`,
                zh: `此预设包含 ${fieldCount} 个字段`,
              })}
            </p>
          </div>

          {/* 이름 (필수) */}
          <div>
            <label htmlFor="preset-name" className="block text-xs font-bold text-text-primary mb-1.5">
              {L4(language, { ko: '이름', en: 'Name', ja: '名前', zh: '名称' })}
              <span className="text-accent-red ml-1" aria-hidden="true">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              placeholder={L4(language, {
                ko: '예: 로맨스 절벽 엔딩',
                en: 'e.g. Romance Cliffhanger',
                ja: '例: ロマンス絶壁エンディング',
                zh: '例: 浪漫悬念结尾',
              })}
              required
              className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
          </div>

          {/* 설명 */}
          <div>
            <label htmlFor="preset-desc" className="block text-xs font-bold text-text-primary mb-1.5">
              {L4(language, { ko: '설명', en: 'Description', ja: '説明', zh: '描述' })}
            </label>
            <textarea
              id="preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={L4(language, {
                ko: '언제 쓰는 프리셋인지 메모',
                en: 'When to use this preset',
                ja: 'いつ使うプリセットかメモ',
                zh: '何时使用此预设的备注',
              })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue resize-none"
            />
          </div>

          {/* 태그 */}
          <div>
            <label htmlFor="preset-tags" className="block text-xs font-bold text-text-primary mb-1.5">
              {L4(language, {
                ko: '태그 (쉼표 구분)',
                en: 'Tags (comma-separated)',
                ja: 'タグ (カンマ区切り)',
                zh: '标签 (逗号分隔)',
              })}
            </label>
            <input
              id="preset-tags"
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder={L4(language, {
                ko: 'romance, cliffhanger, emotional',
                en: 'romance, cliffhanger, emotional',
                ja: 'romance, cliffhanger, emotional',
                zh: 'romance, cliffhanger, emotional',
              })}
              className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
          </div>

          {/* 가시성 */}
          <fieldset>
            <legend className="block text-xs font-bold text-text-primary mb-1.5">
              {L4(language, {
                ko: '공유 범위',
                en: 'Visibility',
                ja: '共有範囲',
                zh: '共享范围',
              })}
            </legend>
            <div className="flex gap-2 flex-wrap">
              {(['private', 'community', 'market'] as PresetVisibility[]).map(v => {
                const labels: Record<PresetVisibility, { ko: string; en: string; ja: string; zh: string }> = {
                  private: { ko: '개인', en: 'Private', ja: '個人', zh: '私人' },
                  community: { ko: '커뮤니티', en: 'Community', ja: 'コミュニティ', zh: '社区' },
                  market: { ko: '마켓', en: 'Market', ja: 'マーケット', zh: '市场' },
                };
                const disabled = v !== 'private'; // M3에선 private만 활성, community/market은 M4
                return (
                  <label
                    key={v}
                    className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border text-xs font-medium cursor-pointer ${
                      visibility === v
                        ? 'bg-accent-purple/10 border-accent-purple text-accent-purple'
                        : 'bg-bg-secondary border-border text-text-secondary'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="preset-visibility"
                      value={v}
                      checked={visibility === v}
                      onChange={() => !disabled && setVisibility(v)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    {L4(language, labels[v])}
                    {disabled && (
                      <span className="text-[9px] font-mono text-text-quaternary">
                        ({L4(language, { ko: 'M4', en: 'M4', ja: 'M4', zh: 'M4' })})
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 에러 메시지 — 색상 + 아이콘 + 텍스트 (NOA 디자인 규칙) */}
          {error && (
            <div role="alert" className="px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/30 flex items-start gap-2">
              <span className="text-accent-red text-sm shrink-0" aria-hidden="true">⚠️</span>
              <p className="text-xs text-accent-red font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-bg-secondary border border-border text-text-secondary text-xs font-bold hover:text-text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-accent-purple text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,opacity] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            {saving
              ? L4(language, { ko: '저장 중...', en: 'Saving...', ja: '保存中...', zh: '保存中...' })
              : L4(language, { ko: '저장', en: 'Save', ja: '保存', zh: '保存' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SavePresetDialog;

// IDENTITY_SEAL: SavePresetDialog | role=save preset modal | inputs=props | outputs=JSX
