import React, { useState } from 'react';
import { BookA, Search, Plus, Trash2, Edit2 } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function GlossaryPanel() {
  const { glossary, setGlossary } = useTranslator();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddTerm = () => {
    // In a real implementation, this would open a modal
    const newTerm = prompt('Enter original term:');
    if (!newTerm) return;
    const translation = prompt('Enter translated term:');
    if (!translation) return;

    setGlossary({
      ...glossary,
      [newTerm]: translation,
    });
  };

  const handleRemoveTerm = (term: string) => {
    const newGlossary = { ...glossary };
    delete newGlossary[term];
    setGlossary(newGlossary);
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
              <span>No glossary terms found.<br/>Click &quot;Add Term&quot; to start building your dictionary.</span>
            </div>
          ) : (
            filteredTerms.map(([term, translation]) => (
              <div
                key={term}
                className="group relative flex flex-col gap-1 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[14px] font-medium text-text-primary">{term}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleRemoveTerm(term)}
                      className="p-1 rounded hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <span className="text-[13px] text-accent-cyan/90">{translation}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-3 shrink-0 border-t border-white/5 pointer-events-auto">
        <button 
          onClick={handleAddTerm}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 rounded-md text-[12px] font-medium transition-colors text-accent-cyan"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Term</span>
        </button>
      </div>
    </div>
  );
}
