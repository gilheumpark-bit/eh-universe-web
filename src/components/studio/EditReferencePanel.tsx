'use client';

// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================

import React, { useState, useEffect } from 'react';
import { FileText, Users, StickyNote, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StoryConfig, EpisodeManuscript, AppLanguage } from '@/lib/studio-types';

type RefTab = 'manuscript' | 'config' | 'memo';

interface EditReferencePanelProps {
  config: StoryConfig;
  manuscripts: EpisodeManuscript[];
  language: AppLanguage;
  isOpen: boolean;
  onToggle: () => void;
}

// IDENTITY_SEAL: PART-0 | role=types | inputs=none | outputs=EditReferencePanelProps

// ============================================================
// PART 1 — COMPONENT
// ============================================================

const EditReferencePanel: React.FC<EditReferencePanelProps> = ({
  config, manuscripts, language, isOpen, onToggle,
}) => {
  const isKO = language === 'KO';
  const [activeRefTab, setActiveRefTab] = useState<RefTab>('config');
  const [memo, setMemo] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('noa_edit_memo') || '';
    return '';
  });
  const [expandedEp, setExpandedEp] = useState<number | null>(null);

  // Memo persistence
  useEffect(() => {
    if (memo) localStorage.setItem('noa_edit_memo', memo);
    else localStorage.removeItem('noa_edit_memo');
  }, [memo]);

  const tabs: { key: RefTab; label: string; icon: React.ElementType }[] = [
    { key: 'manuscript', label: isKO ? '원고' : 'MS', icon: FileText },
    { key: 'config', label: isKO ? '설정' : 'Config', icon: Users },
    { key: 'memo', label: isKO ? '메모' : 'Memo', icon: StickyNote },
  ];

  return (
    <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${isOpen ? 'w-72' : 'w-8'}`}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-[family-name:var(--font-mono)] flex items-center justify-center gap-1"
      >
        {isOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        {isOpen && (isKO ? '참조' : 'Ref')}
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveRefTab(key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors ${
                  activeRefTab === key
                    ? 'text-accent-purple border-b-2 border-accent-purple'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-3 space-y-2">
            {/* ── 원고 탭 ── */}
            {activeRefTab === 'manuscript' && (
              manuscripts.length === 0 ? (
                <p className="text-[11px] text-text-tertiary italic text-center py-8">
                  {isKO ? '저장된 원고가 없습니다.\n집필 후 "원고에 반영"을 눌러주세요.' : 'No manuscripts yet.\nWrite and click "Apply to Manuscript".'}
                </p>
              ) : (
                <div className="space-y-1">
                  {manuscripts
                    .sort((a, b) => b.episode - a.episode)
                    .map(ms => (
                      <div key={ms.episode} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedEp(expandedEp === ms.episode ? null : ms.episode)}
                          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold hover:bg-bg-secondary/50 transition-colors"
                        >
                          <span className="text-text-primary">EP.{ms.episode} {ms.title}</span>
                          <span className="text-text-tertiary">{ms.charCount.toLocaleString()}{isKO ? '자' : 'c'}</span>
                        </button>
                        {expandedEp === ms.episode && (
                          <div className="px-3 py-2 border-t border-border bg-bg-secondary/30 max-h-48 overflow-y-auto">
                            <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                              {ms.content.slice(0, 500)}{ms.content.length > 500 ? '...' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )
            )}

            {/* ── 설정 탭 ── */}
            {activeRefTab === 'config' && (
              <div className="space-y-3">
                {/* 세계관 요약 */}
                <div>
                  <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">
                    {isKO ? '세계관' : 'World'}
                  </div>
                  <div className="space-y-1 text-[11px] text-text-secondary">
                    {config.title && <div><span className="text-text-tertiary">{isKO ? '제목' : 'Title'}:</span> {config.title}</div>}
                    {config.genre && <div><span className="text-text-tertiary">{isKO ? '장르' : 'Genre'}:</span> {config.genre}</div>}
                    {config.setting && <div><span className="text-text-tertiary">{isKO ? '배경' : 'Setting'}:</span> {config.setting}</div>}
                    {config.corePremise && <div><span className="text-text-tertiary">{isKO ? '전제' : 'Premise'}:</span> {config.corePremise.slice(0, 80)}...</div>}
                    {config.currentConflict && <div><span className="text-text-tertiary">{isKO ? '갈등' : 'Conflict'}:</span> {config.currentConflict.slice(0, 80)}...</div>}
                  </div>
                </div>

                {/* 캐릭터 요약 */}
                {config.characters.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">
                      {isKO ? '캐릭터' : 'Characters'} ({config.characters.length})
                    </div>
                    <div className="space-y-1 text-[11px] text-text-secondary">
                      {config.characters.slice(0, 8).map(c => (
                        <div key={c.id} className="flex items-center gap-1.5">
                          <span className="font-bold text-text-primary">{c.name}</span>
                          <span className="text-text-tertiary text-[10px]">({c.role})</span>
                          {c.traits && <span className="text-[10px] truncate">{c.traits.slice(0, 30)}</span>}
                        </div>
                      ))}
                      {config.characters.length > 8 && (
                        <span className="text-[10px] text-text-tertiary">+{config.characters.length - 8}{isKO ? '명' : ' more'}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 현재 에피소드 */}
                <div>
                  <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">
                    {isKO ? '현재' : 'Current'}
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    EP.{config.episode} / {config.totalEpisodes} | {config.guardrails.min.toLocaleString()}~{config.guardrails.max.toLocaleString()}{isKO ? '자' : 'c'}
                  </div>
                </div>
              </div>
            )}

            {/* ── 메모 탭 ── */}
            {activeRefTab === 'memo' && (
              <div className="space-y-2">
                <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">
                  {isKO ? '작가 메모' : 'Writer Notes'}
                </div>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder={isKO ? '이번 에피소드 메모, 복선, 주의사항 등...' : 'Episode notes, foreshadowing, reminders...'}
                  className="w-full min-h-[200px] bg-bg-secondary/50 border border-border rounded-lg p-3 text-[12px] text-text-primary placeholder-text-tertiary resize-y outline-none focus:border-accent-purple/30"
                />
                <div className="text-[9px] text-text-tertiary text-right">
                  {memo.length > 0 ? `${memo.length}${isKO ? '자' : 'c'}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

// IDENTITY_SEAL: PART-1 | role=참조 패널 | inputs=config,manuscripts,language | outputs=JSX

export default EditReferencePanel;
