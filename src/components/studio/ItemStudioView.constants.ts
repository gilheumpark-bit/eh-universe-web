import type { ElementType } from 'react';
import { Package, ScrollText, Shield, Sparkles, Sword, Zap } from 'lucide-react';
import type {
  AssetPotentialLevel,
  Item,
  ItemCategory,
  ItemLifecycleStatus,
  ItemRarity,
  MagicSystem,
  Skill,
} from '@/lib/studio-types';

export const RARITY_CONFIG: Record<ItemRarity, { tKey: string; color: string; bg: string }> = {
  common: { tKey: 'itemStudio.rarityCommon', color: '#9ca3af', bg: 'bg-gray-500/10' },
  uncommon: { tKey: 'itemStudio.rarityUncommon', color: '#22c55e', bg: 'bg-green-500/10' },
  rare: { tKey: 'itemStudio.rarityRare', color: '#3b82f6', bg: 'bg-accent-blue/10' },
  epic: { tKey: 'itemStudio.rarityEpic', color: '#a855f7', bg: 'bg-purple-500/10' },
  legendary: { tKey: 'itemStudio.rarityLegendary', color: '#f59e0b', bg: 'bg-amber-500/10' },
  mythic: { tKey: 'itemStudio.rarityMythic', color: '#ef4444', bg: 'bg-accent-red/10' },
};

export const CATEGORY_CONFIG: Record<ItemCategory, { tKey: string; icon: ElementType }> = {
  weapon: { tKey: 'itemStudio.categoryWeapon', icon: Sword },
  armor: { tKey: 'itemStudio.categoryArmor', icon: Shield },
  accessory: { tKey: 'itemStudio.categoryAccessory', icon: Sparkles },
  consumable: { tKey: 'itemStudio.categoryConsumable', icon: Zap },
  material: { tKey: 'itemStudio.categoryMaterial', icon: Package },
  quest: { tKey: 'itemStudio.categoryQuest', icon: ScrollText },
  misc: { tKey: 'itemStudio.categoryMisc', icon: Package },
};

export const ITEM_STATUS_CONFIG: Record<ItemLifecycleStatus, { label: string; tone: string }> = {
  planned: { label: '예정', tone: 'text-text-tertiary border-border/60' },
  active: { label: '활성', tone: 'text-accent-green border-accent-green/40' },
  lost: { label: '분실', tone: 'text-accent-red border-accent-red/40' },
  sealed: { label: '봉인', tone: 'text-accent-blue border-accent-blue/40' },
  destroyed: { label: '파괴', tone: 'text-accent-red border-accent-red/40' },
  transferred: { label: '양도', tone: 'text-accent-amber border-accent-amber/40' },
};

export const ASSET_POTENTIAL_CONFIG: Record<AssetPotentialLevel, { label: string; tone: string }> = {
  none: { label: 'IP 미정', tone: 'text-text-tertiary border-border/60' },
  low: { label: 'IP 낮음', tone: 'text-text-secondary border-border/70' },
  medium: { label: 'IP 보통', tone: 'text-accent-blue border-accent-blue/40' },
  high: { label: 'IP 높음', tone: 'text-accent-green border-accent-green/40' },
  premium: { label: 'IP 프리미엄', tone: 'text-accent-amber border-accent-amber/40' },
};

export const SKILL_TYPES = [
  { value: 'active' as const, tKey: 'itemStudio.skillTypeActive' },
  { value: 'passive' as const, tKey: 'itemStudio.skillTypePassive' },
  { value: 'ultimate' as const, tKey: 'itemStudio.skillTypeUltimate' },
];

export const PRESET_MAGIC_SYSTEMS: MagicSystem[] = [
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
    limitations: '과다 사용 시 자기 통제 약화·감정 둔화. 분노 극한 시 성력 폭주. 권위 명령은 마족에게 무효.',
    ranks: ['1급 — 기본 치유 (10m)', '2급 — 집단 치유 (50m)', '3급 — 정화 능력', '4급 — 신성 결계', '5급 — 권위 완전 각성'],
  },
  {
    id: 'preset-eh-heart',
    name: 'EH (Error Heart)',
    source: '결정론적 계산에서 발생하는 의미 잔차 — 예측 불가 선택에서 생성',
    rules: '측정 가능하나 역산·재현 불가. 은하계 기축통화(단위: Hart). Type A(감정형/높은 강도), Type B(윤리형/장기 지속), Type C(존재형/극희귀).',
    limitations: '복제 지구 유지비가 EH 수입 초과 시 파산. 일부 개체 매매 금지. 노아 안드로이드는 EH=0 환경에서 부팅 불가.',
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

export const PRESET_SKILLS: Skill[] = [
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

export const PRESET_ITEMS: Item[] = [
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

export type PresetCategory = 'all' | 'magic' | 'skills' | 'items';

export function getPresetSummary(): { magic: number; skills: number; items: number } {
  return {
    magic: PRESET_MAGIC_SYSTEMS.length,
    skills: PRESET_SKILLS.length,
    items: PRESET_ITEMS.length,
  };
}
