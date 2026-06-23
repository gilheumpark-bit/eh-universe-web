import React from 'react';
import { ChevronDown, ChevronUp, Dna, ScrollText, Settings2, Trash2, Zap } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, Character, StoryConfig, SocialProfile } from '@/lib/studio-types';
import { calcCompletionScore, CompletionBar, validateCharacter, WarningBadge } from './TierValidator';
import { FieldBadge } from './ResourceView.FieldBadge';
import { SocialProfilePanel } from './ResourceView.SocialProfilePanel';

type ResourceLabels = {
  tier1DNA?: string;
  tier1?: string;
  tier2Link?: string;
  tier2?: string;
  desirePH?: string;
  deficiencyPH?: string;
  conflictPH?: string;
  valuesPH?: string;
  changeArcPH?: string;
  formulaLabel?: string;
  socialProfile?: string;
  socialAdvanced?: string;
  socialRelation?: string;
  socialAge?: string;
  socialProfession?: string;
  socialProfessionPH?: string;
  socialExplicitness?: string;
  socialProfanity?: string;
};

export type ExpandedTierState = Record<string, { t2?: boolean; t3?: boolean }>;

interface CharacterCardProps {
  appLanguage: AppLanguage;
  character: Character;
  expandedSocialPanels: Record<string, boolean>;
  expandedTiers: ExpandedTierState;
  getRoleLabel: (role: string) => string;
  language: AppLanguage;
  resourceLabels: ResourceLabels;
  roleLabels: Array<{ value: string; label: string }>;
  removeCharacter: (id: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  setExpandedSocialPanels: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setExpandedTiers: React.Dispatch<React.SetStateAction<ExpandedTierState>>;
}

function roleToneClass(role: string): string {
  if (role === 'hero') return 'bg-accent-purple';
  if (role === 'villain') return 'bg-accent-red';
  if (role === 'ally') return 'bg-accent-amber';
  return 'bg-text-tertiary';
}

export function CharacterCard({
  appLanguage,
  character,
  expandedSocialPanels,
  expandedTiers,
  getRoleLabel,
  language,
  resourceLabels,
  roleLabels,
  removeCharacter,
  setConfig,
  setExpandedSocialPanels,
  setExpandedTiers,
}: CharacterCardProps) {
  const warnings = validateCharacter(character, language);
  const compactScore = calcCompletionScore(warnings, 6);
  const detailedScore = calcCompletionScore(warnings, 13);

  const updateCharacter = (patch: Partial<Character>) => {
    setConfig((previousConfig: StoryConfig) => ({
      ...previousConfig,
      characters: previousConfig.characters.map((currentCharacter) => (
        currentCharacter.id === character.id ? { ...currentCharacter, ...patch } : currentCharacter
      )),
    }));
  };

  const toggleTier = (tier: 't2' | 't3') => {
    setExpandedTiers((previousTiers) => ({
      ...previousTiers,
      [character.id]: {
        ...previousTiers[character.id],
        [tier]: !previousTiers[character.id]?.[tier],
      },
    }));
  };

  const updateSocialProfile = (socialProfile: SocialProfile) => {
    updateCharacter({ socialProfile });
  };

  return (
    <div className="relative group overflow-hidden bg-bg-secondary/60 backdrop-blur-xl border border-border/40 hover:border-accent-purple/40 rounded-2xl p-6 transition-colors hover-lift">
      <progress
        className="resource-dna-progress"
        max={100}
        value={Math.max(0, Math.min(100, character.dna ?? 0))}
        aria-label={L4(language, {
          ko: `${character.name} 고유도`,
          en: `${character.name} individuality`,
          ja: `${character.name} 固有度`,
          zh: `${character.name} 独特度`,
        })}
      />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-border/30" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent-purple"
                strokeDasharray={`${compactScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 bg-accent-purple/15 rounded-2xl flex items-center justify-center text-accent-purple font-black border border-accent-purple/30 text-xl group-hover:scale-110 transition-transform duration-500">
              {character.name[0]}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-bg-primary border border-border/60 rounded-full px-1.5 py-0.5 text-[8px] font-mono font-bold text-accent-purple opacity-0 group-hover:opacity-100 transition-opacity">
              {compactScore}%
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base font-black text-text-primary truncate mb-0.5">{character.name}</div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${roleToneClass(character.role)}`}></div>
              <select
                value={character.role}
                onChange={(event) => updateCharacter({ role: event.target.value })}
                className="resource-role-select bg-transparent text-[10px] font-black text-text-tertiary uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer hover:text-text-secondary transition-colors appearance-none pr-3"
              >
                {roleLabels.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          onClick={() => removeCharacter(character.id)}
          aria-label="삭제"
          className="p-2.5 text-text-tertiary hover:text-accent-red transition-[opacity,background-color,border-color,color] opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-bg-tertiary/30 border-l-2 border-accent-purple/40 rounded-r-xl p-4 mb-4 relative group/traits z-10">
        <ScrollText className="absolute top-4 right-4 w-3.5 h-3.5 text-text-quaternary" />
        <p className="text-[13px] text-text-secondary font-serif leading-relaxed italic line-clamp-4 min-h-[4rem]">
          {character.traits}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <input
          value={character.personality || ''}
          onChange={(event) => updateCharacter({ personality: event.target.value })}
          placeholder={appLanguage === 'KO' ? '성격 (예: 냉소적이지만 내면은 따뜻함)' : 'Personality (e.g. cynical but warm inside)'}
          maxLength={200}
          className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
        />
        <input
          value={character.speechStyle || ''}
          onChange={(event) => updateCharacter({ speechStyle: event.target.value })}
          placeholder={appLanguage === 'KO' ? '억양/말투 (예: 반말, 짧은 문장, 냉담한 톤)' : 'Speech style (e.g. informal, short sentences, cold tone)'}
          maxLength={200}
          className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
        />
        <input
          value={character.speechExample || ''}
          onChange={(event) => updateCharacter({ speechExample: event.target.value })}
          placeholder={appLanguage === 'KO' ? '대사 예시 (예: "...그래서 뭐 어쩌라고.")' : 'Example dialogue (e.g. "...so what do you want me to do.")'}
          maxLength={300}
          className="w-full bg-bg-tertiary/30 border border-border/50 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary font-serif italic"
        />
      </div>

      <div className="space-y-2 mb-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Dna className="w-3.5 h-3.5 text-accent-purple" />
          <span className="text-[10px] font-black text-accent-purple uppercase tracking-widest">{resourceLabels.tier1DNA ?? resourceLabels.tier1}</span>
          <FieldBadge required={false} language={appLanguage} />
        </div>
        <input
          value={character.desire || ''}
          onChange={(event) => updateCharacter({ desire: event.target.value })}
          placeholder={resourceLabels.desirePH}
          maxLength={200}
          className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
        />
        <input
          value={character.deficiency || ''}
          onChange={(event) => updateCharacter({ deficiency: event.target.value })}
          placeholder={resourceLabels.deficiencyPH}
          maxLength={200}
          className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
        />
        <input
          value={character.conflict || ''}
          onChange={(event) => updateCharacter({ conflict: event.target.value })}
          placeholder={resourceLabels.conflictPH}
          maxLength={200}
          className="w-full bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={character.values || ''}
            onChange={(event) => updateCharacter({ values: event.target.value })}
            placeholder={resourceLabels.valuesPH}
            maxLength={200}
            className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
          />
          <input
            value={character.changeArc || ''}
            onChange={(event) => updateCharacter({ changeArc: event.target.value })}
            placeholder={resourceLabels.changeArcPH}
            maxLength={200}
            className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-blue transition-colors placeholder:text-text-tertiary"
          />
        </div>
      </div>

      <div className="mb-4 pt-2 border-t border-amber-500/10">
        <button
          type="button"
          onClick={() => toggleTier('t2')}
          aria-expanded={!!expandedTiers[character.id]?.t2}
          aria-label={L4(language, { ko: `${character.name ?? '캐릭터'} 2단계 섹션 토글`, en: `Toggle Tier 2 section for ${character.name ?? 'character'}`, ja: `${character.name ?? 'キャラクター'} 2段階切替`, zh: `切换 ${character.name ?? '角色'} 第 2 层级` })}
          className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1.5 text-amber-500/60 hover:text-amber-400 transition-colors mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
        >
          {expandedTiers[character.id]?.t2 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <Settings2 className="w-3 h-3" />
          {resourceLabels.tier2Link ?? resourceLabels.tier2}
        </button>
        {expandedTiers[character.id]?.t2 && (
          <div className="space-y-2">
            <input
              value={character.strength || ''}
              onChange={(event) => updateCharacter({ strength: event.target.value })}
              placeholder={appLanguage === 'KO' ? '강점 (예: 뛰어난 관찰력)' : 'Strength (e.g. keen observation)'}
              maxLength={200}
              className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.weakness || ''}
              onChange={(event) => updateCharacter({ weakness: event.target.value })}
              placeholder={appLanguage === 'KO' ? '약점 (예: 타인을 믿지 못함)' : 'Weakness (e.g. inability to trust)'}
              maxLength={200}
              className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
            />
            <textarea
              value={character.backstory || ''}
              onChange={(event) => updateCharacter({ backstory: event.target.value })}
              rows={2}
              placeholder={appLanguage === 'KO' ? '과거 - 현재를 만든 사건' : 'Backstory - the event that shaped them'}
              maxLength={1000}
              className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary resize-none"
            />
            <input
              value={character.failureCost || ''}
              onChange={(event) => updateCharacter({ failureCost: event.target.value })}
              placeholder={appLanguage === 'KO' ? '실패 대가 (예: 가족을 잃는다)' : 'Failure cost (e.g. loses family)'}
              maxLength={200}
              className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.currentProblem || ''}
              onChange={(event) => updateCharacter({ currentProblem: event.target.value })}
              placeholder={appLanguage === 'KO' ? '현재 문제 (예: 조직의 배신자 색출)' : 'Current problem (e.g. finding the traitor)'}
              maxLength={200}
              className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-amber-500 transition-colors placeholder:text-text-tertiary"
            />
          </div>
        )}
      </div>

      <div className="mb-4 pt-2 border-t border-emerald-500/10">
        <button
          type="button"
          onClick={() => toggleTier('t3')}
          aria-expanded={!!expandedTiers[character.id]?.t3}
          aria-label={L4(language, { ko: `${character.name ?? '캐릭터'} 3단계 섹션 토글`, en: `Toggle Tier 3 section for ${character.name ?? 'character'}`, ja: `${character.name ?? 'キャラクター'} 3段階切替`, zh: `切换 ${character.name ?? '角色'} 第 3 层级` })}
          className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-1 text-emerald-500/60 hover:text-emerald-400 transition-colors mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
        >
          {expandedTiers[character.id]?.t3 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {appLanguage === 'KO' ? '3단계 - 디테일' : 'Tier 3 - Detail'}
        </button>
        {expandedTiers[character.id]?.t3 && (
          <div className="space-y-2">
            <input
              value={character.emotionStyle || ''}
              onChange={(event) => updateCharacter({ emotionStyle: event.target.value })}
              placeholder={appLanguage === 'KO' ? '감정 표현 방식 (예: 웃으면서 우는 타입)' : 'Emotion style (e.g. smiles while crying)'}
              maxLength={200}
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.relationPattern || ''}
              onChange={(event) => updateCharacter({ relationPattern: event.target.value })}
              placeholder={appLanguage === 'KO' ? '관계 패턴 (예: 밀당, 의존형)' : 'Relation pattern (e.g. push-pull, dependent)'}
              maxLength={200}
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.symbol || ''}
              onChange={(event) => updateCharacter({ symbol: event.target.value })}
              placeholder={appLanguage === 'KO' ? '상징 요소 (예: 항상 끼고 있는 반지)' : 'Symbol (e.g. a ring they always wear)'}
              maxLength={200}
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.secret || ''}
              onChange={(event) => updateCharacter({ secret: event.target.value })}
              placeholder={appLanguage === 'KO' ? '비밀 요소 (예: 과거에 사람을 죽인 적 있음)' : 'Secret (e.g. once killed someone)'}
              maxLength={200}
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
            />
            <input
              value={character.externalPerception || ''}
              onChange={(event) => updateCharacter({ externalPerception: event.target.value })}
              placeholder={appLanguage === 'KO' ? '타인이 보는 인상 (예: 차갑고 무관심해 보임)' : 'External perception (e.g. seems cold and indifferent)'}
              maxLength={200}
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-emerald-500 transition-colors placeholder:text-text-tertiary"
            />
          </div>
        )}
      </div>

