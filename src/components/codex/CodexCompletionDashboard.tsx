"use client";

/**
 * CodexCompletionDashboard — Codex 객체 채움 추적 + 작업노트 통합 (rank 18)
 *
 * 작가가 현재 작업 중인 프로젝트의 Codex 객체 (Characters / Items / Skills /
 * Magic Systems / World fields / Manuscripts) 채움도와 작업노트(work-note)
 * 단계별 집계를 한 사이드바에 표시한다.
 *
 * 데이터 출처:
 *   - localStorage 'noa-studio-projects' (Project[]) — useStudioSync 와 동일 키
 *   - localStorage `noa-work-notes-{projectId}` (WorkNote[]) — 옵션 (없으면 빈)
 *
 * 활성 프로젝트 선택:
 *   - lastUpdate 가장 큰 프로젝트 → 그 안에서 lastUpdate 가장 큰 session
 *
 * 모듈 마운트:
 *   - creative/work-note: buildDashboard / summarizeNotes 사용
 *
 * [C] 안전성: localStorage 미가용/JSON 파싱 실패/배열 아님 모두 안전 fallback (empty state)
 * [G] 성능: useMemo 로 한 번만 계산, storage 이벤트 + 30초 자동 갱신
 * [K] 간결성: PART 4분할, 외부 의존 0 (Header/L4 만 사용)
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLang } from '@/lib/LangContext';
import { L4 } from '@/lib/i18n';
import type { Project, StoryConfig } from '@/lib/studio-types';
import { buildDashboard, summarizeNotes, type WorkNote } from '@/lib/creative/work-note';

// ============================================================
// PART 1 — 타입 + 상수
// ============================================================

interface CategoryRow {
  id: string;
  label: { ko: string; en: string; ja: string; zh: string };
  filled: number;
  /** 0 이면 비율 미표시 (분모 정의 불가) — 카운트만 노출 */
  target: number;
  /** percent for bar; if target=0 then min(filled,100) 로 캡 */
  percent: number;
}

const PROJECTS_KEY = 'noa-studio-projects';

/** 활성 세션의 worldfield 풀 목록 — % 계산 분모.
 *  studio-types StoryConfig 의 1·2·3단계 세계관 필드 (총 15개).
 */
const WORLD_FIELDS = [
  'corePremise', 'powerStructure', 'currentConflict',
  'worldHistory', 'socialSystem', 'economy', 'magicTechSystem',
  'factionRelations', 'survivalEnvironment',
  'culture', 'religion', 'education', 'lawOrder', 'taboo',
  'dailyLife', 'travelComm', 'truthVsBeliefs',
] as const;

// ============================================================
// PART 2 — 내부 유틸 (storage 안전 read)
// ============================================================

function safeReadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    return [];
  }
}

