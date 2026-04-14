"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  type Lang,
  type Civilization,
  type CivRelation,
  type RelationType,
  type TransitionEvent,
  type ValidationIssue,
  type GenreSelectionEntry,
  GENRE_LEVELS,
  ERAS,
  CIV_COLORS,
  RELATION_STYLES,
  MAX_GENRE_SELECTIONS,
  L4,
} from "./types";

// ============================================================
// PART 1 — Genre Leveling (Multi-Select, max 5)
// ============================================================

export function GenreLeveling({ lang, selections, onToggle }: {
  lang: Lang;
  selections: GenreSelectionEntry[];
  onToggle: (genre: string, level: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-text-secondary uppercase">
          {L4(lang, { ko: "장르별 세계관 복잡도", en: "Genre World Complexity", ja: "ジャンル별 世界観 복잡도", zh: "类型별 世界观 복잡도" })}
        </h3>
        <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-tertiary">
          {selections.length}/{MAX_GENRE_SELECTIONS} {L4(lang, { ko: "선택", en: "selected", ja: "選択", zh: "选择" })}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {GENRE_LEVELS.map(g => {
          const sel = selections.find(s => s.genre === g.genre);
          const isSelected = !!sel;
          return (
            <div key={g.genre} className={`space-y-1 rounded-lg p-1.5 transition-all border-2 ${isSelected ? "" : "border-transparent"}`}
              style={isSelected ? { borderColor: g.color, background: `${g.color}10` } : undefined}>
              <div className="text-[10px] font-bold tracking-wider text-center font-[family-name:var(--font-mono)] flex items-center justify-center gap-1" style={{ color: g.color }}>
                {isSelected && <span className="text-[8px]">&#10003;</span>}
                {g.genre}
              </div>
              <div className="flex gap-0.5">
                {g.levels.map(lv => {
                  const active = sel?.level === lv.lv;
                  return (
                    <button
                      key={lv.lv}
                      onClick={() => onToggle(g.genre, lv.lv)}
                      className={`flex-1 py-1.5 rounded text-[8px] font-bold transition-all border ${
                        active
                          ? "text-white shadow-lg"
                          : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"
                      }`}
                      style={active ? { background: g.color, borderColor: g.color } : undefined}
                      title={L4(lang, lv)}
                    >
                      {lv.lv}
                    </button>
                  );
                })}
              </div>
              <div className="text-[8px] text-text-tertiary text-center truncate">
                {(() => {
                  const lev = isSelected ? g.levels[(sel?.level ?? 1) - 1] : g.levels[0];
                  return lev ? L4(lang, { ko: lev.ko, en: lev.en, ja: lev.ja, zh: lev.zh }) : '';
                })()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Selected genres summary */}
      {selections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selections.map((s, i) => {
            const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
            const lvName = g?.levels[(s.level ?? 1) - 1];
            return (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold text-white"
                style={{ background: g?.color }}>
                {s.genre} Lv{s.level}
                <span className="opacity-70">({lvName ? L4(lang, lvName) : ''})</span>
                <button onClick={() => onToggle(s.genre, 0)}
                  className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=genre-leveling | inputs=lang,selections,onToggle | outputs=JSX

// ============================================================
// PART 2 — Civilization Mapper
// ============================================================

export function CivMapper({ lang, civs, setCivs }: {
  lang: Lang;
  civs: Civilization[];
  setCivs: React.Dispatch<React.SetStateAction<Civilization[]>>;
}) {
  const [newName, setNewName] = useState("");
  const [newEra, setNewEra] = useState("medieval");

  const addCiv = () => {
    if (!newName.trim()) return;
    const color = CIV_COLORS[civs.length % CIV_COLORS.length];
    const angle = (civs.length / 8) * Math.PI * 2;
    const cx = 50 + 25 * Math.cos(angle);
    const cy = 50 + 25 * Math.sin(angle);
    setCivs(prev => [...prev, {
      id: `civ-${Date.now()}`,
      name: newName.trim(),
      era: newEra,
      color,
      traits: [],
      x: cx, y: cy,
    }]);
    setNewName("");
  };

  const removeCiv = (id: string) => setCivs(prev => prev.filter(c => c.id !== id));

  const addTrait = (civId: string, trait: string) => {
    if (!trait.trim()) return;
    setCivs(prev => prev.map(c =>
      c.id === civId ? { ...c, traits: [...c.traits, trait.trim()] } : c
    ));
  };

  const removeTrait = (civId: string, idx: number) => {
    setCivs(prev => prev.map(c =>
      c.id === civId ? { ...c, traits: c.traits.filter((_, i) => i !== idx) } : c
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCiv()}
          placeholder={L4(lang, { ko: "문명 이름...", en: "Civilization name...", ja: "문名 名前...", zh: "문人 名称..." })}
          className="flex-1 bg-bg-primary border border-border rounded px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors"
        />
        <select
          value={newEra}
          onChange={e => setNewEra(e.target.value)}
          className="bg-bg-primary border border-border rounded px-2 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          {ERAS.map(era => (
            <option key={era.id} value={era.id}>{L4(lang, era)}</option>
          ))}
        </select>
        <button onClick={addCiv} className="px-4 py-2 bg-accent-purple text-white rounded text-xs font-bold hover:opacity-80 transition-opacity">
          +
        </button>
      </div>

      {civs.length === 0 && (
        <div className="text-center py-8 text-text-tertiary text-xs italic">
          {L4(lang, { ko: "문명을 추가하세요", en: "Add civilizations", ja: "문名을 追加하세요", zh: "문人을 添加하세요" })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {civs.map(civ => {
          const era = ERAS.find(e => e.id === civ.era);
          return (
            <div key={civ.id} className="border border-border rounded-lg p-3 bg-bg-primary" style={{ borderLeftWidth: 3, borderLeftColor: civ.color }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-sm" style={{ color: civ.color }}>{civ.name}</span>
                  <span className="text-[10px] text-text-tertiary ml-2 font-[family-name:var(--font-mono)]">
                    {era ? L4(lang, era) : ''} (TL{era?.techLevel})
                  </span>
                </div>
                <button onClick={() => removeCiv(civ.id)} className="text-text-tertiary hover:text-accent-red text-xs">&#10005;</button>
              </div>

              {/* ERA detail fields */}
              {era && (
                <div className="mb-2 space-y-0.5 bg-bg-secondary/50 rounded p-2 border border-border/50">
                  {([
                    { key: 'society' as const, icon: '\uD83C\uDFDB', ko: '\uC0AC\uD68C', en: 'Society' },
                    { key: 'tech' as const, icon: '\u2699', ko: '\uAE30\uC220', en: 'Tech' },
                    { key: 'economy' as const, icon: '\uD83D\uDCB0', ko: '\uACBD\uC81C', en: 'Economy' },
                    { key: 'conflicts' as const, icon: '\u2694', ko: '\uAC08\uB4F1', en: 'Conflicts' },
                    { key: 'forbidden' as const, icon: '\uD83D\uDEAB', ko: '\uAE08\uAE30', en: 'Forbidden' },
                  ]).map(field => (
                    <div key={field.key} className="flex gap-1.5 text-[9px]">
                      <span className="shrink-0 w-12 text-text-tertiary font-bold">{field.icon} {L4(lang, field)}</span>
                      <span className="text-text-secondary">{L4(lang, era[field.key])}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-2">
                {civ.traits.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-secondary rounded text-[9px] text-text-secondary border border-border">
                    {t}
                    <button onClick={() => removeTrait(civ.id, i)} className="text-text-tertiary hover:text-accent-red">&times;</button>
                  </span>
                ))}
              </div>
              <input
                placeholder={L4(lang, { ko: "특성 추가 (Enter)", en: "Add trait (Enter)", ja: "특성 追加 (Enter)", zh: "특성 添加 (Enter)" })}
                className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    addTrait(civ.id, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=civ-mapper | inputs=lang,civs,setCivs | outputs=JSX

// ============================================================
// PART 3 — Relations View (SVG circular layout)
// ============================================================

export function RelationsView({ lang, civs, relations, setRelations }: {
  lang: Lang;
  civs: Civilization[];
  relations: CivRelation[];
  setRelations: React.Dispatch<React.SetStateAction<CivRelation[]>>;
}) {
  const [selFrom, setSelFrom] = useState("");
  const [selTo, setSelTo] = useState("");
  const [selType, setSelType] = useState<RelationType>("alliance");

  const addRelation = () => {
    if (!selFrom || !selTo || selFrom === selTo) return;
    const exists = relations.some(r =>
      (r.from === selFrom && r.to === selTo) || (r.from === selTo && r.to === selFrom)
    );
    if (exists) return;
    setRelations(prev => [...prev, { from: selFrom, to: selTo, type: selType }]);
  };

  const removeRelation = (idx: number) => setRelations(prev => prev.filter((_, i) => i !== idx));

  const nodePositions = useMemo(() => {
    const cx = 200, cy = 200, r = 150;
    return civs.map((c, i) => {
      const angle = (i / Math.max(civs.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { id: c.id, name: c.name, color: c.color, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }, [civs]);

  const getPos = (id: string) => nodePositions.find(n => n.id === id);

  if (civs.length < 2) {
    return (
      <div className="text-center py-12 text-text-tertiary text-xs italic">
        {L4(lang, { ko: "문명을 2개 이상 추가하면 관계도를 구성할 수 있습니다", en: "Add 2+ civilizations to create a relationship map", ja: "문名을 2件 이상 追加하면 관계도를 구성할 수 있습니다", zh: "문人을 2个 이상 添加하면 관계도를 구성할 수 있습니다" })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-end">
        <select value={selFrom} onChange={e => setSelFrom(e.target.value)} className="bg-bg-primary border border-border rounded px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
          <option value="">{L4(lang, { ko: "문명 A", en: "Civ A", ja: "문名 A", zh: "문人 A" })}</option>
          {civs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selTo} onChange={e => setSelTo(e.target.value)} className="bg-bg-primary border border-border rounded px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
          <option value="">{L4(lang, { ko: "문명 B", en: "Civ B", ja: "문名 B", zh: "문人 B" })}</option>
          {civs.filter(c => c.id !== selFrom).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(Object.keys(RELATION_STYLES) as RelationType[]).map(rt => (
            <button key={rt} onClick={() => setSelType(rt)}
              className={`px-2 py-1.5 rounded text-[10px] font-bold border transition-all ${
                selType === rt ? "text-white" : "text-text-tertiary border-border hover:border-text-tertiary"
              }`}
              style={selType === rt ? { background: RELATION_STYLES[rt].color, borderColor: RELATION_STYLES[rt].color } : undefined}
            >
              {L4(lang, RELATION_STYLES[rt])}
            </button>
          ))}
        </div>
        <button onClick={addRelation} className="px-3 py-1.5 bg-accent-purple text-white rounded text-xs font-bold">
          {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
        </button>
      </div>

      {/* SVG */}
      <div className="flex justify-center">
        <svg viewBox="0 0 400 400" className="w-full max-w-[500px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
          <rect width="400" height="400" fill="transparent" />
          {relations.map((rel, i) => {
            const from = getPos(rel.from);
            const to = getPos(rel.to);
            if (!from || !to) return null;
            const style = RELATION_STYLES[rel.type];
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={style.color} strokeWidth="2" strokeDasharray={style.dash} opacity="0.7" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                  fill={style.color} fontSize="8" textAnchor="middle" fontWeight="bold">
                  {L4(lang, style)}
                </text>
              </g>
            );
          })}
          {nodePositions.map(node => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="20" fill={node.color} opacity="0.15" stroke={node.color} strokeWidth="2" />
              <circle cx={node.x} cy={node.y} r="4" fill={node.color} />
              <text x={node.x} y={node.y + 32} fill={node.color} fontSize="10" textAnchor="middle" fontWeight="bold">
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend + list */}
      <div className="flex flex-wrap gap-3 text-[9px]">
        {(Object.keys(RELATION_STYLES) as RelationType[]).map(rt => (
          <span key={rt} className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ background: RELATION_STYLES[rt].color }} />
            {L4(lang, RELATION_STYLES[rt])}
          </span>
        ))}
      </div>
      {relations.length > 0 && (
        <div className="space-y-1">
          {relations.map((rel, i) => {
            const fromCiv = civs.find(c => c.id === rel.from);
            const toCiv = civs.find(c => c.id === rel.to);
            const style = RELATION_STYLES[rel.type];
            return (
              <div key={i} className="flex items-center justify-between bg-bg-primary border border-border rounded px-3 py-1.5 text-[10px]">
                <span>
                  <span style={{ color: fromCiv?.color }}>{fromCiv?.name}</span>
                  <span className="text-text-tertiary mx-1">&hArr;</span>
                  <span style={{ color: toCiv?.color }}>{toCiv?.name}</span>
                  <span className="ml-2 font-bold" style={{ color: style.color }}>
                    [{L4(lang, style)}]
                  </span>
                </span>
                <button onClick={() => removeRelation(i)} className="text-text-tertiary hover:text-accent-red">&#10005;</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=relations-view | inputs=lang,civs,relations,setRelations | outputs=JSX

// ============================================================
// PART 4 — Timeline View (with transition events)
// ============================================================

export function TimelineView({ lang, civs, transitions, setTransitions }: {
  lang: Lang;
  civs: Civilization[];
  transitions: TransitionEvent[];
  setTransitions: React.Dispatch<React.SetStateAction<TransitionEvent[]>>;
}) {
  const eraOrder = ERAS.map(e => e.id);
  const civsByEra = useMemo(() => {
    const map: Record<string, Civilization[]> = {};
    ERAS.forEach(e => { map[e.id] = []; });
    civs.forEach(c => { if (map[c.era]) map[c.era].push(c); });
    return map;
  }, [civs]);

  const addTransition = (fromEra: string, toEra: string) => {
    const exists = transitions.some(t => t.fromEra === fromEra && t.toEra === toEra);
    if (exists) return;
    const defaultDesc = L4(lang, { ko: "전환 이벤트를 입력하세요", en: "Enter transition event", ja: "전환 이벤트를 入力하세요", zh: "전환 이벤트를 输入하세요" });
    setTransitions(prev => [...prev, { fromEra, toEra, description: defaultDesc }]);
  };

  const updateTransitionDesc = useCallback((idx: number, desc: string) => {
    setTransitions(prev => prev.map((t, i) => i === idx ? { ...t, description: desc } : t));
  }, [setTransitions]);

  const removeTransition = (idx: number) => setTransitions(prev => prev.filter((_, i) => i !== idx));

  const generateAIEvent = useCallback((fromEra: string, toEra: string, idx: number) => {
    const fromEraObj = ERAS.find(e => e.id === fromEra);
    const toEraObj = ERAS.find(e => e.id === toEra);
    const fromLabel = fromEraObj ? L4(lang, { ko: fromEraObj.ko, en: fromEraObj.en, ja: fromEraObj.ja, zh: fromEraObj.zh }) : fromEra;
    const toLabel = toEraObj ? L4(lang, { ko: toEraObj.ko, en: toEraObj.en, ja: toEraObj.ja, zh: toEraObj.zh }) : toEra;
    const templates_ko = [
      `${fromLabel}의 마지막 대전쟁으로 문명이 붕괴, ${toLabel} 시대가 열림`,
      `대재앙으로 인구 80% 감소, 생존자들이 ${toLabel} 체제를 수립`,
      `혁명적 기술 발견으로 ${fromLabel}에서 ${toLabel}로 급격한 전환`,
      `외부 세력의 침략이 ${fromLabel} 체계를 파괴, ${toLabel}의 여명`,
      `신비한 에너지원 발견으로 ${toLabel} 패러다임 전환`,
    ];
    const templates_en = [
      `Great war of ${fromLabel} collapses civilization, ushering in ${toLabel}`,
      `Cataclysm reduces population 80%, survivors establish ${toLabel} order`,
      `Revolutionary discovery triggers rapid transition to ${toLabel}`,
      `External invasion destroys ${fromLabel} systems, dawn of ${toLabel}`,
      `Discovery of mystical energy source triggers ${toLabel} paradigm shift`,
    ];
    const templates = lang === "ko" ? templates_ko : templates_en;
    const event = templates[Math.floor(Math.random() * templates.length)];
    updateTransitionDesc(idx, event);
  }, [lang, updateTransitionDesc]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex items-stretch gap-0">
            {ERAS.map((era, i) => {
              const hasCivs = civsByEra[era.id]?.length > 0;
              return (
                <React.Fragment key={era.id}>
                  <div className={`flex-1 text-center py-3 border border-border rounded-lg mx-0.5 transition-all ${
                    hasCivs ? "bg-accent-purple/10 border-accent-purple/30" : "bg-bg-primary"
                  }`}>
                    <div className="text-[9px] font-bold text-text-tertiary font-[family-name:var(--font-mono)] uppercase">
                      {L4(lang, era)}
                    </div>
                    <div className="text-[8px] text-text-tertiary mt-0.5">TL{era.techLevel}</div>
                    {civsByEra[era.id]?.map(c => (
                      <div key={c.id} className="text-[8px] font-bold mt-1 truncate px-1" style={{ color: c.color }}>
                        {c.name}
                      </div>
                    ))}
                  </div>
                  {i < ERAS.length - 1 && (
                    <div className="w-6 flex flex-col items-center justify-center">
                      <div className="text-text-tertiary text-[10px]">&rarr;</div>
                      {!transitions.some(t => t.fromEra === era.id && t.toEra === eraOrder[i + 1]) && (
                        <button
                          onClick={() => addTransition(era.id, eraOrder[i + 1])}
                          className="w-4 h-4 rounded-full border border-border text-text-tertiary text-[8px] hover:border-accent-purple hover:text-accent-purple transition-colors"
                          title={L4(lang, { ko: "전환 이벤트 추가", en: "Add transition event", ja: "전환 이벤트 追加", zh: "전환 이벤트 添加" })}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {transitions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {L4(lang, { ko: "시대 전환 이벤트", en: "Era Transition Events", ja: "Era Transition Events", zh: "Era Transition Events" })}
          </h4>
          {transitions.map((tr, i) => {
            const fromEraObj = ERAS.find(e => e.id === tr.fromEra);
            const toEraObj = ERAS.find(e => e.id === tr.toEra);
            const fromLabel = fromEraObj ? L4(lang, { ko: fromEraObj.ko, en: fromEraObj.en, ja: fromEraObj.ja, zh: fromEraObj.zh }) : tr.fromEra;
            const toLabel = toEraObj ? L4(lang, { ko: toEraObj.ko, en: toEraObj.en, ja: toEraObj.ja, zh: toEraObj.zh }) : tr.toEra;
            return (
              <div key={i} className="border border-border rounded-lg p-3 bg-bg-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-accent-purple">
                    {fromLabel} &rarr; {toLabel}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => generateAIEvent(tr.fromEra, tr.toEra, i)}
                      className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold hover:bg-accent-purple/20 transition-colors"
                      title={L4(lang, { ko: '템플릿에서 자동 생성', en: 'Auto-generate from templates', ja: '템플릿에서 자동 生成', zh: '템플릿에서 자동 生成' })}>
                      {L4(lang, { ko: '자동', en: 'Auto', ja: 'Auto', zh: 'Auto' })}
                    </button>
                    <button onClick={() => removeTransition(i)} className="text-text-tertiary hover:text-accent-red text-xs">&#10005;</button>
                  </div>
                </div>
                <input
                  value={tr.description}
                  onChange={e => updateTransitionDesc(i, e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=timeline-view | inputs=lang,civs,transitions,setTransitions | outputs=JSX

// ============================================================
// PART 5 — Validation View
// ============================================================

export function ValidationView({ lang, civs, selectedGenre, selectedLevel }: {
  lang: Lang;
  civs: Civilization[];
  selectedGenre: string;
  selectedLevel: number;
}) {
  const issues = useMemo(() => {
    const result: ValidationIssue[] = [];

    civs.forEach(civ => {
      const era = ERAS.find(e => e.id === civ.era);
      if (!era) return;

      const modernTraits = ["총", "화약", "전기", "인터넷", "AI", "핵", "우주선", "gun", "electricity", "internet", "nuclear"];
      civ.traits.forEach(trait => {
        const lower = trait.toLowerCase();
        if (era.techLevel <= 3 && modernTraits.some(mt => lower.includes(mt))) {
          result.push({
            civName: civ.name,
            message: L4(lang, {
              ko: `"${trait}" 특성은 ${era.ko} 시대(TL${era.techLevel})에 부적합합니다`,
              en: `"${trait}" trait is anachronistic for ${era.en} era (TL${era.techLevel})`,
            }),
            severity: "error",
          });
        }
      });

      if (selectedGenre === "SF" && selectedLevel >= 3 && era.techLevel < 5) {
        result.push({
          civName: civ.name,
          message: L4(lang, {
            ko: `SF Lv${selectedLevel} 세계관에 ${era.ko}(TL${era.techLevel}) 문명은 기술 수준이 낮습니다`,
            en: `${era.en}(TL${era.techLevel}) is too low-tech for SF Lv${selectedLevel}`,
          }),
          severity: "warning",
        });
      }
      if (selectedGenre === "Fantasy" && era.techLevel >= 7) {
        result.push({
          civName: civ.name,
          message: L4(lang, {
            ko: `Fantasy 세계관에 ${era.ko}(TL${era.techLevel}) 기술 수준은 과도합니다`,
            en: `${era.en}(TL${era.techLevel}) is too advanced for Fantasy world`,
          }),
          severity: "warning",
        });
      }

      const dupes = civs.filter(c => c.name === civ.name);
      if (dupes.length > 1 && dupes[0].id === civ.id) {
        result.push({
          civName: civ.name,
          message: L4(lang, { ko: `"${civ.name}" 이름이 중복됩니다`, en: `Duplicate name: "${civ.name}"`, ja: `"${civ.name}" 名前이 중복됩니다`, zh: `"${civ.name}" 名称이 중복됩니다` }),
          severity: "error",
        });
      }
    });

    if (civs.length === 0) {
      result.push({
        civName: "-",
        message: L4(lang, { ko: "문명이 하나도 등록되지 않았습니다", en: "No civilizations registered", ja: "문名이 하나도 登録되지 않았습니다", zh: "문人이 하나도 提交되지 않았습니다" }),
        severity: "warning",
      });
    }

    return result;
  }, [civs, selectedGenre, selectedLevel, lang]);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] ${
          errors.length > 0 ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
            : warnings.length > 0 ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/30"
            : "bg-accent-green/10 text-accent-green border border-accent-green/30"
        }`}>
          {errors.length > 0
            ? `${errors.length} ERROR${errors.length > 1 ? "S" : ""}`
            : warnings.length > 0
              ? `${warnings.length} WARNING${warnings.length > 1 ? "S" : ""}`
              : L4(lang, { ko: "검증 통과", en: "ALL CLEAR", ja: "ALL CLEAR", zh: "ALL CLEAR" })
          }
        </div>
        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
          {civs.length} {L4(lang, { ko: "문명", en: "civs", ja: "문名", zh: "문人" })} | {selectedGenre} Lv{selectedLevel}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-text-secondary text-sm font-bold">
            {L4(lang, { ko: "세계관 일관성 검증 통과", en: "World consistency validation passed", ja: "世界観 일관성 검증 통과", zh: "世界观 일관성 검증 통과" })}
          </div>
          <div className="text-text-tertiary text-xs mt-1">
            {L4(lang, { ko: "기술 수준, 장르 레벨, 명칭 충돌 없음", en: "No tech level, genre, or naming conflicts", ja: "기술 수준, ジャンル 레벨, 名칭 충돌 なし", zh: "기술 수준, 类型 레벨, 人칭 충돌 无" })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-3 border rounded-lg p-3 ${
              issue.severity === "error"
                ? "border-accent-red/30 bg-accent-red/5"
                : "border-accent-amber/30 bg-accent-amber/5"
            }`}>
              <span className={`text-xs font-bold font-[family-name:var(--font-mono)] shrink-0 mt-0.5 ${
                issue.severity === "error" ? "text-accent-red" : "text-accent-amber"
              }`}>
                {issue.severity === "error" ? "ERR" : "WRN"}
              </span>
              <div>
                <span className="text-[10px] font-bold text-text-secondary">[{issue.civName}]</span>
                <span className="text-[11px] text-text-secondary ml-1">{issue.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=validation-view | inputs=lang,civs,selectedGenre,selectedLevel | outputs=JSX
