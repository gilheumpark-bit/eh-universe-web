
import React, { useState, useMemo } from 'react';
import { Character, StoryConfig, AppLanguage } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-constants';
import { UserPlus, Trash2, Fingerprint, Sparkles, Loader2, Users, ChevronLeft, UserCircle, Briefcase, ScrollText, Zap } from 'lucide-react';
import { generateCharacters } from '@/services/geminiService';

interface ResourceViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

const ROLE_KEYS = ['hero', 'villain', 'ally', 'extra'] as const;

const ResourceView: React.FC<ResourceViewProps> = ({ language, config, setConfig }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const t = TRANSLATIONS[language].resource;
  const te = TRANSLATIONS[language].engine;

  const roleLabels = ROLE_KEYS.map(key => ({
    value: key,
    label: te.roles[key],
  }));

  const getRoleLabel = (role: string) => {
    const found = roleLabels.find(r => r.value === role);
    return found ? found.label : role;
  };

  const [newChar, setNewChar] = useState<Partial<Character>>({
    name: '', role: 'hero', traits: '', appearance: '', dna: 50
  });

  const filteredCharacters = useMemo(() => {
    if (activeCategory === 'all') return config.characters;
    return config.characters.filter(c => c.role === activeCategory);
  }, [config.characters, activeCategory]);

  const handleAutoGenerate = async () => {
    if (!config.synopsis) {
      alert(({ KO: "먼저 시놉시스를 작성해주세요.", EN: "Please write the synopsis first.", JP: "先にあらすじを書いてください。", CN: "请先编写大纲。" })[language]);
      return;
    }
    
    setIsGenerating(true);
    try {
      const generated = await generateCharacters(config, language); 
      setConfig(prev => ({
        ...prev,
        characters: [...prev.characters, ...generated]
      }));
    } catch (_error) {
      alert("Error generating characters.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addCharacter = () => {
    if (!newChar.name) return;
    const char: Character = {
      id: `c-manual-${Date.now()}`,
      name: newChar.name || '',
      role: newChar.role || 'hero',
      traits: newChar.traits || '',
      appearance: newChar.appearance || '',
      dna: newChar.dna || 50
    };
    setConfig({ ...config, characters: [...config.characters, char] });
    setNewChar({ name: '', role: 'hero', traits: '', appearance: '', dna: 50 });
  };

  const removeCharacter = (id: string) => {
    setConfig({ ...config, characters: config.characters.filter(c => c.id !== id) });
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full p-4 md:p-10 space-y-8 lg:space-y-12 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-zinc-900/20 p-4 md:p-0 rounded-3xl md:bg-transparent">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="p-4 md:p-5 bg-blue-600/10 border border-blue-500/20 rounded-2xl md:rounded-3xl shrink-0">
            <Fingerprint className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase truncate">{t.title}</h2>
            <p className="text-zinc-500 text-[8px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.4em] uppercase truncate">{t.subtitle}</p>
          </div>
        </div>

        <button 
          onClick={handleAutoGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 group w-full md:w-auto"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? "Synthesizing..." : t.autoGen}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start relative">
        
        {/* Left Side: Character Creator Panel */}
        <div className={`w-full lg:shrink-0 transition-all duration-500 ease-in-out ${isPanelOpen ? 'lg:w-80 opacity-100' : 'lg:w-0 opacity-0 lg:-translate-x-10'}`}>
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" /> {t.creator}
              </h3>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="lg:hidden p-2 text-zinc-500 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-zinc-700 uppercase ml-2">{t.name}</span>
                <div className="relative group">
                   <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
                   <input 
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-4 text-xs font-bold focus:border-blue-500 outline-none transition-colors placeholder:text-zinc-800"
                    placeholder="Character name..."
                    value={newChar.name}
                    onChange={e => setNewChar({...newChar, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-zinc-700 uppercase ml-2">{t.role}</span>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 pointer-events-none" />
                  <select
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-4 text-xs font-bold focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    value={newChar.role}
                    onChange={e => setNewChar({...newChar, role: e.target.value})}
                  >
                    {roleLabels.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-zinc-700 uppercase ml-2">{t.traits}</span>
                <div className="relative">
                  <ScrollText className="absolute left-4 top-4 w-4 h-4 text-zinc-700" />
                  <textarea 
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-4 text-xs min-h-[140px] focus:border-blue-500 outline-none resize-none leading-relaxed"
                    placeholder="Traits, background, dialect..."
                    value={newChar.traits}
                    onChange={e => setNewChar({...newChar, traits: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                  <span>Narrative DNA</span>
                  <span className="text-blue-500">{newChar.dna} pts</span>
                </div>
                <input 
                  type="range" min="0" max="100"
                  className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                  value={newChar.dna}
                  onChange={e => setNewChar({...newChar, dna: parseInt(e.target.value)})}
                />
              </div>

              <button 
                onClick={addCharacter}
                className="w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95"
              >
                {t.register}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: List Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          
          <div className="flex items-center gap-4">
             {!isPanelOpen && (
               <button 
                onClick={() => setIsPanelOpen(true)}
                className="hidden lg:flex items-center gap-2 px-5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
               >
                 <UserPlus className="w-3.5 h-3.5 text-blue-500" /> {t.creator}
               </button>
             )}
             
             <div className="flex-1 flex items-center gap-2 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-900 overflow-x-auto custom-scrollbar">
               {[{ value: 'all', label: 'All Units' }, ...roleLabels].map(cat => (
                 <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeCategory === cat.value ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                 >
                   {cat.label}
                 </button>
               ))}
             </div>
          </div>

          <div className="relative min-h-[400px]">
            {filteredCharacters.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-900 rounded-[3rem] text-zinc-800">
                <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 opacity-20" />
                </div>
                <span className="text-xs font-black tracking-[0.4em] uppercase">No Entities Found</span>
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 transition-all duration-500 ${
                isPanelOpen ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}>
                {filteredCharacters.map(char => (
                  <div key={char.id} className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl md:rounded-[2.5rem] hover:border-blue-500/30 transition-all group relative overflow-hidden backdrop-blur-sm">
                    {/* Visual DNA Bar */}
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" style={{ width: `${char.dna}%` }}></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 font-black border border-white/5 text-xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {char.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-black text-white truncate mb-0.5">{char.name}</div>
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               char.role === 'hero' ? 'bg-blue-500' :
                               char.role === 'villain' ? 'bg-red-500' : 'bg-zinc-600'
                             }`}></div>
                             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{getRoleLabel(char.role)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeCharacter(char.id)} 
                        className="p-2.5 text-zinc-700 hover:text-red-500 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-black/40 p-5 rounded-2xl mb-6 relative group/traits">
                      <ScrollText className="absolute top-4 right-4 w-3.5 h-3.5 text-zinc-800 opacity-50" />
                      <p className="text-[11px] text-zinc-400 font-serif leading-relaxed italic line-clamp-4 min-h-[4rem]">
                        {char.traits}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500/50" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Narrative Potential</span>
                       </div>
                       <span className="text-[11px] font-mono text-blue-400 font-black">{char.dna}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile-only spacer for bottom nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default ResourceView;

