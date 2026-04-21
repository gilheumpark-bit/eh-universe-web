"use client";

import React, { useEffect, useState } from 'react';
import { Users, BookOpen, X, ChevronLeft } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';

// ============================================================
// WritingContextPanel — 집필 중 세계관/캐릭터 참조 슬라이드 패널
// 2026-04-21: 우측 고정 + 세계관 데이터 존재 시 기본 펼침 + localStorage 기억
// ============================================================

interface Props {
  config: StoryConfig;
  language: AppLanguage;
}

const STORAGE_KEY = 'noa_writing_context_panel_open';

function loadInitialOpen(hasWorldviewData: boolean): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    // 최초 진입 시: 세계관 데이터가 있으면 자동 펼침 (작가가 설정한 걸 바로 보도록)
    return hasWorldviewData;
  } catch {
    return hasWorldviewData;
  }
}

export function WritingContextPanel({ config, language }: Props) {
  const isKO = language === 'KO';
  const hasWorldviewData = Boolean(config.synopsis || config.corePremise || config.currentConflict || config.setting);
  const [open, setOpen] = useState(() => loadInitialOpen(hasWorldviewData));
  const [tab, setTab] = useState<'world' | 'chars'>(hasWorldviewData ? 'world' : 'chars');

  // Persist open/close state — 사용자 선택 존중
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(open)); } catch { /* private mode */ }
  }, [open]);

  return (
    <>
      {/* Toggle button — fixed on right edge (2026-04-21: 좌→우 이관) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-20 bg-bg-secondary/80 backdrop-blur-sm border border-r-0 border-border rounded-l-xl flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors group"
          title={isKO ? '참조 패널' : 'Reference Panel'}
          aria-label={isKO ? '세계관·인물 참조 패널 열기' : 'Open world and cast reference panel'}
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Slide-over panel — 우측 고정, top-10 for OSDesktop top bar clearance */}
      {open && (
        <div className="fixed right-0 top-10 bottom-0 z-30 w-72 bg-bg-primary/95 backdrop-blur-xl border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('chars')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'chars' ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />
                {isKO ? '인물' : 'Characters'}
              </button>
              <button
                onClick={() => setTab('world')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'world' ? 'bg-accent-purple/15 text-accent-purple' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                {isKO ? '세계관' : 'World'}
              </button>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {tab === 'chars' && (
              config.characters.length > 0 ? (
                config.characters.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{c.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-mono">{c.role}</span>
                    </div>
                    {c.desire && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '욕구:' : 'Desire:'}</span> {c.desire}</p>}
                    {c.conflict && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '갈등:' : 'Conflict:'}</span> {c.conflict}</p>}
                    {c.changeArc && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{isKO ? '변화:' : 'Arc:'}</span> {c.changeArc}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary text-center py-8 italic">
                  {isKO ? '등록된 캐릭터가 없습니다.' : 'No characters registered.'}
                </p>
              )
            )}

            {tab === 'world' && (
              <div className="space-y-3">
                {config.synopsis && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '시놉시스' : 'Synopsis'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.synopsis}</p>
                  </div>
                )}
                {config.corePremise && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '핵심 전제' : 'Core Premise'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.corePremise}</p>
                  </div>
                )}
                {config.currentConflict && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '현재 갈등' : 'Current Conflict'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.currentConflict}</p>
                  </div>
                )}
                {config.setting && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '배경' : 'Setting'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.setting}</p>
                  </div>
                )}
                {config.powerStructure && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '권력 구조' : 'Power Structure'}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.powerStructure}</p>
                  </div>
                )}
                {config.genre && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                    <span className="text-[9px] font-bold text-accent-amber uppercase tracking-wider">{isKO ? '장르' : 'Genre'}</span>
                    <span className="text-[11px] text-accent-amber font-mono">{config.genre}</span>
                  </div>
                )}

                {/* 2단계/3단계 세계관 — 기본 접힘 (세부 설정은 필요시 펼침) */}
                {(config.worldHistory || config.socialSystem || config.economy || config.magicTechSystem ||
                  config.factionRelations || config.survivalEnvironment || config.culture || config.religion ||
                  config.education || config.lawOrder || config.taboo || config.dailyLife ||
                  config.travelComm || config.truthVsBeliefs) && (
                  <details className="group">
                    <summary className="cursor-pointer px-3 py-2 rounded-xl bg-bg-secondary/30 border border-border/30 text-[10px] font-bold text-text-tertiary uppercase tracking-wider hover:bg-bg-secondary/50 transition-colors">
                      {isKO ? '더 많은 세계관 설정 ▾' : 'More World Details ▾'}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        { label: isKO ? '역사' : 'History', value: config.worldHistory },
                        { label: isKO ? '사회 시스템' : 'Social System', value: config.socialSystem },
                        { label: isKO ? '경제' : 'Economy', value: config.economy },
                        { label: isKO ? '마법/기술' : 'Magic/Tech', value: config.magicTechSystem },
                        { label: isKO ? '종족/세력' : 'Factions', value: config.factionRelations },
                        { label: isKO ? '생존 환경' : 'Environment', value: config.survivalEnvironment },
                        { label: isKO ? '문화' : 'Culture', value: config.culture },
                        { label: isKO ? '종교' : 'Religion', value: config.religion },
                        { label: isKO ? '교육' : 'Education', value: config.education },
                        { label: isKO ? '법과 질서' : 'Law', value: config.lawOrder },
                        { label: isKO ? '금기' : 'Taboo', value: config.taboo },
                        { label: isKO ? '평범한 하루' : 'Daily Life', value: config.dailyLife },
                        { label: isKO ? '이동/통신' : 'Travel/Comm', value: config.travelComm },
                        { label: isKO ? '진실 vs 믿음' : 'Truth vs Belief', value: config.truthVsBeliefs },
                      ].filter(item => item.value).map((item, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-bg-secondary/30 border border-border/30">
                          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{item.label}</span>
                          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {!hasWorldviewData && (
                  <p className="text-xs text-text-tertiary text-center py-8 italic leading-relaxed">
                    {isKO
                      ? '세계관 설정이 없습니다.\n세계관 탭에서 시놉시스·배경을 추가하면 여기에 자동 표시됩니다.'
                      : 'No world settings yet.\nAdd synopsis/setting in World tab to see them here.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
