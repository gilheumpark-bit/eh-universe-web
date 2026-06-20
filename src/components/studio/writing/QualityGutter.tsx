"use client";

// ============================================================
// QualityGutter — rank 6 (Batch 3 / Module Integration)
// WritingTab 좌측 거터: 실시간 4관점 QA 점수 + 5도메인 체크리스트 완성도.
//
// 마운트 모듈:
//   - creative:qa-auditor       — auditManuscript / auditVerdict (4관점 결함)
//   - creative:quality-checklist — checklistCompleteness (도메인 완성도)
//
// 데이터 소스:
//   - useWriting().editDraft (Edit 모드 본문)
//   - useWriting().currentSession (config + messages — checklist 평가)
//
// 성능:
//   - 본문 변경 → 300ms debounce → auditManuscript 호출 (CPU-only, fetch 0)
//   - 마지막 결과 useRef 캐싱하여 동일 input 재계산 회피
//
// UI:
//   - 4관점 점수 0~3 (낮을수록 좋음) 작은 라벨 + 색상 신호
//   - 점수 라벨 클릭 → details 패널 (관점별 결함 list)
//   - 5도메인 체크리스트 완성도 % 표시
//
// [C] 30,000자+ 본문 입력 시 audit 호출 자체는 O(n) 휴리스틱이지만 매 키입력
//     마다 호출되면 렌더에 부담. debounce 로 차단.
// [G] checklistCompleteness 는 config 변화 시점만 재계산 useMemo.
// [K] qa-auditor / quality-checklist 외 외부 의존 0.
// ============================================================

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWritingSafe } from '@/app/studio/WritingContext';
import {
  auditManuscript,
  auditVerdict,
  type AuditFinding,
  type AuditPerspective,
  type AuditVerdict,
} from '@/lib/creative/qa-auditor';
import {
  checklistCompleteness,
  type Domain,
} from '@/lib/creative/quality-checklist';
import { L4 } from '@/lib/i18n';
// [풀점검 priority 6 — 2026-06-08] 절대금지 studio-types.ts 직접 import 제거.
// src/types/studio-shared.ts shim 을 경유.
import type { AppLanguage, StoryConfig } from '@/types/studio-shared';

// ============================================================
// PART 1 — 타입 · 상수 · i18n 라벨
// ============================================================

interface QualityGutterProps {
  /** 외부에서 직접 본문을 넘길 수도 있게 (테스트/스토리북 용). 기본은 WritingContext. */
  manuscript?: string;
  /** debounce ms. 기본 300ms. */
  debounceMs?: number;
  language?: AppLanguage;
}

const PERSPECTIVE_LABEL: Record<AuditPerspective, { ko: string; en: string; ja: string; zh: string }> = {
  consistency: { ko: '정합', en: 'Logic', ja: '整合', zh: '逻辑' },
  outsider: { ko: '독자', en: 'Reader', ja: '読者', zh: '读者' },
  refuter: { ko: '반증', en: 'Refute', ja: '反証', zh: '反证' },
  structure: { ko: '구조', en: 'Struct', ja: '構造', zh: '结构' },
};

