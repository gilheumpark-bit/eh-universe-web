import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import type { AppLanguage, CharRelationType, StoryConfig } from '@/lib/studio-types';
import { createT, normalizeAppLanguage } from '@/lib/i18n';
import CharRelationGraph from './CharRelationGraph';

const CHAR_REL_STYLES: Record<CharRelationType, { ko: string; en: string; color: string }> = {
  lover: { ko: '연인', en: 'Lover', color: '#ec4899' },
  rival: { ko: '라이벌', en: 'Rival', color: '#f59e0b' },
  friend: { ko: '친구', en: 'Friend', color: '#22c55e' },
  enemy: { ko: '적', en: 'Enemy', color: '#ef4444' },
  family: { ko: '가족', en: 'Family', color: '#8b5cf6' },
  mentor: { ko: '사제', en: 'Mentor', color: '#06b6d4' },
  subordinate: { ko: '상하', en: 'Superior/Sub', color: '#6b7280' },
};

function bindStudioTone(node: HTMLElement | null, color: string) {
  if (!node) return;
  node.style.setProperty('--studio-tone-color', color);
}

export function CharRelationMap({
  language,
  config,
  setConfig,
}: {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}) {
  const appLanguage = normalizeAppLanguage(language);
  const isKO = appLanguage === 'KO';
  const tl = createT(appLanguage);
  const chars = config.characters;
  const relations = config.charRelations || [];

  const [selFrom, setSelFrom] = useState('');
  const [selTo, setSelTo] = useState('');
  const [selType, setSelType] = useState<CharRelationType>('friend');
  const [relDesc, setRelDesc] = useState('');

  const addRelation = () => {
    if (!selFrom || !selTo || selFrom === selTo) return;
    const exists = relations.some((relation) =>
      (relation.from === selFrom && relation.to === selTo) || (relation.from === selTo && relation.to === selFrom)
    );
    if (exists) return;
    setConfig((prev: StoryConfig) => ({
      ...prev,
      charRelations: [...(prev.charRelations || []), { from: selFrom, to: selTo, type: selType, desc: relDesc }],
    }));
    setRelDesc('');
  };

  const removeRelation = (idx: number) => {
    setConfig((prev: StoryConfig) => ({
      ...prev,
      charRelations: (prev.charRelations || []).filter((_, index) => index !== idx),
    }));
  };

  return (
    <div className="bg-bg-secondary/20 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-pink-600/10 border border-pink-500/20 rounded-2xl">
          <Link2 className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tighter uppercase">{tl('resourceExtra.charRelations')}</h3>
          <p className="text-text-tertiary text-[9px] font-bold tracking-widest uppercase">{tl('resourceExtra.visualMap')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <select value={selFrom} onChange={(event) => setSelFrom(event.target.value)} className="bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
          <option value="">{tl('resourceExtra.characterA')}</option>
          {chars.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
        <select value={selTo} onChange={(event) => setSelTo(event.target.value)} className="bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
          <option value="">{tl('resourceExtra.characterB')}</option>
          {chars.filter((character) => character.id !== selFrom).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(Object.keys(CHAR_REL_STYLES) as CharRelationType[]).map((relationType) => (
            <button
              key={relationType}
              onClick={() => setSelType(relationType)}
              ref={(node) => bindStudioTone(node, CHAR_REL_STYLES[relationType].color)}
              className={`px-2 py-2 rounded-lg text-[9px] font-bold border transition-[transform,opacity,background-color,border-color,color] ${
                selType === relationType ? 'text-white border-transparent studio-tone-swatch' : 'text-text-tertiary border-border hover:border-text-tertiary'
              }`}
            >
              {isKO ? CHAR_REL_STYLES[relationType].ko : CHAR_REL_STYLES[relationType].en}
            </button>
          ))}
        </div>
        <input
          value={relDesc}
          onChange={(event) => setRelDesc(event.target.value)}
          placeholder={tl('resourceExtra.description')}
          maxLength={200}
          className="flex-1 min-w-[120px] bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        />
        <button onClick={addRelation} className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-black uppercase tracking-wider">
          {tl('resourceExtra.add')}
        </button>
      </div>

      <CharRelationGraph
        characters={chars}
        relations={relations}
        language={appLanguage}
      />

      {relations.length > 0 && (
        <div className="space-y-1.5">
          {relations.map((relation, index) => {
            const fromChar = chars.find((character) => character.id === relation.from);
            const toChar = chars.find((character) => character.id === relation.to);
            const style = CHAR_REL_STYLES[relation.type];
            return (
              <div key={index} className="flex items-center justify-between bg-bg-tertiary/30 border border-border/50 rounded-xl px-4 py-2 text-[13px]">
                <span>
                  <span className="font-bold text-white">{fromChar?.name}</span>
                  <span className="text-text-tertiary mx-1.5">⇄</span>
                  <span className="font-bold text-white">{toChar?.name}</span>
                  <span
                    ref={(node) => bindStudioTone(node, style.color)}
                    className="ml-2 font-bold studio-tone-text"
                  >
                    [{isKO ? style.ko : style.en}]
                  </span>
                  {relation.desc && <span className="ml-2 text-text-tertiary italic">{relation.desc}</span>}
                </span>
                <button
                  onClick={() => removeRelation(index)}
                  aria-label={appLanguage === 'KO' ? `관계 ${index + 1} 삭제` : `Delete relation ${index + 1}`}
                  className="text-text-tertiary hover:text-accent-red transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
