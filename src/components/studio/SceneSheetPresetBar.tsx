'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// SceneSheetPresetBar — 씬시트 상단/하단 고정 바.
// "저장" 버튼 + "내 프리셋 ▼" 드롭다운 + Top-3 자주 쓰는 프리셋 + 검색/필터.
//
// 디자인 원칙:
//   - 4언어(KO/EN/JP/CN) 완전
//   - 44px 터치 타겟, focus-visible ring
//   - Tooltip 사용으로 액션 의도 명시
//   - 빈 상태(EmptyState 재사용) — 일관성
//
// [C] 비동기 로드 race 가드, 빈 결과 방어
// [G] useEffect 의존성 최소, debounce는 검색만
// [K] 다이얼로그는 외부 prop으로 분리

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Save, ChevronDown, Search, Trash2, Star } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';
import {
  listPresets,
  getTopUsedPresets,
  deletePreset,
  type ScenePreset,
} from '@/lib/scene-preset-registry';

interface SceneSheetPresetBarProps {
  language: AppLanguage;
  /** 현재 장르 — 장르별 필터 디폴트로 사용. */
  currentGenre?: string;
  /** "저장" 클릭 — 부모가 SavePresetDialog 오픈 */
  onSaveClick: () => void;
  /** 프리셋 선택(클릭) — 부모가 ApplyPresetDialog 오픈 */
  onApplyClick: (preset: ScenePreset) => void;
  /** 프리셋 변경 알림 (저장/삭제 후 외부 리렌더 트리거용) */
  refreshKey?: number;
}

// ============================================================
// PART 2 — Component
// ============================================================

