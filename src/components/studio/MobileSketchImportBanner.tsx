// ============================================================
// MobileSketchImportBanner — 모바일 스케치 → 데스크톱 승격 배너
// ============================================================
// 데스크톱에서만 마운트. localStorage 'noa_mobile_sketch' 존재 시
// 상단 배너로 "불러오기 / 나중에 / 삭제" 제공.
// 불러오기 → noa_projects 에 "모바일 메모" 프로젝트로 변환 + 이관.
// ============================================================

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Smartphone, X, Download, Trash2, ArrowRight } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Lang } from '@/lib/LangContext';

// ============================================================
// PART 1 — 타입 및 상수
// ============================================================

const SKETCH_KEY = 'noa_mobile_sketch';
const PROJECTS_KEY = 'noa_projects';
const DISMISS_KEY = 'mobile_sketch_banner_dismissed';

interface WorldMemo {
  id: string;
  text: string;
  updatedAt: number;
}

interface CharacterSketch {
  id: string;
  name: string;
  role: string;
  traits: string;
  updatedAt: number;
}

interface PlotIdea {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface MobileSketchStore {
  worldMemos: WorldMemo[];
  characters: CharacterSketch[];
  plots: PlotIdea[];
}

interface SketchSummary {
  worldCount: number;
  characterCount: number;
  plotCount: number;
  total: number;
  lastUpdated: number | null;
}

// ============================================================
// PART 2 — 로컬 저장소 유틸리티
// ============================================================

function readSketch(): MobileSketchStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SKETCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MobileSketchStore>;
    const world = Array.isArray(parsed.worldMemos) ? parsed.worldMemos : [];
    const chars = Array.isArray(parsed.characters) ? parsed.characters : [];
    const plots = Array.isArray(parsed.plots) ? parsed.plots : [];
    if (world.length === 0 && chars.length === 0 && plots.length === 0) return null;
    return { worldMemos: world, characters: chars, plots };
  } catch {
    return null;
  }
}

function summarize(store: MobileSketchStore): SketchSummary {
  const w = store.worldMemos.length;
  const c = store.characters.length;
  const p = store.plots.length;
  const lastUpdated = [
    ...store.worldMemos.map((item) => item.updatedAt),
    ...store.characters.map((item) => item.updatedAt),
    ...store.plots.map((item) => item.updatedAt),
  ].filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0] ?? null;
  return { worldCount: w, characterCount: c, plotCount: p, total: w + c + p, lastUpdated };
}

function buildReferenceText(store: MobileSketchStore, lang: Lang): { synopsis: string; reference: string } {
  const sourceNote = L4(lang, {
    ko: '모바일 스케치에서 데스크톱 프로젝트로 옮긴 원천 메모입니다. PC에서 세계관·캐릭터·플롯 양식으로 다듬어 사용하세요.',
    en: 'Source notes moved from Mobile Sketch to the desktop project. Refine them into world, character, and plot forms on desktop.',
    ja: 'モバイルスケッチからデスクトッププロジェクトへ移した原資料メモです。PCで世界観・キャラクター・プロットの形式に整えてください。',
    zh: '这是从移动速写转入桌面项目的源备忘。请在桌面端整理为世界观、角色与情节表单。',
  });
  const worldHeading = L4(lang, {
    ko: '## 모바일 세계관 메모',
    en: '## Mobile World Notes',
    ja: '## モバイル世界観メモ',
    zh: '## 移动世界观备忘',
  });
  const characterHeading = L4(lang, {
    ko: '## 모바일 캐릭터 스케치',
    en: '## Mobile Character Sketches',
    ja: '## モバイルキャラクタースケッチ',
    zh: '## 移动角色速写',
  });
  const plotHeading = L4(lang, {
    ko: '## 모바일 플롯 씨앗',
    en: '## Mobile Plot Seeds',
    ja: '## モバイルプロットの種',
    zh: '## 移动情节种子',
  });
  const worldBlock = store.worldMemos.length
    ? `${worldHeading}\n` + store.worldMemos.map(m => `- ${m.text}`).join('\n')
    : '';
  const charBlock = store.characters.length
    ? `${characterHeading}\n` + store.characters
        .map(c => `- **${c.name}**${c.role ? ` (${c.role})` : ''}${c.traits ? `: ${c.traits}` : ''}`)
        .join('\n')
    : '';
  const plotBlock = store.plots.length
    ? `${plotHeading}\n` + store.plots.map(p => `### ${p.title}\n${p.body}`).join('\n\n')
    : '';
  const reference = [sourceNote, worldBlock, charBlock, plotBlock].filter(Boolean).join('\n\n');
  const synopsis = (store.plots[0]?.body || store.worldMemos[0]?.text || '').slice(0, 400);
  return { synopsis, reference };
}

