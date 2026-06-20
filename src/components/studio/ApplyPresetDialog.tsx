'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// ApplyPresetDialog — 선택한 프리셋을 현재 씬시트에 적용 전 미리보기.
// role=dialog + focus-trap + Escape 닫기 + 4언어.
//
// 표시:
//   - 프리셋 이름/설명/태그
//   - 현재 씬시트와 필드별 diff (덮어쓸 필드 강조)
//   - "전체 적용" / "취소" / "일부만 적용" (고급 — 체크박스 다중 선택)
//
// [C] 빈 프리셋 방어, 잘못된 sceneDirection 방어
// [G] diff 계산 useMemo
// [K] 적용 로직 외부 prop, registry 호출 안 함

import React, { useMemo, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, SceneDirectionData } from '@/lib/studio-types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  applyPreset,
  applyPresetPartial,
  recordUsage,
  type ScenePreset,
} from '@/lib/scene-preset-registry';

interface ApplyPresetDialogProps {
  open: boolean;
  onClose: () => void;
  language: AppLanguage;
  preset: ScenePreset | null;
  currentDirection: SceneDirectionData;
  onApply: (mergedDirection: SceneDirectionData) => void;
}

// ============================================================
// PART 2 — Field labels (4언어)
// ============================================================

const FIELD_LABELS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  goguma: { ko: '고구마/사이다', en: 'Tension/Release', ja: 'テンション/リリース', zh: '紧张/释放' },
  hooks: { ko: '훅', en: 'Hooks', ja: 'フック', zh: '钩子' },
  emotionTargets: { ko: '감정 곡선', en: 'Emotion Targets', ja: '感情ターゲット', zh: '情感目标' },
  dialogueTones: { ko: '대화 톤', en: 'Dialogue Tones', ja: '対話トーン', zh: '对话语气' },
  dopamineDevices: { ko: '도파민 장치', en: 'Dopamine Devices', ja: 'ドーパミン装置', zh: '多巴胺装置' },
  cliffhanger: { ko: '클리프행어', en: 'Cliffhanger', ja: 'クリフハンガー', zh: '悬念结尾' },
  plotStructure: { ko: '플롯 구조', en: 'Plot Structure', ja: 'プロット構造', zh: '情节结构' },
  foreshadows: { ko: '복선', en: 'Foreshadows', ja: '伏線', zh: '伏笔' },
  pacings: { ko: '페이싱', en: 'Pacing', ja: 'ペーシング', zh: '节奏' },
  tensionCurve: { ko: '긴장 곡선', en: 'Tension Curve', ja: 'テンション曲線', zh: '紧张曲线' },
  canonRules: { ko: '캐릭터 규칙', en: 'Canon Rules', ja: 'キャノン規則', zh: '角色规则' },
  sceneTransitions: { ko: '씬 전환', en: 'Scene Transitions', ja: 'シーン転換', zh: '场景转换' },
  writerNotes: { ko: '작가 메모', en: 'Writer Notes', ja: '作者メモ', zh: '作者备注' },
  activeCharacters: { ko: '등장인물', en: 'Active Characters', ja: '登場人物', zh: '活跃角色' },
  activeItems: { ko: '활성 아이템', en: 'Active Items', ja: 'アクティブアイテム', zh: '活跃物品' },
};

function describeValue(v: unknown, language: AppLanguage): string {
  if (v === null || v === undefined) {
    return L4(language, { ko: '(없음)', en: '(empty)', ja: '(なし)', zh: '(空)' });
  }
  if (Array.isArray(v)) {
    return L4(language, {
      ko: `${v.length}개 항목`,
      en: `${v.length} item(s)`,
      ja: `${v.length} 項目`,
      zh: `${v.length} 项`,
    });
  }
  if (typeof v === 'string') {
    return v.length > 40 ? v.slice(0, 40) + '...' : v;
  }
  if (typeof v === 'object') {
    return L4(language, { ko: '값 있음', en: 'Has value', ja: '値あり', zh: '有值' });
  }
  return String(v);
}

// ============================================================
// PART 3 — Diff calculation
// ============================================================

