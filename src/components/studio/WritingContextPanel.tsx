"use client";

import React, { useEffect, useState } from 'react';
import { Users, BookOpen, X, ChevronLeft } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

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
          title={L4(language, { ko: '참조 패널', en: 'Reference Panel', ja: '参照パネル', zh: '参考面板' })}
          aria-label={L4(language, { ko: '세계관·인물 참조 패널 열기', en: 'Open world and cast reference panel', ja: '世界観・人物参照パネルを開く', zh: '打开世界观和角色参考面板' })}
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
                {L4(language, { ko: '인물', en: 'Characters', ja: '人物', zh: '角色' })}
              </button>
              <button
                onClick={() => setTab('world')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'world' ? 'bg-accent-purple/15 text-accent-purple' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                {L4(language, { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' })}
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
                    {c.desire && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{L4(language, { ko: '욕구:', en: 'Desire:', ja: '欲求:', zh: '欲望:' })}</span> {c.desire}</p>}
                    {c.conflict && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{L4(language, { ko: '갈등:', en: 'Conflict:', ja: '葛藤:', zh: '冲突:' })}</span> {c.conflict}</p>}
                    {c.changeArc && <p className="text-[11px] text-text-secondary"><span className="text-text-tertiary">{L4(language, { ko: '변화:', en: 'Arc:', ja: '変化:', zh: '变化:' })}</span> {c.changeArc}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary text-center py-8 italic">
                  {L4(language, { ko: '등록된 캐릭터가 없습니다.', en: 'No characters registered.', ja: '登録されたキャラクターがありません。', zh: '暂无已登记角色。' })}
                </p>
              )
            )}

            {tab === 'world' && (
              <div className="space-y-3">
                {config.synopsis && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(language, { ko: '시놉시스', en: 'Synopsis', ja: 'シノプシス', zh: '剧情梗概' })}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.synopsis}</p>
                  </div>
                )}
                {config.corePremise && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(language, { ko: '핵심 전제', en: 'Core Premise', ja: '核心前提', zh: '核心前提' })}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.corePremise}</p>
                  </div>
                )}
                {config.currentConflict && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(language, { ko: '현재 갈등', en: 'Current Conflict', ja: '現在の葛藤', zh: '当前冲突' })}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.currentConflict}</p>
                  </div>
                )}
                {config.setting && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(language, { ko: '배경', en: 'Setting', ja: '背景', zh: '背景' })}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.setting}</p>
                  </div>
                )}
                {config.powerStructure && (
                  <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(language, { ko: '권력 구조', en: 'Power Structure', ja: '権力構造', zh: '权力结构' })}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{config.powerStructure}</p>
                  </div>
                )}
                {config.genre && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                    <span className="text-[9px] font-bold text-accent-amber uppercase tracking-wider">{L4(language, { ko: '장르', en: 'Genre', ja: 'ジャンル', zh: '类型' })}</span>
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
                      {L4(language, { ko: '더 많은 세계관 설정 ▾', en: 'More World Details ▾', ja: 'さらに世界観設定 ▾', zh: '更多世界观设定 ▾' })}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        { label: L4(language, { ko: '역사', en: 'History', ja: '歴史', zh: '历史' }), value: config.worldHistory },
                        { label: L4(language, { ko: '사회 시스템', en: 'Social System', ja: '社会システム', zh: '社会系统' }), value: config.socialSystem },
                        { label: L4(language, { ko: '경제', en: 'Economy', ja: '経済', zh: '经济' }), value: config.economy },
                        { label: L4(language, { ko: '마법/기술', en: 'Magic/Tech', ja: '魔法/技術', zh: '魔法/技术' }), value: config.magicTechSystem },
                        { label: L4(language, { ko: '종족/세력', en: 'Factions', ja: '種族/勢力', zh: '种族/势力' }), value: config.factionRelations },
                        { label: L4(language, { ko: '생존 환경', en: 'Environment', ja: '生存環境', zh: '生存环境' }), value: config.survivalEnvironment },
                        { label: L4(language, { ko: '문화', en: 'Culture', ja: '文化', zh: '文化' }), value: config.culture },
                        { label: L4(language, { ko: '종교', en: 'Religion', ja: '宗教', zh: '宗教' }), value: config.religion },
                        { label: L4(language, { ko: '교육', en: 'Education', ja: '教育', zh: '教育' }), value: config.education },
                        { label: L4(language, { ko: '법과 질서', en: 'Law', ja: '法と秩序', zh: '法律与秩序' }), value: config.lawOrder },
                        { label: L4(language, { ko: '금기', en: 'Taboo', ja: '禁忌', zh: '禁忌' }), value: config.taboo },
                        { label: L4(language, { ko: '평범한 하루', en: 'Daily Life', ja: '日常', zh: '日常生活' }), value: config.dailyLife },
                        { label: L4(language, { ko: '이동/통신', en: 'Travel/Comm', ja: '移動/通信', zh: '移动/通讯' }), value: config.travelComm },
                        { label: L4(language, { ko: '진실 vs 믿음', en: 'Truth vs Belief', ja: '真実 vs 信念', zh: '真相 vs 信仰' }), value: config.truthVsBeliefs },
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
                  <p className="text-xs text-text-tertiary text-center py-8 italic leading-relaxed whitespace-pre-line">
                    {L4(language, {
                      ko: '세계관 설정이 없습니다.\n세계관 탭에서 시놉시스·배경을 추가하면 여기에 자동 표시됩니다.',
                      en: 'No world settings yet.\nAdd synopsis/setting in World tab to see them here.',
                      ja: '世界観設定がありません。\n世界観タブでシノプシス・背景を追加すると、ここに自動表示されます。',
                      zh: '暂无世界观设定。\n在世界观标签页添加剧情梗概/背景后会自动显示。',
                    })}
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
