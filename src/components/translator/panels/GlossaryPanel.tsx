import React, { useState, useCallback, useEffect } from 'react';
import { BookA, Search, Plus, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { useWebFeatures } from '@/hooks/useWebFeatures';
import { getGlossaryManager } from '@/lib/translation/glossary-manager';

// ============================================================
// EXPORTED UTILITIES FOR GLOSSARY HIGHLIGHTING
// ============================================================

/** Returns all glossary term strings from the current glossary manager snapshot. */
export function getGlossaryTerms(): string[] {
  const mgr = getGlossaryManager();
  return Object.keys(mgr.toRecord());
}

/**
 * Wraps matching glossary terms in the given text with <mark> tags.
 * Returns an HTML string safe for dangerouslySetInnerHTML.
 * Terms are matched case-insensitively with longest-first priority.
 */
export function highlightGlossaryTerms(text: string, terms: string[]): string {
  if (!terms.length || !text) return text;
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text.replace(re, '<mark class="bg-accent-cyan/25 text-text-primary rounded-sm px-0.5">$1</mark>');
}

export function GlossaryPanel() {
  const { glossary, setGlossary, source } = useTranslator();
  const web = useWebFeatures();
  const [extracting, setExtracting] = useState(false);
  const mgr = getGlossaryManager();
  const [glossaryVersion, setGlossaryVersion] = useState(mgr.version);

  // Subscribe to manager changes for version display
  useEffect(() => {
    return mgr.onChange((v) => setGlossaryVersion(v));
  }, [mgr]);

  // AI 용어 자동 추출
  const handleAutoExtract = useCallback(async () => {
    if (!source?.trim() || extracting) return;
    setExtracting(true);
    try {
      const { extractTermsRuleBased } = await import('@/lib/translation');
      const candidates = extractTermsRuleBased(source);
      // 기존 용어집에 없는 것만 추가 제안
      const newTerms: Record<string, string> = {};
      for (const c of candidates) {
        if (!glossary[c.term]) newTerms[c.term] = '';
      }
      if (Object.keys(newTerms).length > 0) {
        // Use manager for real-time propagation
        mgr.merge(newTerms);
      }
    } catch { /* */ }
    setExtracting(false);
  }, [source, glossary, mgr, extracting]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newOriginal, setNewOriginal] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newLocked, setNewLocked] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editTranslation, setEditTranslation] = useState('');

  const handleAddTerm = () => {
    const term = newOriginal.trim();
    const translation = newTranslation.trim();
    if (!term || !translation) return;
    mgr.addTerm(term, translation);
    setNewOriginal('');
    setNewTranslation('');
  };

  const startEdit = (term: string) => {
    setEditingKey(term);
    setEditOriginal(term);
    setEditTranslation(glossary[term] ?? '');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditOriginal('');
    setEditTranslation('');
  };

  const saveEdit = () => {
    if (!editingKey) return;
    const nextTerm = editOriginal.trim();
    const nextTrans = editTranslation.trim();
    if (!nextTerm || !nextTrans) return;
    if (nextTerm !== editingKey) mgr.removeTerm(editingKey);
    mgr.addTerm(nextTerm, nextTrans);
    cancelEdit();
  };

  const handleRemoveTerm = (term: string) => {
    mgr.removeTerm(term);
    if (editingKey === term) cancelEdit();
  };

  const filteredTerms = Object.entries(glossary || {}).filter(([term, translation]) =>
    term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search glossary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/50 transition-all pointer-events-auto"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <BookA className="w-4 h-4 text-accent-cyan" />
            <span className="text-[13px] font-medium">Terms Dictionary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-text-tertiary border border-white/10">
              {Object.keys(glossary || {}).length}
            </span>
            {glossaryVersion > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan/70 border border-accent-cyan/20">
                v{glossaryVersion}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 relative">
          {filteredTerms.length === 0 ? (
            <div className="px-4 py-8 text-[12px] text-text-tertiary italic text-center bg-white/2 rounded-lg border border-white/3 flex flex-col items-center gap-3">
              <BookA className="w-8 h-8 opacity-20" />
              <span>
                No glossary terms found.
                <br />
                아래에 원문·번역을 입력한 뒤 추가하세요.
              </span>
            </div>
          ) : (
            filteredTerms.map(([term, translation]) =>
              editingKey === term ? (
                <div
                  key={term}
                  className="flex flex-col gap-2 p-3 rounded-lg bg-white/8 border border-accent-cyan/30"
                >
                  <input
                    value={editOriginal}
                    onChange={(e) => setEditOriginal(e.target.value)}
                    placeholder="원문 용어"
                    className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan/50"
                  />
                  <input
                    value={editTranslation}
                    onChange={(e) => setEditTranslation(e.target.value)}
                    placeholder="번역 용어"
                    className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan/50"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-tertiary hover:bg-white/10"
                    >
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 hover:bg-accent-cyan/25"
                    >
                      <Check className="w-3.5 h-3.5" /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={term}
                  className="group relative flex flex-col gap-1 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[14px] font-medium text-text-primary">{term}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEdit(term)}
                        className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors"
                        aria-label="Edit term"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(term)}
                        className="p-1 rounded hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors"
                        aria-label="Remove term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <span className="text-[13px] text-accent-cyan/90">{translation}</span>
                </div>
              )
            )
          )}
        </div>
      </div>

      <div className="p-3 shrink-0 border-t border-border/30 pointer-events-auto space-y-2">
        <div className="grid grid-cols-1 gap-2">
          <input
            value={newOriginal}
            onChange={(e) => setNewOriginal(e.target.value)}
            placeholder="원문 용어"
            className="w-full bg-bg-secondary border border-border/50 rounded-md py-1.5 px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40"
          />
          <input
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            placeholder="번역 용어"
            className="w-full bg-bg-secondary border border-border/50 rounded-md py-1.5 px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40"
          />
          <input
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="맥락 (예: 주인공 이름, 세계관 고유 용어)"
            className="w-full bg-bg-secondary border border-border/50 rounded-md py-1.5 px-3 text-[11px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40"
          />
          <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer px-1">
            <input type="checkbox" checked={newLocked} onChange={(e) => setNewLocked(e.target.checked)} className="rounded" />
            <span>잠금 (번역 시 반드시 이 용어 사용)</span>
          </label>
        </div>
        <button
          type="button"
          onClick={() => { handleAddTerm(); setNewContext(''); setNewLocked(false); }}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/20 rounded-md text-[12px] font-medium transition-colors text-accent-blue"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>용어 추가</span>
        </button>
      </div>
    </div>
  );
}