interface DiffEntry {
  field: keyof SceneDirectionData;
  presetValue: unknown;
  currentValue: unknown;
  willOverwrite: boolean;
}

function computeDiff(
  preset: ScenePreset | null,
  current: SceneDirectionData
): DiffEntry[] {
  if (!preset) return [];
  const presetDir = preset.sceneDirection ?? {};
  const entries: DiffEntry[] = [];
  const presetKeys = Object.keys(presetDir) as (keyof SceneDirectionData)[];
  for (const key of presetKeys) {
    const presetVal = presetDir[key];
    const currentVal = current[key];
    if (presetVal === undefined || presetVal === null) continue;
    const hasCurrent = currentVal !== undefined && currentVal !== null
      && !(Array.isArray(currentVal) && currentVal.length === 0)
      && !(typeof currentVal === 'string' && currentVal.trim() === '');
    entries.push({
      field: key,
      presetValue: presetVal,
      currentValue: currentVal,
      willOverwrite: hasCurrent,
    });
  }
  return entries;
}

// ============================================================
// PART 4 — Component
// ============================================================

export function ApplyPresetDialog({
  open,
  onClose,
  language,
  preset,
  currentDirection,
  onApply,
}: ApplyPresetDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // [G] 다이얼로그가 닫혔다가 다시 열릴 때(혹은 preset이 바뀔 때) 자동 초기화하기 위해
  //     preset.id를 React key로 사용. open=false일 때는 컴포넌트 자체가 unmount되므로
  //     useState 기본값이 매 마운트마다 적용된다.
  const [advancedMode, setAdvancedMode] = useState(false);
  // 선택 필드는 diff에서 파생 + 사용자 토글 오버라이드.
  // [C] 초기값은 diff 전체 — 작가가 명시적으로 deselect 하기 전까지 모두 적용 대상.
  const [selectedFieldsOverride, setSelectedFieldsOverride] = useState<Set<keyof SceneDirectionData> | null>(null);

  // resetLocalState — onClose 콜백에서 사용. 함수 선언 순서 보장.
  const resetLocalState = () => {
    setAdvancedMode(false);
    setSelectedFieldsOverride(null);
  };
  const handleClose = () => {
    resetLocalState();
    onClose();
  };

  useFocusTrap(dialogRef, open, handleClose);

  const diff = useMemo(() => computeDiff(preset, currentDirection), [preset, currentDirection]);

  const selectedFields = selectedFieldsOverride ?? new Set(diff.map(d => d.field));
  const setSelectedFields = (next: Set<keyof SceneDirectionData>) => setSelectedFieldsOverride(next);

  // ============================================================
  // PART 5 — Apply handlers
  // ============================================================

  const handleApplyAll = async () => {
    if (!preset) return;
    const merged = applyPreset(preset, currentDirection);
    onApply(merged);
    void recordUsage(preset.id);
    resetLocalState();
    onClose();
  };

  const handleApplyPartial = async () => {
    if (!preset || selectedFields.size === 0) return;
    const merged = applyPresetPartial(preset, currentDirection, Array.from(selectedFields));
    onApply(merged);
    void recordUsage(preset.id);
    resetLocalState();
    onClose();
  };

  const toggleField = (field: keyof SceneDirectionData) => {
    const next = new Set(selectedFields);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    setSelectedFields(next);
  };

  if (!open || !preset) return null;

  // ============================================================
  // PART 6 — Render
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-preset-title"
        className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border bg-bg-primary shadow-2xl"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="apply-preset-title" className="text-sm font-bold uppercase tracking-wider text-text-primary">
            {L4(language, {
              ko: '프리셋 적용 미리보기',
              en: 'Apply Preset Preview',
              ja: 'プリセット適用プレビュー',
              zh: '应用预设预览',
            })}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label={L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 본문 — 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 프리셋 정보 */}
          <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-3">
            <h3 className="text-sm font-bold text-text-primary">{preset.name}</h3>
            {preset.description && (
              <p className="text-xs text-text-secondary mt-1">{preset.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {preset.genre && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-mono">
                  {preset.genre}
                </span>
              )}
              {preset.tags?.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* Diff 안내 */}
          {diff.length === 0 ? (
            <div role="status" className="text-center py-6 text-xs text-text-tertiary">
              {L4(language, {
                ko: '이 프리셋에는 적용할 필드가 없습니다',
                en: 'No fields to apply in this preset',
                ja: 'このプリセットには適用するフィールドがありません',
                zh: '此预设没有可应用的字段',
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  {L4(language, {
                    ko: `${diff.length}개 필드 변경 예정`,
                    en: `${diff.length} field(s) will be applied`,
                    ja: `${diff.length} 個のフィールドが変更されます`,
                    zh: `将变更 ${diff.length} 个字段`,
                  })}
                  {' · '}
                  <span className="text-accent-amber font-mono">
                    {L4(language, {
                      ko: `${diff.filter(d => d.willOverwrite).length}개 덮어쓰기`,
                      en: `${diff.filter(d => d.willOverwrite).length} overwrites`,
                      ja: `${diff.filter(d => d.willOverwrite).length} 個上書き`,
                      zh: `${diff.filter(d => d.willOverwrite).length} 个覆盖`,
                    })}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setAdvancedMode(v => !v)}
                  className="text-[10px] font-mono text-accent-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1"
                >
                  {advancedMode
                    ? L4(language, { ko: '간단히', en: 'Simple', ja: '簡単に', zh: '简单' })
                    : L4(language, { ko: '고급 (선택 적용)', en: 'Advanced (selective)', ja: '高度 (選択適用)', zh: '高级 (选择应用)' })}
                </button>
              </div>

              {/* Diff 리스트 */}
              <ul className="space-y-1.5">
                {diff.map(d => {
                  const label = FIELD_LABELS[d.field as string]
                    ? L4(language, FIELD_LABELS[d.field as string])
                    : d.field;
                  const checked = selectedFields.has(d.field);
                  return (
                    <li
                      key={d.field}
                      className={`flex items-start gap-2 p-2 rounded-lg border ${
                        d.willOverwrite
                          ? 'border-accent-amber/30 bg-accent-amber/5'
                          : 'border-border bg-bg-secondary/30'
                      }`}
                    >
                      {advancedMode && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleField(d.field)}
                          aria-label={L4(language, {
                            ko: `${label} 적용`,
                            en: `Apply ${label}`,
                            ja: `${label}を適用`,
                            zh: `应用 ${label}`,
                          })}
                          className="mt-1 w-4 h-4 accent-accent-purple"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">{label}</span>
                          {d.willOverwrite && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber font-mono">
                              <span aria-hidden="true">⚠️</span>
                              {L4(language, {
                                ko: '덮어쓰기',
                                en: 'overwrite',
                                ja: '上書き',
                                zh: '覆盖',
                              })}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[10px] text-text-tertiary space-y-0.5">
                          {d.willOverwrite && (
                            <p>
                              <span className="font-mono">
                                {L4(language, { ko: '현재', en: 'now', ja: '現在', zh: '当前' })}:
                              </span>{' '}
                              <span className="line-through">{describeValue(d.currentValue, language)}</span>
                            </p>
                          )}
                          <p>
                            <span className="font-mono">
                              {L4(language, { ko: '신규', en: 'new', ja: '新規', zh: '新值' })}:
                            </span>{' '}
                            <span className="text-text-primary">{describeValue(d.presetValue, language)}</span>
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-bg-secondary border border-border text-text-secondary text-xs font-bold hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
          </button>
          {advancedMode ? (
            <button
              type="button"
              onClick={handleApplyPartial}
              disabled={selectedFields.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-accent-purple text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,opacity] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {L4(language, {
                ko: `선택 ${selectedFields.size}개 적용`,
                en: `Apply ${selectedFields.size} selected`,
                ja: `選択 ${selectedFields.size} 個適用`,
                zh: `应用所选 ${selectedFields.size} 个`,
              })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={diff.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-accent-purple text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,opacity] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {L4(language, {
                ko: '전체 적용',
                en: 'Apply All',
                ja: 'すべて適用',
                zh: '全部应用',
              })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplyPresetDialog;

// IDENTITY_SEAL: ApplyPresetDialog | role=apply preset modal w/ diff | inputs=props | outputs=JSX
