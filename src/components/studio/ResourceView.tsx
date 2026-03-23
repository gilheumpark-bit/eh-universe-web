
import React, { useState, useMemo } from 'react';
import { Character, StoryConfig, AppLanguage, CharRelationType } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-constants';
import { UserPlus, Trash2, Fingerprint, Sparkles, Loader2, Users, ChevronLeft, UserCircle, Briefcase, ScrollText, Zap, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateCharacters } from '@/services/geminiService';
import { validateCharacter, calcCompletionScore, WarningBadge, CompletionBar } from './TierValidator';

const CHAR_REL_STYLES: Record<CharRelationType, { ko: string; en: string; color: string }> = {
  lover:       { ko: "연인", en: "Lover", color: "#ec4899" },
  rival:       { ko: "라이벌", en: "Rival", color: "#f59e0b" },
  friend:      { ko: "친구", en: "Friend", color: "#22c55e" },
  enemy:       { ko: "적", en: "Enemy", color: "#ef4444" },
  family:      { ko: "가족", en: "Family", color: "#8b5cf6" },
  mentor:      { ko: "사제", en: "Mentor", color: "#06b6d4" },
  subordinate: { ko: "상하", en: "Superior/Sub", color: "#6b7280" },
};

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
  const [expandedTiers, setExpandedTiers] = useState<Record<string, { t2?: boolean; t3?: boolean }>>({});
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
                    placeholder={language === 'KO' ? '캐릭터 이름...' : language === 'JP' ? 'キャラクター名...' : language === 'CN' ? '角色名...' : 'Character name...'}
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
                    placeholder={language === 'KO' ? '특성, 배경, 말투...' : language === 'JP' ? '特性、背景、口調...' : language === 'CN' ? '特征、背景、语气...' : 'Traits, background, dialect...'}
                    value={newChar.traits}
                    onChange={e => setNewChar({...newChar, traits: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                  <span>서사 잠재력</span>
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
               {[{ value: 'all', label: 'All Characters' }, ...roleLabels].map(cat => (
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
                <span className="text-xs font-black tracking-[0.4em] uppercase">No Characters Found</span>
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

                    <div className="bg-black/40 p-5 rounded-2xl mb-4 relative group/traits">
                      <ScrollText className="absolute top-4 right-4 w-3.5 h-3.5 text-zinc-800 opacity-50" />
                      <p className="text-[11px] text-zinc-400 font-serif leading-relaxed italic line-clamp-4 min-h-[4rem]">
                        {char.traits}
                      </p>
                    </div>

                    {/* Personality & Speech Style */}
                    <div className="space-y-2 mb-4">
                      <input
                        value={char.personality || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, personality: e.target.value } : c)
                        }))}
                        placeholder={language === 'KO' ? '🧠 성격 (예: 냉소적이지만 내면은 따뜻함)' : '🧠 Personality (e.g. cynical but warm inside)'}
                        className="w-full bg-black/30 border border-zinc-800/50 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-800"
                      />
                      <input
                        value={char.speechStyle || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, speechStyle: e.target.value } : c)
                        }))}
                        placeholder={language === 'KO' ? '🗣️ 억양/말투 (예: 반말, 짧은 문장, 냉담한 톤)' : '🗣️ Speech style (e.g. informal, short sentences, cold tone)'}
                        className="w-full bg-black/30 border border-zinc-800/50 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-800"
                      />
                      <input
                        value={char.speechExample || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, speechExample: e.target.value } : c)
                        }))}
                        placeholder={language === 'KO' ? '💬 대사 예시 (예: "...그래서 뭐 어쩌라고.")' : '💬 Example dialogue (e.g. "...so what do you want me to do.")'}
                        className="w-full bg-black/30 border border-zinc-800/50 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-800 font-serif italic"
                      />
                    </div>

                    {/* 1단계 뼈대 — 3-tier framework */}
                    <div className="space-y-2 mb-4 pt-3 border-t border-zinc-800/50">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t.tier1}</span>
                      <input
                        value={char.desire || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, desire: e.target.value } : c)
                        }))}
                        placeholder={t.desirePH}
                        className="w-full bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                      />
                      <input
                        value={char.deficiency || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, deficiency: e.target.value } : c)
                        }))}
                        placeholder={t.deficiencyPH}
                        className="w-full bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                      />
                      <input
                        value={char.conflict || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, conflict: e.target.value } : c)
                        }))}
                        placeholder={t.conflictPH}
                        className="w-full bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={char.values || ''}
                          onChange={e => setConfig((prev: StoryConfig) => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, values: e.target.value } : c)
                          }))}
                          placeholder={t.valuesPH}
                          className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                        />
                        <input
                          value={char.changeArc || ''}
                          onChange={e => setConfig((prev: StoryConfig) => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, changeArc: e.target.value } : c)
                          }))}
                          placeholder={t.changeArcPH}
                          className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    {/* 2단계 작동 — collapsible */}
                    <div className="mb-4 pt-2 border-t border-amber-500/10">
                      <button
                        type="button"
                        onClick={() => setExpandedTiers(prev => ({ ...prev, [char.id]: { ...prev[char.id], t2: !prev[char.id]?.t2 } }))}
                        className="text-[8px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1 text-amber-500/60 hover:text-amber-400 transition-colors mb-2"
                      >
                        {expandedTiers[char.id]?.t2 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {t.tier2}
                      </button>
                      {expandedTiers[char.id]?.t2 && (
                        <div className="space-y-2">
                          <input
                            value={char.strength || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, strength: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '💪 강점 (예: 뛰어난 관찰력)' : '💪 Strength (e.g. keen observation)'}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.weakness || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, weakness: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '🩹 약점 (예: 타인을 믿지 못함)' : '🩹 Weakness (e.g. inability to trust)'}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700"
                          />
                          <textarea
                            value={char.backstory || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, backstory: e.target.value } : c)
                            }))}
                            rows={2}
                            placeholder={language === 'KO' ? '📜 과거 — 현재를 만든 사건' : '📜 Backstory — the event that shaped them'}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700 resize-none"
                          />
                          <input
                            value={char.failureCost || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, failureCost: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '⚠️ 실패 대가 (예: 가족을 잃는다)' : '⚠️ Failure cost (e.g. loses family)'}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.currentProblem || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, currentProblem: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '🔥 현재 문제 (예: 조직의 배신자 색출)' : '🔥 Current problem (e.g. finding the traitor)'}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3단계 디테일 — collapsible */}
                    <div className="mb-4 pt-2 border-t border-emerald-500/10">
                      <button
                        type="button"
                        onClick={() => setExpandedTiers(prev => ({ ...prev, [char.id]: { ...prev[char.id], t3: !prev[char.id]?.t3 } }))}
                        className="text-[8px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1 text-emerald-500/60 hover:text-emerald-400 transition-colors mb-2"
                      >
                        {expandedTiers[char.id]?.t3 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {language === 'KO' ? '3단계 — 디테일' : 'Tier 3 — Detail'}
                      </button>
                      {expandedTiers[char.id]?.t3 && (
                        <div className="space-y-2">
                          <input
                            value={char.emotionStyle || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, emotionStyle: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '😶 감정 표현 방식 (예: 웃으면서 우는 타입)' : '😶 Emotion style (e.g. smiles while crying)'}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.relationPattern || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, relationPattern: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '🤝 인간관계 패턴 (예: 밀당, 의존형)' : '🤝 Relation pattern (e.g. push-pull, dependent)'}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.symbol || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, symbol: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '🔮 상징 요소 (예: 항상 끼고 있는 반지)' : '🔮 Symbol (e.g. a ring they always wear)'}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.secret || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, secret: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '🤫 비밀 요소 (예: 과거에 사람을 죽인 적 있음)' : '🤫 Secret (e.g. once killed someone)'}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            value={char.externalPerception || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, externalPerception: e.target.value } : c)
                            }))}
                            placeholder={language === 'KO' ? '👁️ 타인이 보는 인상 (예: 차갑고 무관심해 보임)' : '👁️ External perception (e.g. seems cold and indifferent)'}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* 한 줄 요약 공식 (자동 생성) */}
                    {(char.desire || char.deficiency || char.conflict) && (
                      <div className="mb-4 p-3 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
                        <span className="text-[8px] font-black text-accent-purple/60 uppercase tracking-widest">{t.formulaLabel}</span>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                          {language === 'KO'
                            ? `${char.name}은(는) ${getRoleLabel(char.role)} 역할로, ${char.desire || '___'}을(를) 원하며, ${char.deficiency || '___'}이(가) 부족하고, ${char.conflict || '___'} 때문에 갈등하며, ${char.changeArc || '___'}(으)로 변한다.`
                            : `${char.name} serves as ${getRoleLabel(char.role)}, wants ${char.desire || '___'}, lacks ${char.deficiency || '___'}, conflicts over ${char.conflict || '___'}, and transforms into ${char.changeArc || '___'}.`
                          }
                        </p>
                      </div>
                    )}

                    {/* 3-tier 검증 */}
                    {(() => {
                      const warnings = validateCharacter(char, language);
                      const score = calcCompletionScore(warnings, 13);
                      return (
                        <div className="space-y-2 mb-3">
                          <CompletionBar score={score} language={language} />
                          <WarningBadge warnings={warnings} language={language} />
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500/50" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">서사 잠재력</span>
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
      
      {/* ====== CHARACTER RELATIONSHIP MAP ====== */}
      {config.characters.length >= 2 && (
        <CharRelationMap language={language} config={config} setConfig={setConfig} />
      )}

      {/* Mobile-only spacer for bottom nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

// ============================================================
// Character Relationship Map (관계도)
// ============================================================

function CharRelationMap({ language, config, setConfig }: ResourceViewProps) {
  const isKO = language === 'KO';
  const chars = config.characters;
  const relations = config.charRelations || [];

  const [selFrom, setSelFrom] = useState('');
  const [selTo, setSelTo] = useState('');
  const [selType, setSelType] = useState<CharRelationType>('friend');
  const [relDesc, setRelDesc] = useState('');

  const addRelation = () => {
    if (!selFrom || !selTo || selFrom === selTo) return;
    const exists = relations.some(r =>
      (r.from === selFrom && r.to === selTo) || (r.from === selTo && r.to === selFrom)
    );
    if (exists) return;
    setConfig((prev: StoryConfig) => ({
      ...prev,
      charRelations: [...(prev.charRelations || []), { from: selFrom, to: selTo, type: selType, desc: relDesc }]
    }));
    setRelDesc('');
  };

  const removeRelation = (idx: number) => {
    setConfig((prev: StoryConfig) => ({
      ...prev,
      charRelations: (prev.charRelations || []).filter((_, i) => i !== idx)
    }));
  };

  // SVG circular layout
  const cx = 200, cy = 200, r = 140;
  const nodePositions = chars.map((c, i) => {
    const angle = (i / Math.max(chars.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { id: c.id, name: c.name, role: c.role, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  const getPos = (id: string) => nodePositions.find(n => n.id === id);

  const ROLE_COLORS: Record<string, string> = {
    hero: '#3b82f6', villain: '#ef4444', ally: '#22c55e', extra: '#6b7280'
  };

  return (
    <div className="bg-zinc-900/20 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-pink-600/10 border border-pink-500/20 rounded-2xl">
          <Link2 className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tighter uppercase">{isKO ? '캐릭터 관계도' : 'Character Relations'}</h3>
          <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase">{isKO ? '인물 간 관계 시각화' : 'Visual relationship map'}</p>
        </div>
      </div>

      {/* Add relation controls */}
      <div className="flex flex-wrap gap-2 items-end">
        <select value={selFrom} onChange={e => setSelFrom(e.target.value)} className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none">
          <option value="">{isKO ? '캐릭터 A' : 'Character A'}</option>
          {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selTo} onChange={e => setSelTo(e.target.value)} className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none">
          <option value="">{isKO ? '캐릭터 B' : 'Character B'}</option>
          {chars.filter(c => c.id !== selFrom).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(Object.keys(CHAR_REL_STYLES) as CharRelationType[]).map(rt => (
            <button key={rt} onClick={() => setSelType(rt)}
              className={`px-2 py-2 rounded-lg text-[9px] font-bold border transition-all ${
                selType === rt ? 'text-white' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600'
              }`}
              style={selType === rt ? { background: CHAR_REL_STYLES[rt].color, borderColor: CHAR_REL_STYLES[rt].color } : undefined}
            >
              {isKO ? CHAR_REL_STYLES[rt].ko : CHAR_REL_STYLES[rt].en}
            </button>
          ))}
        </div>
        <input value={relDesc} onChange={e => setRelDesc(e.target.value)} placeholder={isKO ? '관계 설명...' : 'Description...'}
          className="flex-1 min-w-[120px] bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none" />
        <button onClick={addRelation} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider">
          {isKO ? '추가' : 'Add'}
        </button>
      </div>

      {/* SVG Relation Graph */}
      <div className="flex justify-center">
        <svg viewBox="0 0 400 400" className="w-full max-w-[500px]" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
          {/* Relation lines */}
          {relations.map((rel, i) => {
            const from = getPos(rel.from);
            const to = getPos(rel.to);
            if (!from || !to) return null;
            const style = CHAR_REL_STYLES[rel.type];
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={style.color} strokeWidth="2" opacity="0.6" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} fill={style.color} fontSize="8" textAnchor="middle" fontWeight="bold">
                  {isKO ? style.ko : style.en}
                </text>
                {rel.desc && (
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 + 5} fill={style.color} fontSize="6" textAnchor="middle" opacity="0.7">
                    {rel.desc}
                  </text>
                )}
              </g>
            );
          })}
          {/* Character nodes */}
          {nodePositions.map(node => {
            const roleColor = ROLE_COLORS[chars.find(c => c.id === node.id)?.role || 'extra'] || '#6b7280';
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r="22" fill={roleColor} opacity="0.12" stroke={roleColor} strokeWidth="2" />
                <text x={node.x} y={node.y - 2} fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {node.name.slice(0, 3)}
                </text>
                <text x={node.x} y={node.y + 10} fill={roleColor} fontSize="7" textAnchor="middle" opacity="0.8">
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + list */}
      <div className="flex flex-wrap gap-3 text-[9px]">
        {(Object.keys(CHAR_REL_STYLES) as CharRelationType[]).map(rt => (
          <span key={rt} className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ background: CHAR_REL_STYLES[rt].color }} />
            {isKO ? CHAR_REL_STYLES[rt].ko : CHAR_REL_STYLES[rt].en}
          </span>
        ))}
      </div>

      {relations.length > 0 && (
        <div className="space-y-1.5">
          {relations.map((rel, i) => {
            const fromChar = chars.find(c => c.id === rel.from);
            const toChar = chars.find(c => c.id === rel.to);
            const style = CHAR_REL_STYLES[rel.type];
            return (
              <div key={i} className="flex items-center justify-between bg-black/30 border border-zinc-800/50 rounded-xl px-4 py-2 text-[10px]">
                <span>
                  <span className="font-bold text-white">{fromChar?.name}</span>
                  <span className="text-zinc-600 mx-1.5">⇄</span>
                  <span className="font-bold text-white">{toChar?.name}</span>
                  <span className="ml-2 font-bold" style={{ color: style.color }}>
                    [{isKO ? style.ko : style.en}]
                  </span>
                  {rel.desc && <span className="ml-2 text-zinc-500 italic">{rel.desc}</span>}
                </span>
                <button onClick={() => removeRelation(i)} className="text-zinc-700 hover:text-red-500 transition-colors">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResourceView;