      <SocialProfilePanel
        appLanguage={appLanguage}
        character={character}
        isExpanded={Boolean(expandedSocialPanels[character.id])}
        labels={resourceLabels}
        onChange={updateSocialProfile}
        onToggle={() => {
          setExpandedSocialPanels((previousPanels) => ({
            ...previousPanels,
            [character.id]: !previousPanels[character.id],
          }));
        }}
      />

      {(character.desire || character.deficiency || character.conflict) && (
        <div className="mb-4 p-3 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
          <span className="text-[10px] font-black text-accent-purple/60 uppercase tracking-widest">{resourceLabels.formulaLabel}</span>
          <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
            {appLanguage === 'KO'
              ? `${character.name}은(는) ${getRoleLabel(character.role)} 역할로, ${character.desire || '___'}을(를) 원하며, ${character.deficiency || '___'}이(가) 부족하고, ${character.conflict || '___'} 때문에 갈등하며, ${character.changeArc || '___'}(으)로 변한다.`
              : `${character.name} serves as ${getRoleLabel(character.role)}, wants ${character.desire || '___'}, lacks ${character.deficiency || '___'}, conflicts over ${character.conflict || '___'}, and transforms into ${character.changeArc || '___'}.`
            }
          </p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        <CompletionBar score={detailedScore} language={appLanguage} />
        <WarningBadge warnings={warnings} language={appLanguage} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500/50" />
          <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{L4(language, { ko: '개성 (고유도)', en: 'Individuality', ja: '個性（固有度）', zh: '个性（独特度）' })}</span>
        </div>
        <span className="text-[11px] font-mono text-accent-blue font-black">{character.dna}%</span>
      </div>
    </div>
  );
}
