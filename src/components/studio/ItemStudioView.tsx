// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  Item, Skill, MagicSystem, ItemRarity, ItemCategory,
  StoryConfig, AppLanguage,
} from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import {
  Sword, Shield, Sparkles, Zap, ScrollText, Plus, Trash2,
  BarChart3, Loader2, ChevronDown, ChevronUp, Package, Wand2,
} from 'lucide-react';
import { generateItems } from '@/services/geminiService';

// ============================================================
// PART 1 — CONSTANTS & LABELS
// ============================================================

const RARITY_CONFIG: Record<ItemRarity, { tKey: string; color: string; bg: string }> = {
  common:    { tKey: 'itemStudio.rarityCommon',    color: '#9ca3af', bg: 'bg-gray-500/10' },
  uncommon:  { tKey: 'itemStudio.rarityUncommon',  color: '#22c55e', bg: 'bg-green-500/10' },
  rare:      { tKey: 'itemStudio.rarityRare',      color: '#3b82f6', bg: 'bg-blue-500/10' },
  epic:      { tKey: 'itemStudio.rarityEpic',      color: '#a855f7', bg: 'bg-purple-500/10' },
  legendary: { tKey: 'itemStudio.rarityLegendary', color: '#f59e0b', bg: 'bg-amber-500/10' },
  mythic:    { tKey: 'itemStudio.rarityMythic',    color: '#ef4444', bg: 'bg-red-500/10' },
};

const CATEGORY_CONFIG: Record<ItemCategory, { tKey: string; icon: React.ElementType }> = {
  weapon:     { tKey: 'itemStudio.categoryWeapon',     icon: Sword },
  armor:      { tKey: 'itemStudio.categoryArmor',      icon: Shield },
  accessory:  { tKey: 'itemStudio.categoryAccessory',  icon: Sparkles },
  consumable: { tKey: 'itemStudio.categoryConsumable',  icon: Zap },
  material:   { tKey: 'itemStudio.categoryMaterial',    icon: Package },
  quest:      { tKey: 'itemStudio.categoryQuest',       icon: ScrollText },
  misc:       { tKey: 'itemStudio.categoryMisc',        icon: Package },
};

const SKILL_TYPES = [
  { value: 'active' as const, tKey: 'itemStudio.skillTypeActive' },
  { value: 'passive' as const, tKey: 'itemStudio.skillTypePassive' },
  { value: 'ultimate' as const, tKey: 'itemStudio.skillTypeUltimate' },
];

// ============================================================
// PART 1B — EH UNIVERSE REFERENCE PRESETS
// ============================================================

const PRESET_MAGIC_SYSTEMS: MagicSystem[] = [
  {
    id: 'preset-eh-force',
    name: '존재력 (Existence Heft)',
    source: '생명체 내부 근원 에너지 — 세계와의 공명으로 발현',
    rules: '체내 존재력을 압축·방출하여 전투에 활용. 수련과 전투 경험으로 성장. 검술(내부 밀도 강화)과 마법(외부 마나 조작)으로 분기.',
    limitations: '과다 사용 시 의식 상실. 4파동 후반부터 불안정, 5파동 미완성 시 폭주 위험(주변 파괴). GH 달성 후 안정화.',
    ranks: ['1파동 — 일반인', '2파동 — 숙련 전사', '3파동 — 상위 기사', '4파동 — 왕국급 전력', '5파동(GH) — 세계 공명 완성'],
  },
  {
    id: 'preset-divine-force',
    name: '신성력 (Divine Force)',
    source: '성녀 전용 감정 기반 에너지 — 소환 시 자동 부여',
    rules: '감정 상태와 직결. 사랑·신뢰로 증가, 공포·분노로 감소. 치유·정화·결계 발현. 권위(Authority) 능력은 세계 법칙 예외 코드.',
    limitations: '과다 사용 시 인간성 감소·감정 둔화. 분노 극한 시 성력 폭주. 권위 명령은 마족에게 무효.',
    ranks: ['1급 — 기본 치유 (10m)', '2급 — 집단 치유 (50m)', '3급 — 정화 능력', '4급 — 신성 결계', '5급 — 권위 완전 각성'],
  },
  {
    id: 'preset-eh-heart',
    name: 'EH (Error Heart)',
    source: '결정론적 계산에서 발생하는 의미 잔차 — 예측 불가 선택에서 생성',
    rules: '측정 가능하나 역산·재현 불가. 은하계 기축통화(단위: Hart). Type A(감정형/높은 강도), Type B(윤리형/장기 지속), Type C(존재형/극희귀).',
    limitations: '복제 지구 유지비가 EH 수입 초과 시 파산. 일부 개체 매매 금지. NOA 안드로이드는 EH=0 환경에서 부팅 불가.',
    ranks: ['Type A — 순수 감정형', 'Type B — 윤리적', 'Type C — 존재형·창의적'],
  },
  {
    id: 'preset-magic-mana',
    name: '마법 체계 (Mana System)',
    source: '세계에 존재하는 기본 에너지(마나) — 체내 마나 코어에서 발현',
    rules: '원소(화·수·풍·토), 강화, 정신계, 소환, 특수의 5분류. 외부 마나 조작이 핵심. 코어 등급에 따라 성장 속도 차이.',
    limitations: '검술과 상호배타(마나 외부 방출 vs 존재력 내부 밀도). 비마법 체계(검술)와 공존하나 동시 사용 불가.',
    ranks: ['1급 — 초급', '3급 — 중급', '5급 — 상급', '7급 — 왕국급 전력', '10급 — 전설급 대마법사'],
  },
];