const DOMAIN_LABEL: Record<Domain, { ko: string; en: string; ja: string; zh: string }> = {
  world: { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' },
  character: { ko: '캐릭터', en: 'Cast', ja: '人物', zh: '角色' },
  scene: { ko: '씬', en: 'Scene', ja: 'シーン', zh: '场景' },
  direction: { ko: '연출', en: 'Direct', ja: '演出', zh: '演出' },
  writing: { ko: '집필', en: 'Write', ja: '執筆', zh: '执笔' },
};

const DOMAINS: readonly Domain[] = ['world', 'character', 'scene', 'direction', 'writing'];

// ============================================================
// PART 2 — config → checklist 충족 id 추출 (휴리스틱)
// 작가가 채운 데이터(synopsis, premise, characters 등)로부터
// 체크리스트 id 를 어떤 항목이 충족되는지 추론한다. 100% 정확할 필요는 없고
// "있으면 +1" 정도의 진척도 표시용.
// ============================================================

function presentIdsFromConfig(config: StoryConfig | undefined): Record<Domain, string[]> {
  const empty: Record<Domain, string[]> = { world: [], character: [], scene: [], direction: [], writing: [] };
  if (!config) return empty;

  const result: Record<Domain, string[]> = { world: [], character: [], scene: [], direction: [], writing: [] };

  // world
  if (config.synopsis && config.synopsis.length > 10) result.world.push('world-premise');
  if (config.setting && config.setting.length > 0) result.world.push('world-rules');
  if (config.genre && config.genre.length > 0) result.world.push('world-tone');

  // character
  const characters = config.characters ?? [];
  if (characters.length > 0) result.character.push('char-goal');
  if (characters.some(c => c.role && c.role.length > 0)) result.character.push('char-arc');
  if (characters.some(c => c.personality && c.personality.length > 0)) result.character.push('char-flaw');
  if (characters.some(c => c.role && c.role.length > 0)) result.character.push('char-relations');

  // scene
  const sheets = config.episodeSceneSheets ?? [];
  if (sheets.length > 0) {
    const sheet = sheets[0];
    if (sheet.scenes && sheet.scenes.length > 0) {
      result.scene.push('scene-goal', 'scene-conflict', 'scene-setting');
    }
  }

  // direction (작품 연출 — 모호. 본문이 있으면 페이싱 정의된 것으로 간주)
  if (config.totalEpisodes && config.totalEpisodes > 0) result.direction.push('dir-pacing');

  // writing — config.cliffhanger / config.episode 진행만 봐도 추론 가능
  if (config.episode && config.episode > 0) result.writing.push('write-pov', 'write-cliffhanger');

  return result;
}

// ============================================================
// PART 3 — 색상 / Severity helpers
// ============================================================

function colorForCount(count: number): string {
  if (count === 0) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (count <= 2) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
}

function colorForCompleteness(pct: number): string {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

function localize(language: AppLanguage, dict: { ko: string; en: string; ja: string; zh: string }): string {
  return L4(language, dict);
}

// ============================================================
// PART 4 — 메인 컴포넌트
// ============================================================

export function QualityGutter({
  manuscript,
  debounceMs = 300,
  language: langProp,
}: QualityGutterProps): React.ReactElement | null {
  const writing = useWritingSafe();
  // [C] Provider 외부에서 manuscript prop 없이 호출되면 안전하게 null 반환.
  const language: AppLanguage = langProp ?? writing?.language ?? 'KO';
  const text = manuscript ?? writing?.editDraft ?? '';
  const config = writing?.currentSession?.config;

  // ── 4관점 감사 결과 (debounced) ──
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const lastTextRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 동일 input 재계산 회피.
    if (text === lastTextRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastTextRef.current = text;
      try {
        setFindings(auditManuscript(text));
      } catch {
        // [C] 휴리스틱 오류 시 결과 비움 — UI 안정성 우선.
        setFindings([]);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs]);

  const verdict: AuditVerdict = useMemo(() => auditVerdict(findings), [findings]);

  // ── 5도메인 체크리스트 완성도 ──
  const completeness = useMemo(() => {
    const present = presentIdsFromConfig(config);
    const out: Record<Domain, number> = { world: 0, character: 0, scene: 0, direction: 0, writing: 0 };
    for (const d of DOMAINS) {
      out[d] = checklistCompleteness(d, present[d]);
    }
    return out;
  }, [config]);

  // ── 디테일 패널 토글 ──
  const [openPerspective, setOpenPerspective] = useState<AuditPerspective | null>(null);
  const [domainsOpen, setDomainsOpen] = useState<boolean>(false);

  const togglePerspective = useCallback((p: AuditPerspective) => {
    setOpenPerspective(prev => (prev === p ? null : p));
  }, []);

  // 빈 본문 + config 없음 → 렌더 안 함 (UI 노이즈 차단).
  if (!text && !config) return null;

  // [C] Provider 없이 manuscript 없으면 거터 자체를 렌더할 이유 없음.
  if (!writing && !manuscript) return null;

  return (
    <aside
      role="complementary"
      aria-label={localize(language, {
        ko: '품질 거터',
        en: 'Quality Gutter',
        ja: '品質ガター',
        zh: '质量边栏',
      })}
      data-testid="quality-gutter"
      className="flex flex-col gap-3 px-2 py-3 w-[88px] shrink-0 border-r border-border/40 bg-bg-secondary/30"
    >
      {/* ── 4관점 점수 ── */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary px-1">
          {localize(language, { ko: 'QA 4관점', en: 'QA 4-View', ja: 'QA 4視点', zh: 'QA 4视角' })}
        </div>
        {(Object.keys(verdict.byPerspective) as AuditPerspective[]).map((p) => {
          const count = verdict.byPerspective[p];
          const open = openPerspective === p;
          const list = findings.filter(f => f.perspective === p);
          return (
            <div key={p} className="space-y-1">
              <button
                type="button"
                onClick={() => togglePerspective(p)}
                aria-expanded={open}
                aria-label={`${localize(language, PERSPECTIVE_LABEL[p])} ${count}`}
                className={`w-full flex items-center justify-between px-2 py-1 rounded border text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${colorForCount(count)}`}
              >
                <span className="truncate">{localize(language, PERSPECTIVE_LABEL[p])}</span>
                <span className="font-mono ml-1">{count}</span>
              </button>
              {open && list.length > 0 && (
                <ul
                  role="list"
                  data-testid={`quality-gutter-detail-${p}`}
                  className="text-[10px] leading-relaxed text-text-secondary bg-bg-primary border border-border/40 rounded px-1.5 py-1 space-y-1"
                >
                  {list.slice(0, 4).map((f, i) => (
                    <li key={i} className="break-words">
                      <span
                        className={
                          f.severity === 'high'
                            ? 'text-rose-400'
                            : f.severity === 'mid'
                              ? 'text-amber-400'
                              : 'text-text-tertiary'
                        }
                      >
                        ●
                      </span>{' '}
                      {f.issue}
                    </li>
                  ))}
                  {list.length > 4 && (
                    <li className="text-text-tertiary italic">+{list.length - 4}</li>
                  )}
                </ul>
              )}
              {open && list.length === 0 && (
                <div className="text-[9px] text-text-tertiary px-1.5 py-1 italic">
                  {localize(language, { ko: '결함 없음', en: 'Clean', ja: '欠陥なし', zh: '无缺陷' })}
                </div>
              )}
            </div>
          );
        })}
        <div className={`text-[9px] px-1 font-mono ${verdict.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
          {verdict.passed
            ? localize(language, { ko: '✓ 통과', en: '✓ Pass', ja: '✓ 合格', zh: '✓ 通过' })
            : localize(language, { ko: '✗ 보류', en: '✗ Hold', ja: '✗ 保留', zh: '✗ 暂缓' })}
        </div>
      </div>

      {/* ── 5도메인 체크리스트 ── */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setDomainsOpen(o => !o)}
          aria-expanded={domainsOpen}
          className="w-full flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-text-tertiary px-1 hover:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue rounded"
        >
          <span>{localize(language, { ko: '체크리스트', en: 'Checklist', ja: 'チェック', zh: '清单' })}</span>
          {domainsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {domainsOpen && (
          <ul className="space-y-1" data-testid="quality-gutter-domains">
            {DOMAINS.map((d) => {
              const pct = completeness[d];
              return (
                <li key={d} className="flex items-center justify-between text-[10px] px-1">
                  <span className="text-text-secondary">{localize(language, DOMAIN_LABEL[d])}</span>
                  <span className={`font-mono font-bold ${colorForCompleteness(pct)}`}>{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default QualityGutter;
