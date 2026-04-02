import React, { useState } from 'react';
import { BookA, Search, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function GlossaryPanel() {
  const { glossary, setGlossary } = useTranslator();
  const [searchQuery, setSearchQuery] = useState('');
  const [newOriginal, setNewOriginal] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editTranslation, setEditTranslation] = useState('');

  const handleAddTerm = () => {
    const term = newOriginal.trim();
    const translation = newTranslation.trim();
    if (!term || !translation) return;
    setGlossary({ ...glossary, [term]: translation });
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
    const next = { ...glossary };
    if (nextTerm !== editingKey) delete next[editingKey];
    next[nextTerm] = nextTrans;
    setGlossary(next);
    cancelEdit();
  };

  const handleRemoveTerm = (term: string) => {
    const nextGlossary = { ...glossary };
    delete nextGlossary[term];
    setGlossary(nextGlossary);
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
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-text-tertiary border border-white/10">
            {Object.keys(glossary || {}).length}
          </span>
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

      <div className="p-3 shrink-0 border-t border-white/5 pointer-events-auto space-y-2">
        <div className="grid grid-cols-1 gap-2">
          <input
            value={newOriginal}
            onChange={(e) => setNewOriginal(e.target.value)}
            placeholder="원문 용어"
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan/40"
          />
          <input
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            placeholder="번역 용어"
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan/40"
          />
        </div>
        <button
          type="button"
          onClick={handleAddTerm}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 rounded-md text-[12px] font-medium transition-colors text-accent-cyan"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>용어 추가</span>
        </button>
      </div>
    </div>
  );
}