function safeReadWorkNotes(projectId: string): WorkNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`noa-work-notes-${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkNote[]) : [];
  } catch {
    return [];
  }
}

function pickActiveProject(projects: Project[]): Project | null {
  if (!projects.length) return null;
  let best = projects[0];
  for (const p of projects) {
    if (!p) continue;
    if ((p.lastUpdate ?? 0) > (best.lastUpdate ?? 0)) best = p;
  }
  return best ?? null;
}

function pickActiveConfig(project: Project | null): StoryConfig | null {
  if (!project) return null;
  const sessions = Array.isArray(project.sessions) ? project.sessions : [];
  if (!sessions.length) return null;
  let best = sessions[0];
  for (const s of sessions) {
    if (!s) continue;
    if ((s.lastUpdate ?? 0) > (best.lastUpdate ?? 0)) best = s;
  }
  return best?.config ?? null;
}

/** 비어있지 않은 문자열 필드 개수 */
function countFilledFields<T>(obj: T | null | undefined, keys: readonly (keyof T & string)[]): number {
  if (!obj) return 0;
  let n = 0;
  for (const k of keys) {
    const v = (obj as unknown as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim().length > 0) n += 1;
  }
  return n;
}

function safeArrayLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

// ============================================================
// PART 3 — 본 컴포넌트
// ============================================================

interface Props {
  /** 카테고리별 권장 목표치 (target). 0 이면 % 미적용. */
  targets?: Partial<Record<'characters' | 'items' | 'skills' | 'magic' | 'manuscripts', number>>;
  className?: string;
}

const DEFAULT_TARGETS = {
  characters: 6,
  items: 5,
  skills: 5,
  magic: 2,
  manuscripts: 10,
} as const;

export default function CodexCompletionDashboard({
  targets,
  className = '',
}: Props) {
  const { lang } = useLang();
  const T = useCallback(
    (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v),
    [lang],
  );

  // ── localStorage snapshot (state + 갱신) ────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [workNotes, setWorkNotes] = useState<WorkNote[]>([]);

  const reload = useCallback(() => {
    const next = safeReadProjects();
    setProjects(next);
    const active = pickActiveProject(next);
    setWorkNotes(active ? safeReadWorkNotes(active.id) : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 하이드레이션 + storage 구독(reload 가 set)
    reload();
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key) {
        reload();
        return;
      }
      if (e.key === PROJECTS_KEY || e.key.startsWith('noa-work-notes-')) reload();
    };
    const onCustom = () => reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('noa:projects-updated', onCustom);
    // 30s 백업 폴 — 동일 탭 내 다른 마운트가 storage 이벤트를 못 발화시켰을 때 보강
    const timer = window.setInterval(reload, 30_000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('noa:projects-updated', onCustom);
      window.clearInterval(timer);
    };
  }, [reload]);

  // ── 집계 ─────────────────────────────────────────────────
  const { activeName, rows, worldPct, noteSummary, noteTotal, lastPhaseLabel } = useMemo(() => {
    const active = pickActiveProject(projects);
    const cfg = pickActiveConfig(active);
    const tg = { ...DEFAULT_TARGETS, ...(targets ?? {}) };

    const charCount = safeArrayLen(cfg?.characters);
    const itemCount = safeArrayLen(cfg?.items);
    const skillCount = safeArrayLen(cfg?.skills);
    const magicCount = safeArrayLen(cfg?.magicSystems);
    const manuscriptCount = safeArrayLen(cfg?.manuscripts);

    const worldFilled = countFilledFields(cfg, WORLD_FIELDS);
    const worldTotal: number = WORLD_FIELDS.length;
    const wPct = worldTotal <= 0 ? 0 : Math.round((worldFilled / worldTotal) * 100);

    const pct = (filled: number, target: number) => {
      if (target <= 0) return Math.min(filled, 100);
      return Math.min(100, Math.round((filled / target) * 100));
    };

    const list: CategoryRow[] = [
      {
        id: 'characters',
        label: { ko: '캐릭터', en: 'Characters', ja: 'キャラクター', zh: '角色' },
        filled: charCount, target: tg.characters,
        percent: pct(charCount, tg.characters),
      },
      {
        id: 'items',
        label: { ko: '아이템', en: 'Items', ja: 'アイテム', zh: '物品' },
        filled: itemCount, target: tg.items,
        percent: pct(itemCount, tg.items),
      },
      {
        id: 'skills',
        label: { ko: '스킬', en: 'Skills', ja: 'スキル', zh: '技能' },
        filled: skillCount, target: tg.skills,
        percent: pct(skillCount, tg.skills),
      },
      {
        id: 'magic',
        label: { ko: '마법 체계', en: 'Magic Systems', ja: '魔法体系', zh: '魔法体系' },
        filled: magicCount, target: tg.magic,
        percent: pct(magicCount, tg.magic),
      },
      {
        id: 'world',
        label: { ko: '세계관 필드', en: 'World Fields', ja: '世界観フィールド', zh: '世界观字段' },
        filled: worldFilled, target: worldTotal,
        percent: wPct,
      },
      {
        id: 'manuscripts',
        label: { ko: '원고', en: 'Manuscripts', ja: '原稿', zh: '稿件' },
        filled: manuscriptCount, target: tg.manuscripts,
        percent: pct(manuscriptCount, tg.manuscripts),
      },
    ];

    const dash = buildDashboard(workNotes);
    const summary = summarizeNotes(workNotes);
    const phaseLabelMap: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
      plan: { ko: '기획', en: 'Plan', ja: '企画', zh: '企划' },
      draft: { ko: '초고', en: 'Draft', ja: '初稿', zh: '初稿' },
      revise: { ko: '퇴고', en: 'Revise', ja: '推敲', zh: '修订' },
      publish: { ko: '발행', en: 'Publish', ja: '発行', zh: '发布' },
    };
    const lastPhase = dash.lastPhase ? T(phaseLabelMap[dash.lastPhase]) : '—';

    return {
      activeName: active?.name ?? null,
      rows: list,
      worldPct: wPct,
      noteSummary: summary,
      noteTotal: dash.totalNotes,
      lastPhaseLabel: lastPhase,
    };
  }, [projects, workNotes, targets, T]);

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <aside
      className={`border border-border bg-bg-secondary p-4 text-xs font-mono ${className}`}
      aria-label={T({ ko: 'Codex 진척률 대시보드', en: 'Codex Completion Dashboard', ja: 'Codex 進捗ダッシュボード', zh: 'Codex 进度仪表板' })}
    >
      {/* Title */}
      <header className="mb-3 pb-2 border-b border-border/60">
        <h2 className="text-text-primary text-[10px] font-bold tracking-widest uppercase">
          {T({ ko: 'CODEX 진척률', en: 'CODEX COMPLETION', ja: 'CODEX 進捗', zh: 'CODEX 进度' })}
        </h2>
        <p className="text-text-tertiary text-[10px] mt-1 truncate">
          {activeName
            ? activeName
            : T({ ko: '활성 프로젝트 없음', en: 'No active project', ja: 'アクティブなプロジェクトなし', zh: '无活动项目' })}
        </p>
      </header>

      {/* Category rows */}
      <ul className="space-y-2.5 mb-4" role="list">
        {rows.map((r) => {
          const ratioText = r.target > 0 ? `${r.filled}/${r.target}` : `${r.filled}`;
          const isWorld = r.id === 'world';
          const rightText = isWorld ? `${r.percent}% defined` : ratioText;
          return (
            <li key={r.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-secondary text-[10px] tracking-wider uppercase">
                  {T(r.label)}
                </span>
                <span className="text-text-primary text-[10px] tabular-nums">{rightText}</span>
              </div>
              <div
                className="h-1 bg-bg-primary border border-border/40 overflow-hidden"
                role="progressbar"
                aria-valuenow={r.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${T(r.label)} ${r.percent}%`}
              >
                <div
                  className="h-full bg-accent-purple transition-[width] duration-300"
                  style={{ width: `${r.percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Work notes */}
      <section
        aria-label={T({ ko: '작업노트', en: 'Work Notes', ja: '作業ノート', zh: '工作笔记' })}
        className="pt-3 border-t border-border/60"
      >
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-text-primary text-[10px] font-bold tracking-widest uppercase">
            {T({ ko: '작업노트', en: 'WORK NOTES', ja: '作業ノート', zh: '工作笔记' })}
          </h3>
          <span className="text-text-tertiary text-[10px] tabular-nums">{noteTotal}</span>
        </div>
        <p className="text-text-secondary text-[10px] leading-relaxed">{noteSummary}</p>
        <p className="text-text-tertiary text-[10px] mt-1">
          {T({ ko: '최근 단계', en: 'Last phase', ja: '最近の段階', zh: '最近阶段' })}: {lastPhaseLabel}
        </p>
      </section>

      {/* Footer hint */}
      <footer className="mt-3 pt-2 border-t border-border/40 text-[9px] text-text-tertiary">
        {worldPct >= 80
          ? T({ ko: '세계관 충실. 다음: 캐릭터 확장', en: 'World solid. Next: expand characters', ja: '世界観充実。次: キャラ拡張', zh: '世界观扎实。下一步：扩展角色' })
          : T({ ko: '세계관 필드 보강 권장', en: 'Recommend filling world fields', ja: '世界観フィールドの補強推奨', zh: '建议补充世界观字段' })}
      </footer>
    </aside>
  );
}
