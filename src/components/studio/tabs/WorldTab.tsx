// ============================================================
// PART 1 — imports & types (dynamic import of WorldStudioView)
// ============================================================
import React from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, StoryConfig, ChatSession, WorldSimData } from '@/lib/studio-types';
import { logger } from '@/lib/logger';
import { L4 } from '@/lib/i18n';
import { TabHeader } from '@/components/studio/TabHeader';

const WorldStudioView = dynamic(() => import('@/components/studio/WorldStudioView'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 p-8 animate-pulse" aria-label="world-loading">
      <div className="h-10 bg-bg-secondary rounded-2xl w-2/5" />
      <div className="h-48 bg-bg-secondary rounded-2xl" />
      <div className="h-32 bg-bg-secondary rounded-2xl" />
    </div>
  ),
});

interface WorldTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  onSave: () => void;
  saveFlash: boolean;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  currentSessionId: string | null;
  hostedProviders?: Record<string, boolean>;
}

// ============================================================
// PART 2 — type guards (runtime safety for WorldStudioView payload)
// ============================================================
// [C] WorldStudioView는 `Record<string, unknown>`를 발행하므로 타입 단언 대신
//     구조 검증 후 좁힌다. id는 relations 매핑 때만 쓰이고, WorldSimData.civs에는 저장하지 않음.
interface IncomingCiv {
  id?: string;
  name: string;
  era: string;
  color: string;
  traits: string[];
}
interface IncomingRelation {
  from: string;
  to: string;
  type: string;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function toCiv(v: unknown): IncomingCiv | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || typeof o.era !== 'string' || typeof o.color !== 'string') return null;
  if (!isStringArray(o.traits)) return null;
  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    name: o.name,
    era: o.era,
    color: o.color,
    traits: o.traits,
  };
}

function toRelation(v: unknown): IncomingRelation | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.from !== 'string' || typeof o.to !== 'string' || typeof o.type !== 'string') return null;
  return { from: o.from, to: o.to, type: o.type };
}

// [K] filterMap — null 제거와 매핑을 한 패스로 (G: O(n) 단일 순회)
function filterMap<T, U>(arr: readonly T[], fn: (x: T) => U | null): U[] {
  const out: U[] = [];
  for (const x of arr) {
    const y = fn(x);
    if (y !== null) out.push(y);
  }
  return out;
}

// ============================================================
// PART 3 — WorldTab component (pure wrapper + safe payload relay)
// ============================================================
const WorldTab: React.FC<WorldTabProps> = ({
  language,
  config,
  setConfig,
  onStart,
  onSave,
  saveFlash,
  updateCurrentSession,
  currentSessionId,
  hostedProviders = {},
}) => {
  return (
    <>
    <TabHeader
      icon="🌍"
      title={L4(language, { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' })}
      description={L4(language, {
        ko: '장소 · 시대 · 법칙을 설계합니다',
        en: 'Design places, eras, and rules',
        ja: '場所・時代・法則を設計します',
        zh: '设计地点、时代与法则',
      })}
    />
    <WorldStudioView
      language={language}
      config={config}
      setConfig={setConfig}
      onStart={onStart}
      onSave={onSave}
      saveFlash={saveFlash}
      hostedProviders={hostedProviders}
      aria-label={L4(language, {
        ko: '세계관 스튜디오',
        en: 'World Studio',
        ja: '世界観スタジオ',
        zh: '世界观工作室',
      })}
      handleWorldSimChange={(data: Record<string, unknown>) => {
        if (!currentSessionId) return;
        if (!data || typeof data !== 'object') {
          logger.warn('WorldTab', 'handleWorldSimChange received non-object payload');
          return;
        }
        try {
          // [C] 배열 검증 + per-item 타입 가드
          const rawCivs = Array.isArray(data.civs) ? data.civs : [];
          const rawRelations = Array.isArray(data.relations) ? data.relations : [];
          const civs = filterMap(rawCivs, toCiv);
          const relations = filterMap(rawRelations, toRelation);

          // [G] civs id → name 룩업은 id 기반 Map (O(1) 조회, 기존 find는 O(n²))
          const idToName = new Map<string, string>();
          for (const c of civs) {
            if (c.id) idToName.set(c.id, c.name);
          }

          // [C] WorldSimData 형상으로 축소 — id 필드는 저장 금지
          const storedCivs: NonNullable<WorldSimData['civs']> = civs.map((c) => ({
            name: c.name,
            era: c.era,
            color: c.color,
            traits: c.traits,
          }));
          const storedRelations: NonNullable<WorldSimData['relations']> = relations.map((r) => ({
            fromName: idToName.get(r.from) ?? '',
            toName: idToName.get(r.to) ?? '',
            type: r.type,
          }));

          // [C] 나머지 선택 필드는 optional로 복사 — 타입 단언 없이 구조적 할당
          const patch: WorldSimData = {
            ...config.worldSimData,
            civs: storedCivs,
            relations: storedRelations,
          };
          if (Array.isArray(data.transitions)) {
            patch.transitions = data.transitions as WorldSimData['transitions'];
          }
          if (typeof data.selectedGenre === 'string') patch.selectedGenre = data.selectedGenre;
          if (typeof data.selectedLevel === 'number') patch.selectedLevel = data.selectedLevel;
          if (Array.isArray(data.genreSelections)) {
            patch.genreSelections = data.genreSelections as WorldSimData['genreSelections'];
          }
          if (typeof data.ruleLevel === 'number') patch.ruleLevel = data.ruleLevel;
          if (Array.isArray(data.phonemes)) patch.phonemes = data.phonemes as WorldSimData['phonemes'];
          if (Array.isArray(data.words)) patch.words = data.words as WorldSimData['words'];
          if (data.hexMap && typeof data.hexMap === 'object') {
            patch.hexMap = data.hexMap as WorldSimData['hexMap'];
          }

          updateCurrentSession({
            config: { ...config, worldSimData: patch },
          });
        } catch (err) {
          logger.warn('WorldTab', 'handleWorldSimChange failed', err);
        }
      }}
    />
    </>
  );
};

export default WorldTab;
