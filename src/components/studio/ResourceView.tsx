import React, { useMemo, useState } from 'react';
import { Fingerprint, Sparkles, UserPlus, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStudioUI } from '@/contexts/StudioContext';
import { getStudioTranslations, L4, normalizeAppLanguage } from '@/lib/i18n';
import type { AppLanguage, Character, StoryConfig } from '@/lib/studio-types';
import { CharRelationMap } from './ResourceView.CharRelationMap';
import { CharacterCard, type ExpandedTierState } from './ResourceView.CharacterCard';
import { CharacterCreatorPanel } from './ResourceView.CharacterCreatorPanel';

interface ResourceViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onError?: (message: string) => void;
}

const ROLE_KEYS = ['hero', 'villain', 'ally', 'extra'] as const;
const PAGE_SIZE = 20;

const ResourceView: React.FC<ResourceViewProps> = ({ language, config, setConfig, onError: _onError }) => {
  const { showConfirm, closeConfirm } = useStudioUI();
  const appLanguage = normalizeAppLanguage(language);
  const resourceLabels = getStudioTranslations(appLanguage).resource;
  const engineLabels = getStudioTranslations(appLanguage).engine;
  const [activeCategory, setActiveCategory] = useState('all');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<ExpandedTierState>({});
  const [expandedSocialPanels, setExpandedSocialPanels] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [nameError, setNameError] = useState(false);
  const [creatorDnaOpen, setCreatorDnaOpen] = useState(true);
  const [newChar, setNewChar] = useState<Partial<Character>>({
    name: '',
    role: 'hero',
    traits: '',
    appearance: '',
    dna: 50,
  });

  const roleLabels = ROLE_KEYS.map((key) => ({
    value: key,
    label: engineLabels.roles[key],
  }));

  const filteredCharacters = useMemo(() => {
    if (activeCategory === 'all') return config.characters;
    return config.characters.filter((character) => character.role === activeCategory);
  }, [config.characters, activeCategory]);

  const totalPages = Math.ceil(filteredCharacters.length / PAGE_SIZE);
  const paginatedCharacters = filteredCharacters.length > PAGE_SIZE
    ? filteredCharacters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredCharacters;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const getRoleLabel = (role: string) => {
    const found = roleLabels.find((roleLabel) => roleLabel.value === role);
    return found ? found.label : role;
  };

  const addCharacter = () => {
    if (!newChar.name || !newChar.name.trim()) {
      setNameError(true);
      return;
    }

    setNameError(false);
    const character: Character = {
      id: `c-manual-${Date.now()}`,
      name: newChar.name,
      role: newChar.role || 'hero',
      traits: newChar.traits || '',
      appearance: newChar.appearance || '',
      dna: newChar.dna ?? 50,
      ...(newChar.desire ? { desire: newChar.desire } : {}),
      ...(newChar.deficiency ? { deficiency: newChar.deficiency } : {}),
      ...(newChar.conflict ? { conflict: newChar.conflict } : {}),
      ...(newChar.changeArc ? { changeArc: newChar.changeArc } : {}),
      ...(newChar.values ? { values: newChar.values } : {}),
    };

    setConfig({ ...config, characters: [...config.characters, character] });
    setNewChar({ name: '', role: 'hero', traits: '', appearance: '', dna: 50 });
  };

  const removeCharacter = (id: string) => {
    const characterName = config.characters.find((character) => character.id === id)?.name ?? '';
    showConfirm({
      title: L4(language, { ko: '캐릭터 삭제', en: 'Delete Character', ja: 'キャラクター削除', zh: '删除角色' }),
      message: L4(language, {
        ko: `'${characterName}' 캐릭터를 삭제할까요? 되돌릴 수 없습니다.`,
        en: `Delete character '${characterName}'? This cannot be undone.`,
        ja: `'${characterName}' キャラクターを削除しますか? 元に戻せません。`,
        zh: `删除角色 '${characterName}' 吗? 此操作不可恢复。`,
      }),
      variant: 'danger',
      confirmLabel: L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' }),
      cancelLabel: L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
      onConfirm: () => {
        setConfig({ ...config, characters: config.characters.filter((character) => character.id !== id) });
        closeConfirm();
      },
    });
  };

  const focusCharacterNameInput = () => {
    setIsPanelOpen(true);
    setTimeout(() => {
      const nameInput = document.querySelector<HTMLInputElement>(
        'input[data-testid="new-character-name"], input[name="newCharacterName"]',
      );
      nameInput?.focus();
    }, 50);
  };

  const focusAiSuggestionButton = () => {
    const generateButton = document.querySelector<HTMLButtonElement>(
      'button[data-testid="character-ai-generate"]',
    );
    if (generateButton) {
      generateButton.focus();
      generateButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsPanelOpen(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full p-4 md:p-10 space-y-8 lg:space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-accent-purple/10 border border-accent-purple/20 backdrop-blur-sm p-4 rounded-2xl">
        <div className="flex items-center gap-4 md:gap-6 w-full">
          <div className="p-4 md:p-5 bg-accent-purple/15 border border-accent-purple/30 rounded-2xl shrink-0">
            <Fingerprint className="w-6 h-6 md:w-8 md:h-8 text-accent-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase truncate text-text-primary">{resourceLabels.title}</h2>
            <p className="text-text-secondary text-[10px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.4em] uppercase truncate">{resourceLabels.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start relative">
        <CharacterCreatorPanel
          language={language}
          appLanguage={appLanguage}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
          t={resourceLabels}
          roleLabels={roleLabels}
          newChar={newChar}
          setNewChar={setNewChar}
          nameError={nameError}
          setNameError={setNameError}
          creatorDnaOpen={creatorDnaOpen}
          setCreatorDnaOpen={setCreatorDnaOpen}
          addCharacter={addCharacter}
        />

        <div className="flex-1 min-w-0 w-full space-y-6">
          <div className="flex items-center gap-4">
            {!isPanelOpen && (
              <button
                onClick={() => setIsPanelOpen(true)}
                className="hidden lg:flex items-center gap-2 px-5 py-3 bg-bg-secondary border border-border rounded-xl text-[10px] font-black text-text-secondary hover:text-white transition-colors uppercase tracking-widest"
              >
                <UserPlus className="w-3.5 h-3.5 text-accent-blue" /> {resourceLabels.creator}
              </button>
            )}

            <div className="flex-1 flex items-center gap-2 bg-bg-primary/50 p-1.5 rounded-2xl border border-border overflow-x-auto custom-scrollbar" role="tablist">
              {[{ value: 'all', label: 'All Characters' }, ...roleLabels].map((category) => (
                <button
                  key={category.value}
                  role="tab"
                  aria-selected={activeCategory === category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-[transform,opacity,background-color,border-color,color] whitespace-nowrap ${
                    activeCategory === category.value ? 'bg-bg-tertiary text-white shadow-lg ring-1 ring-white/10' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {category.label}
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
                      onClick: focusCharacterNameInput,
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
                      onClick: focusAiSuggestionButton,
                    },
                  ]}
                />
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 transition-[transform,opacity,background-color,border-color,color] duration-500 ${
                isPanelOpen ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}>
                {paginatedCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    appLanguage={appLanguage}
                    character={character}
                    expandedSocialPanels={expandedSocialPanels}
                    expandedTiers={expandedTiers}
                    getRoleLabel={getRoleLabel}
                    language={language}
                    resourceLabels={resourceLabels}
                    roleLabels={roleLabels}
                    removeCharacter={removeCharacter}
                    setConfig={setConfig}
                    setExpandedSocialPanels={setExpandedSocialPanels}
                    setExpandedTiers={setExpandedTiers}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-4" aria-label={appLanguage === 'KO' ? '캐릭터 목록 페이지네이션' : 'Character list pagination'}>
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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

      {config.characters.length >= 2 && (
        <CharRelationMap language={appLanguage} config={config} setConfig={setConfig} />
      )}

      <div className="h-20 md:hidden" />
    </div>
  );
};

export default ResourceView;