const PRESET_SKILLS: Skill[] = [
  {
    id: 'preset-skill-wave-sever',
    name: '파동절단 (Wave Sever)',
    type: 'active',
    owner: '민시영',
    description: '존재력을 직선으로 극압축 후 방출하는 대형 베기. 보스급 몬스터 전용 기술.',
    cost: '존재력 대량 소모',
    cooldown: '장기전 불가',
    rank: '4파동+',
  },
  {
    id: 'preset-skill-phantom-step',
    name: '잔영가속 (Phantom Step)',
    type: 'active',
    owner: '민시영',
    description: '체력계 존재력을 극압축하여 초고속 이동. 잔상이 남을 정도의 속도.',
    cost: '체력계 존재력',
    cooldown: '연속 3회 제한',
    rank: '3파동+',
  },
  {
    id: 'preset-skill-resonance-counter',
    name: '공명역베기 (Resonance Counter)',
    type: 'active',
    owner: '민시영',
    description: '상대 파동의 역위상을 포착하여 붕괴시키는 카운터 기술. 파동 자체를 무력화.',
    cost: '정밀 타이밍 필요',
    cooldown: '상대 파동 발현 시에만',
    rank: '4파동+',
  },
  {
    id: 'preset-skill-density-collapse',
    name: '밀도붕괴 (Density Collapse)',
    type: 'ultimate',
    owner: '민시영',
    description: '5파동 미완성 상태에서 공간을 압박하는 위험 기술. 부작용 있음.',
    cost: '5파동 불안정 소모',
    cooldown: '1회성 (부작용 위험)',
    rank: '5파동 미완성',
  },
  {
    id: 'preset-skill-completion',
    name: '완결 (Completion)',
    type: 'ultimate',
    owner: '민시영',
    description: '아크 형태 변환 + 5파동 완전 공명. 존재를 원래 자리로 재정렬(파괴가 아닌 안정화).',
    cost: 'GH 완전 각성 필요',
    cooldown: '최종 비기',
    rank: 'GH (5파동 완성)',
  },
  {
    id: 'preset-skill-authority-kneel',
    name: '권위: 꿇어라',
    type: 'active',
    owner: '이지영',
    description: '성녀의 권위 명령 — 대상을 강제로 무릎 꿇림. 마족에게는 무효.',
    cost: '신성력',
    cooldown: '없음',
    rank: '권위 1단계+',
  },
  {
    id: 'preset-skill-purification',
    name: '정화 (Purification)',
    type: 'active',
    owner: '이지영',
    description: '왜곡된 존재를 정화하는 성녀 전용 능력. 마족 왜곡 제거 가능.',
    cost: '신성력 대량 소모',
    cooldown: '성력 회복 필요',
    rank: '3급+',
  },
];

