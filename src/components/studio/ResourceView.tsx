
import React, { useState, useMemo } from 'react';
import { Character, StoryConfig, AppLanguage, SocialProfile } from '@/lib/studio-types';
import { getStudioTranslations, L4, normalizeAppLanguage } from '@/lib/i18n';
import { UserPlus, Trash2, Fingerprint, Users, ScrollText, Zap, ChevronDown, ChevronUp, Dna, Settings2, Sparkles } from 'lucide-react';
import { validateCharacter, calcCompletionScore, WarningBadge, CompletionBar } from './TierValidator';
import { RELATION_LABELS, AGE_LABELS, EXPLICIT_LABELS, PROFANITY_LABELS } from '@/engine/social-register';
import { useStudioUI } from '@/contexts/StudioContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldBadge } from './ResourceView.FieldBadge';
import { CharRelationMap } from './ResourceView.CharRelationMap';
import { CharacterCreatorPanel } from './ResourceView.CharacterCreatorPanel';

interface ResourceViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onError?: (message: string) => void;
}

const ROLE_KEYS = ['hero', 'villain', 'ally', 'extra'] as const;

const ResourceView: React.FC<ResourceViewProps> = ({ language, config, setConfig, onError: _onError }) => {
  const { showConfirm, closeConfirm } = useStudioUI();
  const appLanguage = normalizeAppLanguage(language);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, { t2?: boolean; t3?: boolean }>>({});
  const t = getStudioTranslations(appLanguage).resource;
  const te = getStudioTranslations(appLanguage).engine;

  // Fix #7: Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // Fix #6: Character name validation
  const [nameError, setNameError] = React.useState(false);
  const [creatorDnaOpen, setCreatorDnaOpen] = React.useState(true);

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

  const addCharacter = () => {
    if (!newChar.name || !newChar.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const char: Character = {
      id: `c-manual-${Date.now()}`,
      name: newChar.name || '',
      role: newChar.role || 'hero',
      traits: newChar.traits || '',
      appearance: newChar.appearance || '',
      dna: newChar.dna || 50,
      ...(newChar.desire ? { desire: newChar.desire } : {}),
      ...(newChar.deficiency ? { deficiency: newChar.deficiency } : {}),
      ...(newChar.conflict ? { conflict: newChar.conflict } : {}),
      ...(newChar.changeArc ? { changeArc: newChar.changeArc } : {}),
      ...(newChar.values ? { values: newChar.values } : {}),
    };
    setConfig({ ...config, characters: [...config.characters, char] });
    setNewChar({ name: '', role: 'hero', traits: '', appearance: '', dna: 50 });
  };

  const removeCharacter = (id: string) => {
    const charName = config.characters.find(c => c.id === id)?.name ?? '';
    showConfirm({
      title: L4(language, { ko: '캐릭터 삭제', en: 'Delete Character', ja: 'キャラクター削除', zh: '删除角色' }),
      message: L4(language, {
        ko: `'${charName}' 캐릭터를 삭제할까요? 되돌릴 수 없습니다.`,
        en: `Delete character '${charName}'? This cannot be undone.`,
        ja: `'${charName}' キャラクターを削除しますか? 元に戻せません。`,
        zh: `删除角色 '${charName}' 吗? 此操作不可恢复。`,
      }),
      variant: 'danger',
      confirmLabel: L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' }),
      cancelLabel: L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
      onConfirm: () => {
        setConfig({ ...config, characters: config.characters.filter(c => c.id !== id) });
        closeConfirm();
      },
    });
  };

  // Fix #7: Paginate large lists
  const totalPages = Math.ceil(filteredCharacters.length / PAGE_SIZE);
  const paginatedCharacters = filteredCharacters.length > PAGE_SIZE
    ? filteredCharacters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredCharacters;

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  return (
    <div className="max-w-[1400px] mx-auto w-full p-4 md:p-10 space-y-8 lg:space-y-12 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex items-center justify-between bg-accent-purple/10 border border-accent-purple/20 backdrop-blur-sm p-4 rounded-2xl">
        <div className="flex items-center gap-4 md:gap-6 w-full">
          <div className="p-4 md:p-5 bg-accent-purple/15 border border-accent-purple/30 rounded-2xl shrink-0">
            <Fingerprint className="w-6 h-6 md:w-8 md:h-8 text-accent-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase truncate text-text-primary">{t.title}</h2>
            <p className="text-text-secondary text-[10px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.4em] uppercase truncate">{t.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start relative">
        
        <CharacterCreatorPanel
          language={language}
          appLanguage={appLanguage}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
          t={t}
          roleLabels={roleLabels}
          newChar={newChar}
          setNewChar={setNewChar}
          nameError={nameError}
          setNameError={setNameError}
          creatorDnaOpen={creatorDnaOpen}
          setCreatorDnaOpen={setCreatorDnaOpen}
          addCharacter={addCharacter}
        />

        {/* Right Side: List Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          
          <div className="flex items-center gap-4">
             {!isPanelOpen && (
               <button 
                onClick={() => setIsPanelOpen(true)}
                className="hidden lg:flex items-center gap-2 px-5 py-3 bg-bg-secondary border border-border rounded-xl text-[10px] font-black text-text-secondary hover:text-white transition-colors uppercase tracking-widest"
               >
                 <UserPlus className="w-3.5 h-3.5 text-accent-blue" /> {t.creator}
               </button>
             )}
             
             <div className="flex-1 flex items-center gap-2 bg-bg-primary/50 p-1.5 rounded-2xl border border-border overflow-x-auto custom-scrollbar" role="tablist">
               {[{ value: 'all', label: 'All Characters' }, ...roleLabels].map(cat => (
                 <button
                  key={cat.value}
                  role="tab"
                  aria-selected={activeCategory === cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-[transform,opacity,background-color,border-color,color] whitespace-nowrap ${
                    activeCategory === cat.value ? 'bg-bg-tertiary text-white shadow-lg ring-1 ring-white/10' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                 >
                   {cat.label}
                 </button>
               ))}
             </div>
          </div>

          <div className="relative min-h-[400px]">
            {filteredCharacters.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-border rounded-[3rem]">
                <EmptyState
                  icon={Users}
                  title={L4(language, {
                    ko: '캐릭터가 없습니다',
                    en: 'No characters yet',
                    ja: 'キャラクターがいません',
                    zh: '还没有角色',
                  })}
                  description={L4(language, {
                    ko: '주인공부터 시작하세요.',
                    en: 'Start with your protagonist.',
                    ja: '主人公から始めましょう。',
                    zh: '从主角开始吧。',
                  })}
                  actions={[
                    {
                      label: L4(language, {
                        ko: '첫 캐릭터 추가',
                        en: 'Add first character',
                        ja: '最初のキャラクターを追加',
                        zh: '添加第一个角色',
                      }),
                      icon: UserPlus,
                      variant: 'primary',
                      onClick: () => {
                        setIsPanelOpen(true);
                        // [C] creator 패널의 이름 입력 필드로 포커스
                        setTimeout(() => {
                          const nameInput = document.querySelector<HTMLInputElement>(
                            'input[data-testid="new-character-name"], input[name="newCharacterName"]',
                          );
                          nameInput?.focus();
                        }, 50);
                      },
                    },
                    {
                      label: L4(language, {
                        ko: '노아 제안',
                        en: 'Noa suggest',
                        ja: 'ノア提案',
                        zh: '诺亚建议',
                      }),
                      icon: Sparkles,
                      variant: 'secondary',
                      onClick: () => {
                        // [C] 상위 CharacterTab 헤더의 "초안 생성" 버튼으로 포커스 이동
                        const aiBtn = document.querySelector<HTMLButtonElement>(
                          'button[data-testid="character-ai-generate"]',
                        );
                        if (aiBtn) {
                          aiBtn.focus();
                          aiBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                          // fallback: 제너레이트 버튼이 없으면 creator 열기
                          setIsPanelOpen(true);
                        }
                      },
                    },
                  ]}
                />
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 transition-[transform,opacity,background-color,border-color,color] duration-500 ${
                isPanelOpen ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}>
                {paginatedCharacters.map(char => (
                  <div key={char.id} className="relative group overflow-hidden bg-bg-secondary/60 backdrop-blur-xl border border-border/40 hover:border-accent-purple/40 rounded-2xl p-6 transition-colors hover-lift">
                    {/* Visual DNA Bar */}
                    <div className="absolute top-0 left-0 h-1 rounded-tl-2xl bg-gradient-to-r from-accent-purple to-accent-amber opacity-40 group-hover:opacity-100 transition-opacity" style={{ width: `${char.dna}%` }}></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14">
                          {/* Completion ring */}
                          {(() => {
                            const warnings = validateCharacter(char, language);
                            const totalFields = 6;
                            const score = calcCompletionScore(warnings, totalFields);
                            return (
                              <>
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-border/30" />
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2"
                                    className="text-accent-purple"
                                    strokeDasharray={`${score} 100`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 bg-accent-purple/15 rounded-2xl flex items-center justify-center text-accent-purple font-black border border-accent-purple/30 text-xl group-hover:scale-110 transition-transform duration-500">
                                  {char.name[0]}
                                </div>
                                {/* Completion % on hover */}
                                <div className="absolute -bottom-1 -right-1 bg-bg-primary border border-border/60 rounded-full px-1.5 py-0.5 text-[8px] font-mono font-bold text-accent-purple opacity-0 group-hover:opacity-100 transition-opacity">
                                  {score}%
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-black text-text-primary truncate mb-0.5">{char.name}</div>
                          <div className="flex items-center gap-1">
                             <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                               char.role === 'hero' ? 'bg-accent-purple' :
                               char.role === 'villain' ? 'bg-accent-red' :
                               char.role === 'ally' ? 'bg-accent-amber' : 'bg-text-tertiary'
                             }`}></div>
                             <select
                               value={char.role}
                               onChange={e => setConfig((prev: StoryConfig) => ({
                                 ...prev,
                                 characters: prev.characters.map(c => c.id === char.id ? { ...c, role: e.target.value } : c)
                               }))}
                               className="bg-transparent text-[10px] font-black text-text-tertiary uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer hover:text-text-secondary transition-colors appearance-none pr-3"
                               style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 8 8\'%3E%3Cpath fill=\'%236b7280\' d=\'M0 2l4 4 4-4z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
                             >
                               {ROLE_KEYS.map(r => (
                                 <option key={r} value={r}>{te.roles[r]}</option>
                               ))}
                             </select>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCharacter(char.id)}
                        aria-label="삭제"
                        className="p-2.5 text-text-tertiary hover:text-accent-red transition-[opacity,background-color,border-color,color] opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-bg-tertiary/30 border-l-2 border-accent-purple/40 rounded-r-xl p-4 mb-4 relative group/traits z-10">
                      <ScrollText className="absolute top-4 right-4 w-3.5 h-3.5 text-text-quaternary" />
                      <p className="text-[13px] text-text-secondary font-serif leading-relaxed italic line-clamp-4 min-h-[4rem]">
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
                        placeholder={appLanguage === 'KO' ? '🧠 성격 (예: 냉소적이지만 내면은 따뜻함)' : '🧠 Personality (e.g. cynical but warm inside)'}
                        maxLength={200}
                        className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                      />
                      <input
                        value={char.speechStyle || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, speechStyle: e.target.value } : c)
                        }))}
                        placeholder={appLanguage === 'KO' ? '🗣️ 억양/말투 (예: 반말, 짧은 문장, 냉담한 톤)' : '🗣️ Speech style (e.g. informal, short sentences, cold tone)'}
                        maxLength={200}
                        className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                      />
                      <input
                        value={char.speechExample || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, speechExample: e.target.value } : c)
                        }))}
                        placeholder={appLanguage === 'KO' ? '💬 대사 예시 (예: "...그래서 뭐 어쩌라고.")' : '💬 Example dialogue (e.g. "...so what do you want me to do.")'}
                        maxLength={300}
                        className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary font-serif italic"
                      />
                    </div>

                    {/* 1단계 뼈대 — 캐릭터 DNA */}
                    <div className="space-y-2 mb-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Dna className="w-3.5 h-3.5 text-accent-purple" />
                        <span className="text-[10px] font-black text-accent-purple uppercase tracking-widest">{t.tier1DNA ?? t.tier1}</span>
                        <FieldBadge required={false} language={appLanguage} />
                      </div>
                      <input
                        value={char.desire || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, desire: e.target.value } : c)
                        }))}
                        placeholder={t.desirePH}
                        maxLength={200}
                        className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                      />
                      <input
                        value={char.deficiency || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, deficiency: e.target.value } : c)
                        }))}
                        placeholder={t.deficiencyPH}
                        maxLength={200}
                        className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                      />
                      <input
                        value={char.conflict || ''}
                        onChange={e => setConfig((prev: StoryConfig) => ({
                          ...prev,
                          characters: prev.characters.map(c => c.id === char.id ? { ...c, conflict: e.target.value } : c)
                        }))}
                        placeholder={t.conflictPH}
                        maxLength={200}
                        className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={char.values || ''}
                          onChange={e => setConfig((prev: StoryConfig) => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, values: e.target.value } : c)
                          }))}
                          placeholder={t.valuesPH}
                          maxLength={200}
                          className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                        />
                        <input
                          value={char.changeArc || ''}
                          onChange={e => setConfig((prev: StoryConfig) => ({
                            ...prev,
                            characters: prev.characters.map(c => c.id === char.id ? { ...c, changeArc: e.target.value } : c)
                          }))}
                          placeholder={t.changeArcPH}
                          maxLength={200}
                          className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
                        />
                      </div>
                    </div>

                    {/* 2단계 작동 — collapsible */}
                    <div className="mb-4 pt-2 border-t border-amber-500/10">
                      <button
                        type="button"
                        onClick={() => setExpandedTiers(prev => ({ ...prev, [char.id]: { ...prev[char.id], t2: !prev[char.id]?.t2 } }))}
                        aria-expanded={!!expandedTiers[char.id]?.t2}
                        aria-label={L4(language, { ko: `${char.name ?? '캐릭터'} 2단계 섹션 토글`, en: `Toggle Tier 2 section for ${char.name ?? 'character'}`, ja: `${char.name ?? 'キャラクター'} 2段階切替`, zh: `切换 ${char.name ?? '角色'} 第 2 层级` })}
                        className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1.5 text-amber-500/60 hover:text-amber-400 transition-colors mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                      >
                        {expandedTiers[char.id]?.t2 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <Settings2 className="w-3 h-3" />
                        {t.tier2Link ?? t.tier2}
                      </button>
                      {expandedTiers[char.id]?.t2 && (
                        <div className="space-y-2">
                          <input
                            value={char.strength || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, strength: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '💪 강점 (예: 뛰어난 관찰력)' : '💪 Strength (e.g. keen observation)'}
                            maxLength={200}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.weakness || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, weakness: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '🩹 약점 (예: 타인을 믿지 못함)' : '🩹 Weakness (e.g. inability to trust)'}
                            maxLength={200}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <textarea
                            value={char.backstory || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, backstory: e.target.value } : c)
                            }))}
                            rows={2}
                            placeholder={appLanguage === 'KO' ? '📜 과거 — 현재를 만든 사건' : '📜 Backstory — the event that shaped them'}
                            maxLength={1000}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary resize-none"
                          />
                          <input
                            value={char.failureCost || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, failureCost: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '⚠️ 실패 대가 (예: 가족을 잃는다)' : '⚠️ Failure cost (e.g. loses family)'}
                            maxLength={200}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.currentProblem || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, currentProblem: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '🔥 현재 문제 (예: 조직의 배신자 색출)' : '🔥 Current problem (e.g. finding the traitor)'}
                            maxLength={200}
                            className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3단계 디테일 — collapsible */}
                    <div className="mb-4 pt-2 border-t border-emerald-500/10">
                      <button
                        type="button"
                        onClick={() => setExpandedTiers(prev => ({ ...prev, [char.id]: { ...prev[char.id], t3: !prev[char.id]?.t3 } }))}
                        aria-expanded={!!expandedTiers[char.id]?.t3}
                        aria-label={L4(language, { ko: `${char.name ?? '캐릭터'} 3단계 섹션 토글`, en: `Toggle Tier 3 section for ${char.name ?? 'character'}`, ja: `${char.name ?? 'キャラクター'} 3段階切替`, zh: `切换 ${char.name ?? '角色'} 第 3 层级` })}
                        className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1 text-emerald-500/60 hover:text-emerald-400 transition-colors mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                      >
                        {expandedTiers[char.id]?.t3 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {appLanguage === 'KO' ? '3단계 — 디테일' : 'Tier 3 — Detail'}
                      </button>
                      {expandedTiers[char.id]?.t3 && (
                        <div className="space-y-2">
                          <input
                            value={char.emotionStyle || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, emotionStyle: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '😶 감정 표현 방식 (예: 웃으면서 우는 타입)' : '😶 Emotion style (e.g. smiles while crying)'}
                            maxLength={200}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.relationPattern || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, relationPattern: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '🤝 관계 패턴 (예: 밀당, 의존형)' : '🤝 Relation pattern (e.g. push-pull, dependent)'}
                            maxLength={200}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.symbol || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, symbol: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '🔮 상징 요소 (예: 항상 끼고 있는 반지)' : '🔮 Symbol (e.g. a ring they always wear)'}
                            maxLength={200}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.secret || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, secret: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '🤫 비밀 요소 (예: 과거에 사람을 죽인 적 있음)' : '🤫 Secret (e.g. once killed someone)'}
                            maxLength={200}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
                          />
                          <input
                            value={char.externalPerception || ''}
                            onChange={e => setConfig((prev: StoryConfig) => ({
                              ...prev,
                              characters: prev.characters.map(c => c.id === char.id ? { ...c, externalPerception: e.target.value } : c)
                            }))}
                            placeholder={appLanguage === 'KO' ? '👁️ 타인이 보는 인상 (예: 차갑고 무관심해 보임)' : '👁️ External perception (e.g. seems cold and indifferent)'}
                            maxLength={200}
                            className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
                          />
                        </div>
                      )}
                    </div>

                    {/* Social Profile (소셜 레지스터) — collapsible Advanced */}
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          // Toggle social profile visibility via a data attribute trick
                          const el = document.getElementById(`social-${char.id}`);
                          if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors mb-2"
                      >
                        <Users className="w-3 h-3" />
                        {t.socialProfile ?? 'Social Profile'} ({t.socialAdvanced ?? 'Advanced'})
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div id={`social-${char.id}`} style={{ display: 'none' }} className="space-y-3 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-tertiary uppercase">{t.socialRelation ?? 'Relation'}</label>
                            <select
                              value={char.socialProfile?.relationDistance ?? 'colleague'}
                              onChange={e => {
                                const sp: SocialProfile = {
                                  relationDistance: e.target.value as SocialProfile['relationDistance'],
                                  ageRegister: char.socialProfile?.ageRegister ?? 'adult',
                                  explicitness: char.socialProfile?.explicitness ?? 'none',
                                  profanityLevel: char.socialProfile?.profanityLevel ?? 'none',
                                  professionRegister: char.socialProfile?.professionRegister,
                                };
                                setConfig((prev: StoryConfig) => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, socialProfile: sp } : c),
                                }));
                              }}
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
                            >
                              {Object.entries(RELATION_LABELS[appLanguage] ?? RELATION_LABELS.KO).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-tertiary uppercase">{t.socialAge ?? 'Age'}</label>
                            <select
                              value={char.socialProfile?.ageRegister ?? 'adult'}
                              onChange={e => {
                                const sp: SocialProfile = {
                                  relationDistance: char.socialProfile?.relationDistance ?? 'colleague',
                                  ageRegister: e.target.value as SocialProfile['ageRegister'],
                                  explicitness: char.socialProfile?.explicitness ?? 'none',
                                  profanityLevel: char.socialProfile?.profanityLevel ?? 'none',
                                  professionRegister: char.socialProfile?.professionRegister,
                                };
                                setConfig((prev: StoryConfig) => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, socialProfile: sp } : c),
                                }));
                              }}
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
                            >
                              {Object.entries(AGE_LABELS[appLanguage] ?? AGE_LABELS.KO).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-tertiary uppercase">{t.socialProfession ?? 'Profession'}</label>
                            <input
                              value={char.socialProfile?.professionRegister ?? ''}
                              onChange={e => {
                                const sp: SocialProfile = {
                                  relationDistance: char.socialProfile?.relationDistance ?? 'colleague',
                                  ageRegister: char.socialProfile?.ageRegister ?? 'adult',
                                  explicitness: char.socialProfile?.explicitness ?? 'none',
                                  profanityLevel: char.socialProfile?.profanityLevel ?? 'none',
                                  professionRegister: e.target.value,
                                };
                                setConfig((prev: StoryConfig) => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, socialProfile: sp } : c),
                                }));
                              }}
                              placeholder={t.socialProfessionPH ?? 'Soldier, doctor...'}
                              maxLength={100}
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-cyan-500 transition-colors placeholder:text-text-tertiary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-tertiary uppercase">{t.socialExplicitness ?? 'Explicitness'}</label>
                            <select
                              value={char.socialProfile?.explicitness ?? 'none'}
                              onChange={e => {
                                const sp: SocialProfile = {
                                  relationDistance: char.socialProfile?.relationDistance ?? 'colleague',
                                  ageRegister: char.socialProfile?.ageRegister ?? 'adult',
                                  explicitness: e.target.value as SocialProfile['explicitness'],
                                  profanityLevel: char.socialProfile?.profanityLevel ?? 'none',
                                  professionRegister: char.socialProfile?.professionRegister,
                                };
                                setConfig((prev: StoryConfig) => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, socialProfile: sp } : c),
                                }));
                              }}
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
                            >
                              {Object.entries(EXPLICIT_LABELS[appLanguage] ?? EXPLICIT_LABELS.KO).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-tertiary uppercase">{t.socialProfanity ?? 'Profanity'}</label>
                            <select
                              value={char.socialProfile?.profanityLevel ?? 'none'}
                              onChange={e => {
                                const sp: SocialProfile = {
                                  relationDistance: char.socialProfile?.relationDistance ?? 'colleague',
                                  ageRegister: char.socialProfile?.ageRegister ?? 'adult',
                                  explicitness: char.socialProfile?.explicitness ?? 'none',
                                  profanityLevel: e.target.value as SocialProfile['profanityLevel'],
                                  professionRegister: char.socialProfile?.professionRegister,
                                };
                                setConfig((prev: StoryConfig) => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, socialProfile: sp } : c),
                                }));
                              }}
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
                            >
                              {Object.entries(PROFANITY_LABELS[appLanguage] ?? PROFANITY_LABELS.KO).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 한 줄 요약 공식 (스튜디오 제안) */}
                    {(char.desire || char.deficiency || char.conflict) && (
                      <div className="mb-4 p-3 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
                        <span className="text-[10px] font-black text-accent-purple/60 uppercase tracking-widest">{t.formulaLabel}</span>
                        <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
                          {appLanguage === 'KO'
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
                          <CompletionBar score={score} language={appLanguage} />
                          <WarningBadge warnings={warnings} language={appLanguage} />
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500/50" />
                          <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{L4(language, { ko: '개성 (고유도)', en: 'Individuality', ja: '個性（固有度）', zh: '个性（独特度）' })}</span>
                       </div>
                       <span className="text-[11px] font-mono text-accent-blue font-black">{char.dna}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Fix #7: Pagination controls */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-4" aria-label={appLanguage === 'KO' ? '캐릭터 목록 페이지네이션' : 'Character list pagination'}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label={appLanguage === 'KO' ? '이전 페이지' : 'Previous page'}
                  className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-[opacity,background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  {appLanguage === 'KO' ? '이전' : 'Prev'}
                </button>
                <span className="text-[10px] font-bold text-text-tertiary font-mono" aria-live="polite" aria-label={appLanguage === 'KO' ? `${currentPage} / ${totalPages} 페이지` : `Page ${currentPage} of ${totalPages}`}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label={appLanguage === 'KO' ? '다음 페이지' : 'Next page'}
                  className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-[opacity,background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  {appLanguage === 'KO' ? '다음' : 'Next'}
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* ====== CHARACTER RELATIONSHIP MAP ====== */}
      {config.characters.length >= 2 && (
        <CharRelationMap language={appLanguage} config={config} setConfig={setConfig} />
      )}

      {/* Mobile-only spacer for bottom nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default ResourceView;

