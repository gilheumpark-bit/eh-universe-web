import React from 'react';
import { Briefcase, ChevronDown, ChevronLeft, ChevronUp, Dna, ScrollText, UserCircle, UserPlus } from 'lucide-react';
import { getStudioTranslations, L4 } from '@/lib/i18n';
import type { AppLanguage, Character } from '@/lib/studio-types';
import { FieldBadge } from './ResourceView.FieldBadge';

type ResourceLabels = ReturnType<typeof getStudioTranslations>['resource'];

export function CharacterCreatorPanel({
  language,
  appLanguage,
  isPanelOpen,
  setIsPanelOpen,
  t,
  roleLabels,
  newChar,
  setNewChar,
  nameError,
  setNameError,
  creatorDnaOpen,
  setCreatorDnaOpen,
  addCharacter,
}: {
  language: AppLanguage;
  appLanguage: AppLanguage;
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  t: ResourceLabels;
  roleLabels: Array<{ value: string; label: string }>;
  newChar: Partial<Character>;
  setNewChar: React.Dispatch<React.SetStateAction<Partial<Character>>>;
  nameError: boolean;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
  creatorDnaOpen: boolean;
  setCreatorDnaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addCharacter: () => void;
}) {
  return (
    <div className={`w-full lg:shrink-0 transition-opacity duration-500 ease-in-out ${isPanelOpen ? 'lg:w-80 opacity-100' : 'lg:w-0 opacity-0 lg:-translate-x-10'}`}>
      <div className="bg-bg-secondary/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent-blue" /> {t.creator}
          </h3>
          <button
            onClick={() => setIsPanelOpen(false)}
            aria-label="패널 닫기"
            className="lg:hidden p-2 text-text-tertiary hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-[9px] font-black text-text-tertiary uppercase ml-2">{t.name}</span>
              <FieldBadge required language={appLanguage} />
            </div>
            <div className="relative group">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-blue transition-colors" />
              <input
                className={`w-full bg-bg-tertiary/50 border rounded-xl pl-11 pr-4 py-4 text-xs font-bold focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary ${nameError ? 'border-accent-red' : 'border-border'}`}
                placeholder={appLanguage === 'KO' ? '캐릭터 이름...' : appLanguage === 'JP' ? 'キャラクター名...' : appLanguage === 'CN' ? '角色名...' : 'Character name...'}
                maxLength={50}
                value={newChar.name}
                onChange={(event) => {
                  setNewChar({ ...newChar, name: event.target.value });
                  if (nameError) setNameError(false);
                }}
              />
            </div>
            {nameError && (
              <p className="text-[10px] text-accent-red font-bold ml-2">
                {appLanguage === 'KO' ? '이름을 입력해 주세요' : 'Name is required'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-[9px] font-black text-text-tertiary uppercase ml-2">{t.role}</span>
              <FieldBadge required language={appLanguage} />
            </div>
            <div className="relative group">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <select
                className="w-full bg-bg-tertiary/50 border border-border rounded-xl pl-11 pr-4 py-4 text-xs font-bold focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 appearance-none cursor-pointer"
                value={newChar.role}
                onChange={(event) => setNewChar({ ...newChar, role: event.target.value })}
              >
                {roleLabels.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-black text-text-tertiary uppercase ml-2">{t.traits}</span>
            <div className="relative">
              <ScrollText className="absolute left-4 top-4 w-4 h-4 text-text-tertiary" />
              <textarea
                className="w-full bg-bg-tertiary/50 border border-border rounded-xl pl-11 pr-4 py-4 text-xs min-h-[140px] focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 resize-none leading-relaxed"
                placeholder={appLanguage === 'KO' ? '특성, 배경, 말투...' : appLanguage === 'JP' ? '特性、背景、口調...' : appLanguage === 'CN' ? '特征、背景、语气...' : 'Traits, background, dialect...'}
                maxLength={500}
                value={newChar.traits}
                onChange={(event) => setNewChar({ ...newChar, traits: event.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={() => setCreatorDnaOpen((value) => !value)}
              aria-expanded={creatorDnaOpen}
              aria-label={L4(language, { ko: '캐릭터 DNA 섹션 토글', en: 'Toggle Character DNA section', ja: 'キャラクター DNA セクション切替', zh: '切换角色 DNA 区块' })}
              className="flex items-center gap-2 w-full text-left min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
            >
              {creatorDnaOpen ? <ChevronUp className="w-3.5 h-3.5 text-accent-purple" /> : <ChevronDown className="w-3.5 h-3.5 text-accent-purple" />}
              <Dna className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-[9px] font-black text-accent-purple uppercase tracking-widest">
                {t.tier1DNA ?? L4(language, { ko: '캐릭터 DNA', en: 'Character DNA', ja: 'キャラクター DNA', zh: '角色 DNA' })}
              </span>
              <FieldBadge required={false} language={appLanguage} />
            </button>
            <p className="text-[9px] text-text-quaternary ml-8 -mt-1 mb-2">
              {t.tier1Desc ?? L4(language, { ko: '캐릭터의 서사적 핵심을 정의합니다', en: 'Define the narrative core of the character', ja: '物語の核心を定義', zh: '定义叙事核心' })}
            </p>
            {creatorDnaOpen && (
              <div className="space-y-2 ml-1">
                <input
                  className="w-full bg-bg-tertiary/50 border border-border rounded-xl px-4 py-3 text-xs focus:border-accent-purple outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary"
                  placeholder={t.desirePH ?? L4(language, { ko: '예: 세계 최고의 검사가 되고 싶다', en: 'e.g. Become the greatest swordsman', ja: '例: 最強の剣士になりたい', zh: '例: 成为世界最强的剑客' })}
                  maxLength={200}
                  value={newChar.desire ?? ''}
                  onChange={(event) => setNewChar({ ...newChar, desire: event.target.value })}
                />
                <input
                  className="w-full bg-bg-tertiary/50 border border-border rounded-xl px-4 py-3 text-xs focus:border-accent-amber outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary"
                  placeholder={t.deficiencyPH ?? L4(language, { ko: '예: 타인을 믿지 못하는 성격', en: 'e.g. Unable to trust others', ja: '例: 他人を信じられない性格', zh: '例: 无法信任他人的性格' })}
                  maxLength={200}
                  value={newChar.deficiency ?? ''}
                  onChange={(event) => setNewChar({ ...newChar, deficiency: event.target.value })}
                />
                <input
                  className="w-full bg-bg-tertiary/50 border border-border rounded-xl px-4 py-3 text-xs focus:border-accent-red outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary"
                  placeholder={t.conflictPH ?? L4(language, { ko: '예: 복수심과 우정 사이의 갈등', en: 'e.g. Torn between revenge and friendship', ja: '例: 復讐と友情の間の葛藤', zh: '例: 复仇与友谊之间的矛盾' })}
                  maxLength={200}
                  value={newChar.conflict ?? ''}
                  onChange={(event) => setNewChar({ ...newChar, conflict: event.target.value })}
                />
                <input
                  className="w-full bg-bg-tertiary/50 border border-border rounded-xl px-4 py-3 text-xs focus:border-accent-green outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary"
                  placeholder={t.changeArcPH ?? L4(language, { ko: '예: 복수에서 용서로', en: 'e.g. From revenge to forgiveness', ja: '例: 復讐から許しへ', zh: '例: 从复仇到宽恕' })}
                  maxLength={200}
                  value={newChar.changeArc ?? ''}
                  onChange={(event) => setNewChar({ ...newChar, changeArc: event.target.value })}
                />
                <input
                  className="w-full bg-bg-tertiary/50 border border-border rounded-xl px-4 py-3 text-xs focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors placeholder:text-text-tertiary"
                  placeholder={t.valuesPH ?? L4(language, { ko: '예: 강함이 곧 정의', en: 'e.g. Strength equals justice', ja: '例: 強さこそ正義', zh: '例: 力量就是正义' })}
                  maxLength={200}
                  value={newChar.values ?? ''}
                  onChange={(event) => setNewChar({ ...newChar, values: event.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-[9px] font-black text-text-tertiary uppercase tracking-widest">
              <span>{L4(language, { ko: '개성 (고유도)', en: 'Individuality', ja: '個性（固有度）', zh: '个性（独特度）' })}</span>
              <span className="text-accent-blue">{newChar.dna} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full accent-accent-blue h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
              value={newChar.dna}
              onChange={(event) => setNewChar({ ...newChar, dna: parseInt(event.target.value) })}
            />
          </div>

          <button
            onClick={addCharacter}
            className="w-full py-4 bg-accent-amber rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-accent-amber/80 transition-[transform,background-color,border-color,color] shadow-xl active:scale-95 text-[#1a1a1a]"
          >
            {t.register}
          </button>
        </div>
      </div>
    </div>
  );
}