const PRESET_ITEMS: Item[] = [
  {
    id: 'preset-item-arc-sword',
    name: '민시영의 검 (아크)',
    category: 'weapon',
    rarity: 'legendary',
    description: '아크 형태 변환이 가능한 민시영의 주력 검. 5파동 완전 공명 시 "완결" 발동 매체.',
    effect: '존재력 압축 효율 극대화, 아크 형태 변환',
    obtainedFrom: '이세계 소환 직후 획득',
  },
  {
    id: 'preset-item-divine-vestment',
    name: '성녀복 (Divine Vestment)',
    category: 'armor',
    rarity: 'epic',
    description: '소환 시 자동 변환되는 백색 성녀 의복. 신성력 증폭 효과.',
    effect: '신성력 증폭, 정화 범위 확장',
    obtainedFrom: '성녀 소환 시 자동 부여',
  },
  {
    id: 'preset-item-summoning-circle',
    name: '대성당 소환 마법진',
    category: 'quest',
    rarity: 'mythic',
    description: '루미나 대성당 지하의 성녀 소환용 대형 마법진. 활성화에 3개월 소요.',
    effect: '이세계 성녀 소환 (18~20세 지구인 대상)',
    obtainedFrom: '루미나 대성당 지하',
  },
  {
    id: 'preset-item-mana-core',
    name: '마나 코어 (상급)',
    category: 'material',
    rarity: 'rare',
    description: '마법사의 체내에서 형성되는 마나 결정체. 등급에 따라 성장 속도 결정.',
    effect: '마법 등급 상한 결정, 마나 회복량 증가',
    obtainedFrom: '선천적 보유 또는 던전 보스 드롭',
  },
  {
    id: 'preset-item-eh-token',
    name: 'EH 토큰 (1,000 Hart)',
    category: 'misc',
    rarity: 'uncommon',
    description: '은하계 기축통화 Error Heart의 소액 토큰. 일상 거래용.',
    effect: '은하계 표준 결제 수단',
    obtainedFrom: '예측 불가 선택 수행 시 생성',
  },
  {
    id: 'preset-item-gate-key',
    name: 'Gate 액세스 키',
    category: 'quest',
    rarity: 'epic',
    description: 'HPG 게이트 인프라 접근 권한 키. 광년 단위 도약 이동에 필요.',
    effect: '게이트 v4.7 접근 허가, 최대 27,500광년 점프',
    obtainedFrom: '중앙협의회 발급',
  },
];

type PresetCategory = 'all' | 'magic' | 'skills' | 'items';

function getPresetSummary(): { magic: number; skills: number; items: number } {
  return {
    magic: PRESET_MAGIC_SYSTEMS.length,
    skills: PRESET_SKILLS.length,
    items: PRESET_ITEMS.length,
  };
}

interface ItemStudioViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

type SubTab = 'items' | 'skills' | 'magic' | 'balance';

// ============================================================
// PART 2 — HELPER: BALANCE ANALYSIS
// ============================================================

function analyzeBalance(items: Item[], skills: Skill[], t: (key: string) => string): {
  rarityDist: Record<ItemRarity, number>;
  categoryDist: Record<ItemCategory, number>;
  skillTypeDist: Record<string, number>;
  warnings: string[];
} {
  const rarityDist = {} as Record<ItemRarity, number>;
  const categoryDist = {} as Record<ItemCategory, number>;
  const skillTypeDist = {} as Record<string, number>;
  const warnings: string[] = [];

  for (const item of items) {
    rarityDist[item.rarity] = (rarityDist[item.rarity] ?? 0) + 1;
    categoryDist[item.category] = (categoryDist[item.category] ?? 0) + 1;
  }
  for (const skill of skills) {
    skillTypeDist[skill.type] = (skillTypeDist[skill.type] ?? 0) + 1;
  }

  const legendary = (rarityDist.legendary ?? 0) + (rarityDist.mythic ?? 0);
  const total = items.length;
  if (total > 0 && legendary / total > 0.3) {
    warnings.push(t('itemStudio.warningLegendary'));
  }
  if (total > 5 && !rarityDist.common) {
    warnings.push(t('itemStudio.warningNoCommon'));
  }
  const ultimates = skillTypeDist['ultimate'] ?? 0;
  if (ultimates > 3) {
    warnings.push(t('itemStudio.warningUltimates'));
  }
  if (skills.length > 0) {
    const owners = new Set(skills.map(s => s.owner));
    const avgPerChar = skills.length / owners.size;
    if (avgPerChar > 5) {
      warnings.push(t('itemStudio.warningSkillComplexity').replace('${avg}', avgPerChar.toFixed(1)));
    }
  }

  return { rarityDist, categoryDist, skillTypeDist, warnings };
}

// ============================================================
// PART 3 — MAIN COMPONENT
// ============================================================