function importAsProject(store: MobileSketchStore, summary: SketchSummary, lang: Lang): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    const projects = Array.isArray(list) ? list : [];
    const { synopsis, reference } = buildReferenceText(store, lang);
    const now = Date.now();
    const id = `p_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const name = L4(lang, {
      ko: `모바일 스케치 (${summary.worldCount}/${summary.characterCount}/${summary.plotCount})`,
      en: `Mobile Sketch (${summary.worldCount}/${summary.characterCount}/${summary.plotCount})`,
      ja: `モバイルスケッチ (${summary.worldCount}/${summary.characterCount}/${summary.plotCount})`,
      zh: `移动速写 (${summary.worldCount}/${summary.characterCount}/${summary.plotCount})`,
    });
    const newProject = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      sessions: [
        {
          id: `s_${id}`,
          title: name,
          createdAt: now,
          updatedAt: now,
          config: {
            title: name,
            synopsis,
            reference,
            manuscripts: [],
          },
        },
      ],
    };
    projects.unshift(newProject);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 3 — 컴포넌트
// ============================================================

export default function MobileSketchImportBanner() {
  const { lang } = useLang();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<SketchSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const refreshSummary = useCallback(() => {
    if (!mounted || isMobile) return;
    // 세션 숨김 체크
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* ignore */ }
    const store = readSketch();
    setSummary(store ? summarize(store) : null);
  }, [mounted, isMobile]);

  useEffect(() => {
    if (!mounted || isMobile) return;
    const onSketchChange = () => refreshSummary();
    const refreshTimer = window.setTimeout(onSketchChange, 0);
    window.addEventListener('storage', onSketchChange);
    window.addEventListener('noa:mobile-sketch-updated', onSketchChange);
    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener('storage', onSketchChange);
      window.removeEventListener('noa:mobile-sketch-updated', onSketchChange);
    };
  }, [mounted, isMobile, refreshSummary]);

  const handleImport = useCallback(() => {
    const store = readSketch();
    if (!store) { setSummary(null); return; }
    const s = summarize(store);
    const ok = importAsProject(store, s, lang);
    if (ok) {
      try { localStorage.removeItem(SKETCH_KEY); } catch { /* ignore */ }
      setSummary(null);
      setToast(L4(lang, {
        ko: '모바일 스케치를 새 프로젝트로 가져왔습니다',
        en: 'Mobile sketch imported as a new project',
        ja: 'モバイルスケッチを新規プロジェクトに取り込みました',
        zh: '已将移动速写导入为新项目',
      }));
      setTimeout(() => setToast(null), 3200);
      // 프로젝트 목록 리로드 유도
      try {
        window.dispatchEvent(new CustomEvent('noa:projects-updated'));
      } catch { /* ignore */ }
    } else {
      setToast(L4(lang, {
        ko: '불러오기에 실패했습니다',
        en: 'Import failed',
        ja: '取り込みに失敗しました',
        zh: '导入失败',
      }));
      setTimeout(() => setToast(null), 3200);
    }
  }, [lang]);

  const handleLater = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setSummary(null);
  }, []);

  const handleDelete = useCallback(() => {
    const msg = L4(lang, {
      ko: '모바일 메모를 삭제할까요? 복구할 수 없습니다.',
      en: 'Delete mobile memos? This cannot be undone.',
      ja: 'モバイルメモを削除しますか？復元できません。',
      zh: '删除移动备忘吗？无法恢复。',
    });
    if (typeof window === 'undefined' || !window.confirm(msg)) return;
    try { localStorage.removeItem(SKETCH_KEY); } catch { /* ignore */ }
    setSummary(null);
    setToast(L4(lang, {
      ko: '모바일 메모를 삭제했습니다',
      en: 'Mobile memos deleted',
      ja: 'モバイルメモを削除しました',
      zh: '已删除移动备忘',
    }));
    setTimeout(() => setToast(null), 2400);
  }, [lang]);

  // 모바일에서는 렌더하지 않음
  if (!mounted || isMobile) return null;
  if (!summary && !toast) return null;

  return (
    <>
      {summary && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] w-[min(640px,calc(100vw-2rem))] flex flex-col gap-3 px-4 py-3 bg-bg-elevated border border-border rounded-xl shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-accent-purple shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary">
                {L4(lang, {
                  ko: `PC 가공 대기 중인 모바일 스케치 ${summary.total}건`,
                  en: `${summary.total} mobile sketch item${summary.total === 1 ? '' : 's'} waiting for desktop refinement`,
                  ja: `PCで整理待ちのモバイルスケッチ ${summary.total} 件`,
                  zh: `${summary.total} 条移动速写等待桌面整理`,
                })}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {L4(lang, {
                  ko: `세계관 ${summary.worldCount} · 캐릭터 ${summary.characterCount} · 플롯 ${summary.plotCount}`,
                  en: `World ${summary.worldCount} · Characters ${summary.characterCount} · Plots ${summary.plotCount}`,
                  ja: `世界観 ${summary.worldCount} · キャラ ${summary.characterCount} · プロット ${summary.plotCount}`,
                  zh: `世界观 ${summary.worldCount} · 角色 ${summary.characterCount} · 情节 ${summary.plotCount}`,
                })}
              </p>
              <p className="text-[11px] text-text-quaternary mt-1">
                {L4(lang, {
                  ko: '새 프로젝트로 가져온 뒤 세계관·캐릭터·플롯 양식에 맞게 다듬을 수 있습니다.',
                  en: 'Import it as a new project, then refine it into world, character, and plot forms.',
                  ja: '新規プロジェクトに取り込み、世界観・キャラクター・プロット形式に整えられます。',
                  zh: '可导入为新项目，再整理为世界观、角色与情节表单。',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLater}
              aria-label={L4(lang, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
              className="shrink-0 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-tertiary hover:text-text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 min-h-[44px] px-3 bg-accent-purple text-white text-xs font-bold rounded-lg hover:bg-accent-purple/90 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {L4(lang, { ko: '새 프로젝트로 가져오기', en: 'Import as new project', ja: '新規プロジェクトに取り込み', zh: '导入为新项目' })}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleLater}
              className="py-2 min-h-[44px] px-3 bg-bg-secondary text-text-secondary text-xs font-medium rounded-lg border border-border hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
            >
              {L4(lang, { ko: '나중에', en: 'Later', ja: '後で', zh: '稍后' })}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label={L4(lang, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
              className="py-2 min-h-[44px] min-w-[44px] px-3 text-accent-red text-xs font-medium rounded-lg border border-border hover:bg-accent-red/10 focus-visible:ring-2 focus-visible:ring-accent-red transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {toast && !summary && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] px-4 py-2 bg-bg-elevated border border-border rounded-xl shadow-lg text-xs text-text-primary"
        >
          {toast}
        </div>
      )}
    </>
  );
}

export { MobileSketchImportBanner };

// IDENTITY_SEAL: MobileSketchImportBanner | role=sketch-promotion-banner | inputs=localStorage(noa_mobile_sketch) | outputs=UI(import-banner) + side-effects(noa_projects)
