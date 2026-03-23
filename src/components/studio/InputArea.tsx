
import React, { useState } from 'react';
import { Eraser, Sparkles, Command, MapPin, User, Bookmark } from 'lucide-react';
import { StoryConfig, AppLanguage } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-constants';

interface InputAreaProps {
  language: AppLanguage;
  onGenerate: (config: StoryConfig, draft: string) => void;
  disabled: boolean;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

const InputArea: React.FC<InputAreaProps> = ({ language, onGenerate, disabled, config, setConfig }) => {
  const [draft, setDraft] = useState('');
  const t = TRANSLATIONS[language].writing;

  const handleSubmit = () => {
    if (disabled || !draft.trim()) return;
    onGenerate(config, draft);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (!disabled && !e.repeat) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="w-full bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto ring-1 ring-white/5">
      
      {/* Dynamic Context Bar - Responsive horizontal scroll on mobile */}
      <div className="flex border-b border-white/5 bg-black/40 overflow-x-auto scrollbar-hide">
        <div className="flex items-center shrink-0 border-r border-white/5 px-2 min-w-[100px] lg:min-w-[120px]">
          <User className="w-3 h-3 text-zinc-700" />
          <input 
            className="bg-transparent px-2 py-3 text-[9px] lg:text-[10px] font-black text-zinc-400 placeholder-zinc-600 outline-none w-full focus:text-blue-400 transition-colors uppercase"
            placeholder={t.pov}
            aria-label={t.pov}
            value={config.povCharacter}
            onChange={e => setConfig({...config, povCharacter: e.target.value})}
          />
        </div>
        <div className="flex items-center shrink-0 border-r border-white/5 px-2 min-w-[100px] lg:min-w-[120px]">
          <MapPin className="w-3 h-3 text-zinc-700" />
          <input 
            className="bg-transparent px-2 py-3 text-[9px] lg:text-[10px] font-black text-zinc-400 placeholder-zinc-600 outline-none w-full focus:text-blue-400 transition-colors uppercase"
            placeholder={t.loc}
            aria-label={t.loc}
            value={config.setting}
            onChange={e => setConfig({...config, setting: e.target.value})}
          />
        </div>
        <div className="flex items-center shrink-0 flex-1 px-2 min-w-[140px]">
          <Bookmark className="w-3 h-3 text-zinc-700" />
          <input 
            className="bg-transparent px-2 py-3 text-[9px] lg:text-[10px] font-black text-zinc-400 placeholder-zinc-600 outline-none w-full focus:text-blue-400 transition-colors uppercase"
            placeholder={t.epTitle}
            aria-label={t.epTitle}
            value={config.title}
            onChange={e => setConfig({...config, title: e.target.value})}
          />
        </div>
      </div>

      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t.inputPlaceholder}
          aria-label={t.inputPlaceholder}
          className="w-full bg-transparent px-6 py-6 text-sm lg:text-base text-zinc-200 placeholder-zinc-600 outline-none min-h-[100px] lg:min-h-[160px] max-h-[300px] resize-none leading-relaxed font-serif disabled:opacity-30 scrollbar-hide"
        />
        
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-white/5 flex justify-between items-center">
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 rounded-full border border-white/5">
              <Command className="w-3 h-3 text-zinc-600" />
              <span className="text-[10px] font-black text-zinc-600 uppercase">CMD+ENTER</span>
            </div>
            <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">
              {disabled ? t.architecting : t.ready}
            </span>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button 
              onClick={() => setDraft('')}
              className="p-3 text-zinc-700 hover:text-red-500 transition-colors hidden sm:block"
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled || !draft.trim()}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                disabled || !draft.trim()
                  ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                  : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-xl'
              }`}
            >
              {disabled ? (
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600" />
              )}
              {disabled ? 'SYNC' : t.execute}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;