const ItemStudioView: React.FC<ItemStudioViewProps> = ({ language, config, setConfig }) => {
  const [subTab, setSubTab] = useState<SubTab>('items');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const t = createT(language);
  const [tierExpanded, setTierExpanded] = useState<Record<string, { t2?: boolean; t3?: boolean }>>({});

  const items = useMemo(() => config.items ?? [], [config.items]);
  const skills = useMemo(() => config.skills ?? [], [config.skills]);
  const magicSystems = config.magicSystems ?? [];

  const setItems = useCallback((fn: (prev: Item[]) => Item[]) =>
    setConfig(prev => ({ ...prev, items: fn(prev.items ?? []) })), [setConfig]);
  const setSkills = useCallback((fn: (prev: Skill[]) => Skill[]) =>
    setConfig(prev => ({ ...prev, skills: fn(prev.skills ?? []) })), [setConfig]);
  const setMagicSystems = useCallback((fn: (prev: MagicSystem[]) => MagicSystem[]) =>
    setConfig(prev => ({ ...prev, magicSystems: fn(prev.magicSystems ?? []) })), [setConfig]);

  // Generic field updater — replaces 14+ individual onChange handlers
  const updateItemField = useCallback((id: string, field: string, value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i)),
  [setItems]);

  // ============================================================
  // PART 3A — ITEM FORM STATE
  // ============================================================
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: '', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '',
  });
  const [itemFilter, setItemFilter] = useState<'all' | ItemCategory>('all');

  const filteredItems = useMemo(() => {
    if (itemFilter === 'all') return items;
    return items.filter(i => i.category === itemFilter);
  }, [items, itemFilter]);

  const addItem = () => {
    if (!newItem.name) return;
    const item: Item = {
      id: `item-${Date.now()}`,
      name: newItem.name ?? '',
      category: (newItem.category ?? 'weapon') as ItemCategory,
      rarity: (newItem.rarity ?? 'common') as ItemRarity,
      description: newItem.description ?? '',
      effect: newItem.effect ?? '',
      obtainedFrom: newItem.obtainedFrom ?? '',
    };
    setItems(prev => [...prev, item]);
    setNewItem({ name: '', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '' });
  };

  // ============================================================
  // PART 3B — SKILL FORM STATE
  // ============================================================
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '', type: 'active', owner: '', description: '', cost: '', cooldown: '', rank: '',
  });

  const addSkill = () => {
    if (!newSkill.name) return;
    const skill: Skill = {
      id: `skill-${Date.now()}`,
      name: newSkill.name ?? '',
      type: (newSkill.type ?? 'active') as 'active' | 'passive' | 'ultimate',
      owner: newSkill.owner ?? '',
      description: newSkill.description ?? '',
      cost: newSkill.cost ?? '',
      cooldown: newSkill.cooldown ?? '',
      rank: newSkill.rank ?? '',
    };
    setSkills(prev => [...prev, skill]);
    setNewSkill({ name: '', type: 'active', owner: '', description: '', cost: '', cooldown: '', rank: '' });
  };

  // ============================================================
  // PART 3C — MAGIC SYSTEM FORM STATE
  // ============================================================
  const [newMagic, setNewMagic] = useState<Partial<MagicSystem>>({
    name: '', source: '', rules: '', limitations: '',
  });
  // const [newRank, setNewRank] = useState(''); // reserved for future rank input UI

  const addMagic = () => {
    if (!newMagic.name) return;
    const magic: MagicSystem = {
      id: `magic-${Date.now()}`,
      name: newMagic.name ?? '',
      source: newMagic.source ?? '',
      rules: newMagic.rules ?? '',
      limitations: newMagic.limitations ?? '',
      ranks: [],
    };
    setMagicSystems(prev => [...prev, magic]);
    setNewMagic({ name: '', source: '', rules: '', limitations: '' });
  };

  // ============================================================
  // PART 3D-0 — PRESET LOADER
  // ============================================================
  const loadPreset = (category: PresetCategory) => {
    const existingIds = new Set([
      ...items.map(i => i.id),
      ...skills.map(s => s.id),
      ...magicSystems.map(m => m.id),
    ]);

    if (category === 'all' || category === 'magic') {
      const newMagics = PRESET_MAGIC_SYSTEMS.filter(m => !existingIds.has(m.id));
      if (newMagics.length > 0) setMagicSystems(prev => [...prev, ...newMagics]);
    }
    if (category === 'all' || category === 'skills') {
      const newSkills = PRESET_SKILLS.filter(s => !existingIds.has(s.id));
      if (newSkills.length > 0) setSkills(prev => [...prev, ...newSkills]);
    }
    if (category === 'all' || category === 'items') {
      const newItems = PRESET_ITEMS.filter(i => !existingIds.has(i.id));
      if (newItems.length > 0) setItems(prev => [...prev, ...newItems]);
    }
    setShowPresetMenu(false);
  };

  // ============================================================
  // PART 3D — AI GENERATION (real API call)
  // ============================================================
  const handleAIGenerate = async () => {
    if (!config.synopsis) {
      alert(t('itemStudio.synopsisRequired'));
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateItems(config, language, 3);
      setItems(prev => [...prev, ...generated]);
    } catch {
      const msg = ({ KO: '아이템 생성 실패. API 키를 확인하세요.', EN: 'Item generation failed. Check API key.', JP: 'アイテム生成に失敗しました。', CN: '物品生成失败。' })[language];
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // PART 4 — SUB-TAB NAV
  // ============================================================
  const subTabs: { key: SubTab; label: string; icon: React.ElementType }[] = [
    { key: 'items', label: t('itemStudio.tabItems'), icon: Sword },
    { key: 'skills', label: t('itemStudio.tabSkills'), icon: Zap },
    { key: 'magic', label: t('itemStudio.tabMagic'), icon: Wand2 },
    { key: 'balance', label: t('itemStudio.tabBalance'), icon: BarChart3 },
  ];

  // ============================================================
  // PART 5 — BALANCE TAB
  // ============================================================
  const balance = useMemo(() => analyzeBalance(items, skills, t), [items, skills, t]);

  // ============================================================
  // PART 6 — RENDER
  // ============================================================
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">
            {t('itemStudio.title')}
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            {t('itemStudio.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Preset Loader */}
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:opacity-80 transition-all"
            >
              <ScrollText className="w-4 h-4" />
              {t('itemStudio.ehPresets')}
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-bg-secondary border border-border rounded-xl shadow-2xl p-2 min-w-[200px]">
                <button onClick={() => loadPreset('all')} className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-accent-purple/20 transition-colors">
                  🌐 {t('itemStudio.loadAll')}
                </button>
                <button onClick={() => loadPreset('magic')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-accent-purple/20 transition-colors">
                  🔮 {`${t('itemStudio.magicSystemsCount')} (${getPresetSummary().magic})`}
                </button>
                <button onClick={() => loadPreset('skills')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-accent-purple/20 transition-colors">
                  ⚡ {`${t('itemStudio.skillsCount')} (${getPresetSummary().skills})`}
                </button>
                <button onClick={() => loadPreset('items')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-accent-purple/20 transition-colors">
                  ⚔️ {`${t('itemStudio.itemsCount')} (${getPresetSummary().items})`}
                </button>
                <div className="border-t border-border mt-1 pt-1">
                  <p className="px-3 py-1 text-[9px] text-text-tertiary">
                    {t('itemStudio.presetNote')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Generate */}
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-xl text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t('itemStudio.aiGenerate')}
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-2">
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === key
                ? 'bg-accent-purple/20 text-accent-purple'
                : 'bg-bg-secondary text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ====== ITEMS TAB ====== */}
      {subTab === 'items' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setItemFilter('all')} aria-pressed={itemFilter === 'all'} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${itemFilter === 'all' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary'}`}>
              {t('itemStudio.filterAll')} ({items.length})
            </button>
            {(Object.keys(CATEGORY_CONFIG) as ItemCategory[]).map(cat => {
              const count = items.filter(i => i.category === cat).length;
              return (
                <button key={cat} onClick={() => setItemFilter(cat)} aria-pressed={itemFilter === cat} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${itemFilter === cat ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary'}`}>
                  {t(CATEGORY_CONFIG[cat].tKey)} ({count})
                </button>
              );
            })}
          </div>

          {/* Item Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
              const cCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.misc;
              const CatIcon = cCfg.icon;
              return (
                <div key={item.id} className={`${rCfg.bg} border border-border rounded-xl p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4" style={{ color: rCfg.color }} />
                      <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: rCfg.color, border: `1px solid ${rCfg.color}40` }}>
                        {t(rCfg.tKey)}
                      </span>
                      <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-text-tertiary hover:text-accent-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
                  {item.effect && <p className="text-[10px] text-accent-purple font-bold">✦ {item.effect}</p>}
                  {item.obtainedFrom && <p className="text-[10px] text-text-tertiary">📍 {item.obtainedFrom}</p>}
                  {/* 1단계 뼈대 필드 */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <input value={item.purpose ?? ''} onChange={e => updateItemField(item.id, 'purpose', e.target.value)}
                      placeholder={t('itemStudio.purposePlaceholder')} className="w-full bg-bg-primary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                    <input value={item.activationCond ?? ''} onChange={e => updateItemField(item.id, 'activationCond', e.target.value)}
                      placeholder={t('itemStudio.activationCondPlaceholder')} className="w-full bg-bg-primary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                    <input value={item.costWeakness ?? ''} onChange={e => updateItemField(item.id, 'costWeakness', e.target.value)}
                      placeholder={t('itemStudio.costWeaknessPlaceholder')} className="w-full bg-bg-primary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                    <input value={item.storyFunction ?? ''} onChange={e => updateItemField(item.id, 'storyFunction', e.target.value)}
                      placeholder={t('itemStudio.storyFunctionPlaceholder')} className="w-full bg-bg-primary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                  </div>
                  {/* 2단계 — 작동 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setTierExpanded(prev => ({ ...prev, [item.id]: { ...prev[item.id], t2: !prev[item.id]?.t2 } }))}
                      className="text-[9px] font-bold text-text-tertiary cursor-pointer flex items-center gap-1 hover:text-text-primary"
                    >
                      {tierExpanded[item.id]?.t2 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {t('itemStudio.tier2Mechanics')}
                    </button>
                    {tierExpanded[item.id]?.t2 && (
                      <div className="space-y-1.5 pt-1.5">
                        <input value={item.worldConnection ?? ''} onChange={e => updateItemField(item.id, 'worldConnection', e.target.value)}
                          placeholder={t('itemStudio.worldConnectionPlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.misuse ?? ''} onChange={e => updateItemField(item.id, 'misuse', e.target.value)}
                          placeholder={t('itemStudio.misusePlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.lore ?? ''} onChange={e => updateItemField(item.id, 'lore', e.target.value)}
                          placeholder={t('itemStudio.lorePlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.material ?? ''} onChange={e => updateItemField(item.id, 'material', e.target.value)}
                          placeholder={t('itemStudio.materialPlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.craftMethod ?? ''} onChange={e => updateItemField(item.id, 'craftMethod', e.target.value)}
                          placeholder={t('itemStudio.craftMethodPlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.valueRarity ?? ''} onChange={e => updateItemField(item.id, 'valueRarity', e.target.value)}
                          placeholder={t('itemStudio.valueRarityPlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.whoTargets ?? ''} onChange={e => updateItemField(item.id, 'whoTargets', e.target.value)}
                          placeholder={t('itemStudio.whoTargetsPlaceholder')} className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                      </div>
                    )}
                  </div>
                  {/* 3단계 — 디테일 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setTierExpanded(prev => ({ ...prev, [item.id]: { ...prev[item.id], t3: !prev[item.id]?.t3 } }))}
                      className="text-[9px] font-bold text-text-tertiary cursor-pointer flex items-center gap-1 hover:text-text-primary"
                    >
                      {tierExpanded[item.id]?.t3 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {t('itemStudio.tier3Detail')}
                    </button>
                    {tierExpanded[item.id]?.t3 && (
                      <div className="space-y-1.5 pt-1.5">
                        <input value={item.itemAppearance ?? ''} onChange={e => updateItemField(item.id, 'itemAppearance', e.target.value)}
                          placeholder={t('itemStudio.appearancePlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.symbolism ?? ''} onChange={e => updateItemField(item.id, 'symbolism', e.target.value)}
                          placeholder={t('itemStudio.symbolismPlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.currentLocation ?? ''} onChange={e => updateItemField(item.id, 'currentLocation', e.target.value)}
                          placeholder={t('itemStudio.currentLocationPlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.ownershipCond ?? ''} onChange={e => updateItemField(item.id, 'ownershipCond', e.target.value)}
                          placeholder={t('itemStudio.ownershipCondPlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.durability ?? ''} onChange={e => updateItemField(item.id, 'durability', e.target.value)}
                          placeholder={t('itemStudio.durabilityPlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.evolution ?? ''} onChange={e => updateItemField(item.id, 'evolution', e.target.value)}
                          placeholder={t('itemStudio.evolutionPlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                        <input value={item.maintenance ?? ''} onChange={e => updateItemField(item.id, 'maintenance', e.target.value)}
                          placeholder={t('itemStudio.maintenancePlaceholder')} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-accent-purple" />
                      </div>
                    )}
                  </div>
                  {/* 한 줄 요약 */}
                  {(item.purpose || item.effect) && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[9px] text-text-tertiary italic leading-relaxed">
                        {t('itemStudio.summaryTemplate')
                          .replace('${name}', item.name)
                          .replace('${purpose}', item.purpose || item.description || '___')
                          .replace('${owner}', item.owner || '___')
                          .replace('${effect}', item.effect || '___')
                          .replace('${cost}', item.costWeakness || '___')
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Item Form */}
          <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold">{t('itemStudio.addNewItem')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={newItem.name ?? ''} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.namePlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as ItemCategory }))} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs">
                {(Object.keys(CATEGORY_CONFIG) as ItemCategory[]).map(cat => (
                  <option key={cat} value={cat}>{t(CATEGORY_CONFIG[cat].tKey)}</option>
                ))}
              </select>
              <select value={newItem.rarity} onChange={e => setNewItem(p => ({ ...p, rarity: e.target.value as ItemRarity }))} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs">
                {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => (
                  <option key={r} value={r}>{t(RARITY_CONFIG[r].tKey)}</option>
                ))}
              </select>
              <input value={newItem.effect ?? ''} onChange={e => setNewItem(p => ({ ...p, effect: e.target.value }))} placeholder={t('itemStudio.effectPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newItem.description ?? ''} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder={t('itemStudio.descriptionPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <input value={newItem.obtainedFrom ?? ''} onChange={e => setNewItem(p => ({ ...p, obtainedFrom: e.target.value }))} placeholder={t('itemStudio.obtainedFromPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <button onClick={addItem} disabled={!newItem.name} className="flex items-center justify-center gap-2 bg-accent-purple text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40 hover:opacity-80">
                <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SKILLS TAB ====== */}
      {subTab === 'skills' && (
        <div className="space-y-4">
          {/* Skill Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map(skill => (
              <div key={skill.id} className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${skill.type === 'ultimate' ? 'text-amber-400' : skill.type === 'passive' ? 'text-green-400' : 'text-blue-400'}`} />
                    <span className="font-bold text-sm">{skill.name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-primary text-text-tertiary">
                      {(() => { const st = SKILL_TYPES.find(s => s.value === skill.type); return st ? t(st.tKey) : skill.type; })()}
                    </span>
                  </div>
                  <button onClick={() => setSkills(prev => prev.filter(s => s.id !== skill.id))} className="text-text-tertiary hover:text-accent-red">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {skill.owner && <p className="text-[10px] text-text-tertiary">👤 {skill.owner}</p>}
                {skill.description && <p className="text-xs text-text-secondary">{skill.description}</p>}
                <div className="flex gap-3 text-[10px] text-text-tertiary">
                  {skill.cost && <span>💎 {skill.cost}</span>}
                  {skill.cooldown && <span>⏱ {skill.cooldown}</span>}
                  {skill.rank && <span>🏅 {skill.rank}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Add Skill Form */}
          <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold">{t('itemStudio.addNewSkill')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={newSkill.name ?? ''} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.skillNamePlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <select value={newSkill.type} onChange={e => setNewSkill(p => ({ ...p, type: e.target.value as Skill['type'] }))} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs">
                {SKILL_TYPES.map(st => <option key={st.value} value={st.value}>{t(st.tKey)}</option>)}
              </select>
              <input value={newSkill.owner ?? ''} onChange={e => setNewSkill(p => ({ ...p, owner: e.target.value }))} placeholder={t('itemStudio.ownerPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <input value={newSkill.rank ?? ''} onChange={e => setNewSkill(p => ({ ...p, rank: e.target.value }))} placeholder={t('itemStudio.rankPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={newSkill.description ?? ''} onChange={e => setNewSkill(p => ({ ...p, description: e.target.value }))} placeholder={t('itemStudio.descriptionPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs col-span-2" />
              <input value={newSkill.cost ?? ''} onChange={e => setNewSkill(p => ({ ...p, cost: e.target.value }))} placeholder={t('itemStudio.costPlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <button onClick={addSkill} disabled={!newSkill.name} className="flex items-center justify-center gap-2 bg-accent-purple text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40 hover:opacity-80">
                <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MAGIC SYSTEM TAB ====== */}
      {subTab === 'magic' && (
        <div className="space-y-4">
          {magicSystems.map(magic => (
            <MagicSystemCard
              key={magic.id}
              magic={magic}
              t={t}
              onDelete={() => setMagicSystems(prev => prev.filter(m => m.id !== magic.id))}
              onAddRank={(rank) => setMagicSystems(prev => prev.map(m =>
                m.id === magic.id ? { ...m, ranks: [...m.ranks, rank] } : m
              ))}
              onRemoveRank={(idx) => setMagicSystems(prev => prev.map(m =>
                m.id === magic.id ? { ...m, ranks: m.ranks.filter((_, i) => i !== idx) } : m
              ))}
            />
          ))}

          {/* Add Magic System Form */}
          <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold">{t('itemStudio.addMagicSystem')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={newMagic.name ?? ''} onChange={e => setNewMagic(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.magicNamePlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
              <input value={newMagic.source ?? ''} onChange={e => setNewMagic(p => ({ ...p, source: e.target.value }))} placeholder={t('itemStudio.magicSourcePlaceholder')} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <textarea value={newMagic.rules ?? ''} onChange={e => setNewMagic(p => ({ ...p, rules: e.target.value }))} placeholder={t('itemStudio.rulesPlaceholder')} rows={2} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs resize-none" />
              <textarea value={newMagic.limitations ?? ''} onChange={e => setNewMagic(p => ({ ...p, limitations: e.target.value }))} placeholder={t('itemStudio.limitationsPlaceholder')} rows={2} className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs resize-none" />
            </div>
            <button onClick={addMagic} disabled={!newMagic.name} className="flex items-center gap-2 bg-accent-purple text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40 hover:opacity-80">
              <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
            </button>
          </div>
        </div>
      )}

      {/* ====== BALANCE TAB ====== */}
      {subTab === 'balance' && (
        <div className="space-y-6">
          {items.length === 0 && skills.length === 0 ? (
            <div className="text-center py-16 text-text-tertiary text-sm">
              {t('itemStudio.addItemsOrSkillsFirst')}
            </div>
          ) : (
            <>
              {/* Warnings */}
              {balance.warnings.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400">{t('itemStudio.balanceWarnings')}</h4>
                  {balance.warnings.map((w, i) => <p key={i} className="text-xs text-amber-300">{w}</p>)}
                </div>
              )}

              {/* Rarity Distribution */}
              <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold">{t('itemStudio.rarityDistribution')}</h4>
                <div className="space-y-2">
                  {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => {
                    const count = balance.rarityDist[r] ?? 0;
                    const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-12" style={{ color: RARITY_CONFIG[r].color }}>{t(RARITY_CONFIG[r].tKey)}</span>
                        <div className="flex-1 h-4 bg-bg-primary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RARITY_CONFIG[r].color }} />
                        </div>
                        <span className="text-[10px] text-text-tertiary w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill Type Distribution */}
              {skills.length > 0 && (
                <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold">{t('itemStudio.skillTypeDistribution')}</h4>
                  <div className="flex gap-4">
                    {SKILL_TYPES.map(st => {
                      const count = balance.skillTypeDist[st.value] ?? 0;
                      return (
                        <div key={st.value} className="text-center">
                          <div className="text-2xl font-black">{count}</div>
                          <div className="text-[10px] text-text-tertiary">{t(st.tKey)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t('itemStudio.totalItems'), value: items.length, icon: Sword },
                  { label: t('itemStudio.totalSkills'), value: skills.length, icon: Zap },
                  { label: t('itemStudio.magicSystems'), value: magicSystems.length, icon: Wand2 },
                  { label: t('itemStudio.warningCount'), value: balance.warnings.length, icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-bg-secondary rounded-xl p-4 text-center">
                    <Icon className="w-5 h-5 mx-auto text-text-tertiary mb-2" />
                    <div className="text-xl font-black">{value}</div>
                    <div className="text-[10px] text-text-tertiary">{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PART 7 — MAGIC SYSTEM CARD SUB-COMPONENT
// ============================================================

const MagicSystemCard: React.FC<{
  magic: MagicSystem;
  t: (key: string, fallback?: string) => string;
  onDelete: () => void;
  onAddRank: (rank: string) => void;
  onRemoveRank: (idx: number) => void;
}> = ({ magic, t, onDelete, onAddRank, onRemoveRank }) => {
  const [expanded, setExpanded] = useState(true);
  const [rankInput, setRankInput] = useState('');

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent-purple" />
          <span className="font-bold text-sm">{magic.name}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />}
        </button>
        <button onClick={onDelete} className="text-text-tertiary hover:text-accent-red">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <>
          {magic.source && <p className="text-xs text-text-secondary">🔮 {t('itemStudio.source')}: {magic.source}</p>}
          {magic.rules && <p className="text-xs text-text-secondary">📜 {t('itemStudio.rules')}: {magic.rules}</p>}
          {magic.limitations && <p className="text-xs text-accent-red/80">⛔ {t('itemStudio.limits')}: {magic.limitations}</p>}

          {/* Ranks */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-text-tertiary uppercase">{t('itemStudio.rankSystem')}</h5>
            <div className="flex flex-wrap gap-1.5">
              {magic.ranks.map((rank, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 bg-bg-primary rounded-lg text-[10px] font-bold">
                  {i + 1}. {rank}
                  <button onClick={() => onRemoveRank(i)} className="text-text-tertiary hover:text-accent-red ml-1">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={rankInput}
                onChange={e => setRankInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && rankInput.trim()) { onAddRank(rankInput.trim()); setRankInput(''); } }}
                placeholder={t('itemStudio.addRankPlaceholder')}
                className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] flex-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemStudioView;