export function SceneSheetPresetBar({
  language,
  currentGenre,
  onSaveClick,
  onApplyClick,
  refreshKey = 0,
}: SceneSheetPresetBarProps) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<ScenePreset[]>([]);
  const [topUsed, setTopUsed] = useState<ScenePreset[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>(currentGenre ?? '');
  const [loading, setLoading] = useState(false);

  // ============================================================
  // PART 3 — Data Loading
  // ============================================================

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, top] = await Promise.all([
        listPresets({
          searchText: search || undefined,
          genre: genreFilter || undefined,
        }),
        getTopUsedPresets(3),
      ]);
      setPresets(all);
      setTopUsed(top);
    } finally {
      setLoading(false);
    }
  }, [search, genreFilter]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  // 외부에서 currentGenre 바뀌면 필터도 동기화
  useEffect(() => {
    if (currentGenre !== undefined) setGenreFilter(currentGenre);
  }, [currentGenre]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm(
      L4(language, {
        ko: '이 프리셋을 삭제하시겠습니까?',
        en: 'Delete this preset?',
        ja: 'このプリセットを削除しますか?',
        zh: '要删除此预设吗?',
      })
    );
    if (!ok) return;
    await deletePreset(id);
    await reload();
  }, [language, reload]);

  // ============================================================
  // PART 4 — Genre options
  // ============================================================

  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    presets.forEach(p => { if (p.genre) set.add(p.genre); });
    return Array.from(set).sort();
  }, [presets]);

  // ============================================================
  // PART 5 — Render
  // ============================================================

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 px-3 border-t border-border bg-bg-secondary/40 rounded-b-lg">
      {/* 저장 버튼 */}
      <button
        type="button"
        onClick={onSaveClick}
        title={L4(language, {
          ko: '현재 씬시트를 프리셋으로 저장',
          en: 'Save current scene sheet as preset',
          ja: '現在のシーンシートをプリセットとして保存',
          zh: '将当前场景表保存为预设',
        })}
        className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-accent-purple text-white text-xs font-bold transition-[transform,opacity] hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
      >
        <Save className="w-3.5 h-3.5" aria-hidden="true" />
        {L4(language, { ko: '프리셋 저장', en: 'Save Preset', ja: 'プリセット保存', zh: '保存预设' })}
      </button>

      {/* Top-3 자주 쓰는 프리셋 (있을 때만) */}
      {topUsed.length > 0 && (
        <div
          role="group"
          aria-label={L4(language, {
            ko: '자주 쓰는 프리셋',
            en: 'Frequently used presets',
            ja: 'よく使うプリセット',
            zh: '常用预设',
          })}
          className="flex items-center gap-1.5 ml-1"
        >
          <Star className="w-3.5 h-3.5 text-accent-amber" aria-hidden="true" />
          {topUsed.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyClick(p)}
              title={`${p.name} — ${L4(language, { ko: '사용 횟수', en: 'used', ja: '使用回数', zh: '使用次数' })}: ${p.usageCount}`}
              className="px-2 min-h-[44px] rounded-lg bg-bg-secondary border border-border text-text-secondary text-[11px] font-medium hover:text-accent-amber hover:border-accent-amber transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue truncate max-w-[120px]"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* 내 프리셋 드롭다운 */}
      <div className="relative ml-auto">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-bg-primary border border-border text-text-primary text-xs font-bold transition-colors hover:border-accent-purple/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          {L4(language, {
            ko: '내 프리셋',
            en: 'My Presets',
            ja: '私のプリセット',
            zh: '我的预设',
          })}
          {presets.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple text-[9px] font-mono font-bold">
              {presets.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={L4(language, {
              ko: '저장된 프리셋 목록',
              en: 'Saved presets list',
              ja: '保存されたプリセット一覧',
              zh: '已保存的预设列表',
            })}
            className="absolute right-0 top-full mt-2 w-[320px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-bg-primary shadow-2xl z-[var(--z-dropdown)]"
          >
            {/* 검색 + 필터 */}
            <div className="p-3 border-b border-border space-y-2 sticky top-0 bg-bg-primary z-10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={L4(language, {
                    ko: '검색...',
                    en: 'Search...',
                    ja: '検索...',
                    zh: '搜索...',
                  })}
                  aria-label={L4(language, {
                    ko: '프리셋 검색',
                    en: 'Search presets',
                    ja: 'プリセット検索',
                    zh: '搜索预设',
                  })}
                  className="w-full pl-7 pr-2 py-2 rounded-lg border border-border bg-bg-secondary text-xs text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                />
              </div>
              {genreOptions.length > 0 && (
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  aria-label={L4(language, {
                    ko: '장르 필터',
                    en: 'Genre filter',
                    ja: 'ジャンルフィルター',
                    zh: '类型过滤',
                  })}
                  className="w-full px-2 py-2 rounded-lg border border-border bg-bg-secondary text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  <option value="">
                    {L4(language, {
                      ko: '모든 장르',
                      en: 'All genres',
                      ja: 'すべてのジャンル',
                      zh: '所有类型',
                    })}
                  </option>
                  {genreOptions.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 리스트 */}
            <div className="p-1">
              {loading ? (
                <p className="text-center py-6 text-xs text-text-tertiary">
                  {L4(language, {
                    ko: '불러오는 중...',
                    en: 'Loading...',
                    ja: '読み込み中...',
                    zh: '加载中...',
                  })}
                </p>
              ) : presets.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-tertiary">
                  {L4(language, {
                    ko: '저장된 프리셋이 없습니다',
                    en: 'No presets saved',
                    ja: '保存されたプリセットはありません',
                    zh: '没有保存的预设',
                  })}
                </p>
              ) : (
                presets.map(p => (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                    onClick={() => { onApplyClick(p); setOpen(false); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onApplyClick(p);
                        setOpen(false);
                      }
                    }}
                    className="group flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text-primary truncate">{p.name}</span>
                        {p.genre && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-mono shrink-0">
                            {p.genre}
                          </span>
                        )}
                        {p.visibility !== 'private' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-mono shrink-0">
                            {p.visibility}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[10px] text-text-tertiary truncate mt-0.5">{p.description}</p>
                      )}
                      <p className="text-[9px] text-text-quaternary mt-0.5">
                        {L4(language, {
                          ko: '사용',
                          en: 'Used',
                          ja: '使用',
                          zh: '使用',
                        })}: {p.usageCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(p.id, e)}
                      aria-label={L4(language, {
                        ko: `${p.name} 삭제`,
                        en: `Delete ${p.name}`,
                        ja: `${p.name}を削除`,
                        zh: `删除 ${p.name}`,
                      })}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 min-h-[32px] min-w-[32px] rounded text-text-tertiary hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SceneSheetPresetBar;

// IDENTITY_SEAL: SceneSheetPresetBar | role=preset bar UI | inputs=props | outputs=JSX
