"use client";

import { showAlert } from '@/lib/show-alert';
import React, { useState, useCallback, useRef, useEffect } from "react";
import { createT } from '@/lib/i18n';

import {
  type Lang,
  type ViewTab,
  type Civilization,
  type CivRelation,
  type RelationType,
  type TransitionEvent,
  type GenreSelectionEntry,
  type WorldSimProps,
  type CustomPhoneme,
  type LangWord,
  GENRE_LEVELS,
  ERAS,
  CIV_COLORS,
  RULE_LEVELS,
  AUTO_WORLD_TEMPLATES,
  MAX_GENRE_SELECTIONS,
  L4,
} from "./types";

import { GenreLeveling, CivMapper, RelationsView, TimelineView, ValidationView } from "./SimulationEngine";
import { HexMapView } from "./MapView";
import { LanguageForge } from "./LanguageForge";

// ============================================================
// PART 1 — State Orchestration & Initialization
// ============================================================

export default function WorldSimulatorShell({ lang = "ko", synopsis, worldContext, onSave, initialData }: WorldSimProps) {
  const tl = createT(lang === 'ko' ? 'KO' : 'EN');
  const [activeView, setActiveView] = useState<ViewTab>("leveling");

  // Multi-genre selections (max 5) -- backwards compatible
  const [genreSelections, setGenreSelections] = useState<GenreSelectionEntry[]>(() => {
    if (initialData?.genreSelections && initialData.genreSelections.length > 0) return initialData.genreSelections;
    if (initialData?.selectedGenre) return [{ genre: initialData.selectedGenre, level: initialData.selectedLevel || 1 }];
    return [{ genre: "Fantasy", level: 1 }];
  });

  const selectedGenre = genreSelections[0]?.genre || "Fantasy";
  const selectedLevel = genreSelections[0]?.level || 1;

  const [ruleLevel, setRuleLevel] = useState(initialData?.ruleLevel || 1);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [civs, setCivs] = useState<Civilization[]>(() => {
    if (initialData?.civs && initialData.civs.length > 0) {
      return initialData.civs.map((c, i) => ({ ...c, id: `saved-${i}`, x: 50 + 25 * Math.cos((i / Math.max(initialData.civs!.length, 1)) * Math.PI * 2), y: 50 + 25 * Math.sin((i / Math.max(initialData.civs!.length, 1)) * Math.PI * 2) }));
    }
    const t = AUTO_WORLD_TEMPLATES["Fantasy"];
    return t ? t.civs.map((c, i) => ({ ...c, id: `base-${i}` })) : [];
  });

  const [relations, setRelations] = useState<CivRelation[]>(() => {
    if (initialData?.relations && initialData.relations.length > 0) {
      const savedCivs = initialData.civs ?? [];
      const VALID_TYPES: RelationType[] = ['war', 'alliance', 'trade', 'vassal'];
      return initialData.relations
        .filter((r: Record<string, string>) => (r.from || r.fromName) && (r.to || r.toName) && r.type)
        .map((r: Record<string, string>) => {
          const fromKey = r.from || r.fromName;
          const toKey = r.to || r.toName;
          return {
            from: `saved-${savedCivs.findIndex(c => c.name === fromKey)}`,
            to: `saved-${savedCivs.findIndex(c => c.name === toKey)}`,
            type: (VALID_TYPES.includes(r.type as RelationType) ? r.type : 'trade') as RelationType,
          };
        })
        .filter(r => !r.from.includes('-1') && !r.to.includes('-1'));
    }
    const t = AUTO_WORLD_TEMPLATES["Fantasy"];
    if (!t) return [];
    const ids = t.civs.map((_, i) => `base-${i}`);
    return t.relations.filter((_, i) => ids[i] && ids[i + 1]).map((r, i) => ({ from: ids[i], to: ids[i + 1], type: r.type }));
  });

  const [transitions, setTransitions] = useState<TransitionEvent[]>(
    initialData?.transitions || []
  );

  const [phonemes, setPhonemes] = useState<CustomPhoneme[]>(initialData?.phonemes || []);
  const [words, setWords] = useState<LangWord[]>(initialData?.words || []);
  const [hexMap, setHexMap] = useState<Record<string, string>>(initialData?.hexMap || {});

  // Auto-save to parent when data changes
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => {
    onSaveRef.current?.({
      civs, relations, transitions, selectedGenre, selectedLevel, genreSelections, ruleLevel, phonemes, words, hexMap
    });
  }, [civs, relations, transitions, selectedGenre, selectedLevel, genreSelections, ruleLevel, phonemes, words, hexMap]);

  const handleGenreToggle = useCallback((genre: string, level: number) => {
    setGenreSelections(prev => {
      if (level === 0) return prev.filter(s => s.genre !== genre);
      const existing = prev.find(s => s.genre === genre);
      if (existing) {
        if (existing.level === level) return prev.filter(s => s.genre !== genre);
        return prev.map(s => s.genre === genre ? { ...s, level } : s);
      }
      if (prev.length >= MAX_GENRE_SELECTIONS) {
        showAlert(L4(lang, { ko: `장르는 최대 ${MAX_GENRE_SELECTIONS}개까지 선택 가능합니다`, en: `Max ${MAX_GENRE_SELECTIONS} genres allowed` }));
        return prev;
      }
      return [...prev, { genre, level }];
    });
  }, [lang]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future genre auto-generation UI
  const handleAutoGenerate = useCallback(() => {
    const template = AUTO_WORLD_TEMPLATES[selectedGenre];
    if (!template) return;
    const newCivs = template.civs.map((c, i) => ({
      ...c,
      id: `auto-${Date.now()}-${i}`,
    }));
    setCivs(newCivs);
    const newRels: CivRelation[] = [];
    template.relations.forEach((r, i) => {
      if (newCivs[i] && newCivs[i + 1]) {
        newRels.push({ from: newCivs[i].id, to: newCivs[i + 1].id, type: r.type });
      }
    });
    setRelations(newRels);
    setTransitions([]);
  }, [selectedGenre]);

  // IDENTITY_SEAL: PART-1 | role=state-orchestration | inputs=WorldSimProps | outputs=state-vars,handlers

  // ============================================================
  // PART 2 — View Tab Definitions
  // ============================================================

  const VIEW_TABS: { id: ViewTab; ko: string; en: string }[] = [
    { id: "leveling", ko: "장르 레벨", en: "Genre Level" },
    { id: "civilizations", ko: "문명 매핑", en: "Civilizations" },
    { id: "relations", ko: "관계도", en: "Relations" },
    { id: "timeline", ko: "타임라인", en: "Timeline" },
    { id: "map", ko: "세력 지도", en: "Territory Map" },
    { id: "validation", ko: "검증", en: "Validation" },
    { id: "language", ko: "언어 생성", en: "Language" },
  ];

  // IDENTITY_SEAL: PART-2 | role=tab-definitions | inputs=none | outputs=VIEW_TABS

  // ============================================================
  // PART 3 — Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="doc-header rounded-t mb-0">
        <span className="badge badge-blue mr-2">SIMULATOR</span>
        {L4(lang, { ko: "세계관 시뮬레이터 — World Consistency Engine", en: "World Simulator — Consistency Engine" })}
      </div>

      <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 sm:p-6 space-y-6">
        {/* Genre Leveling (always visible at top) */}
        <GenreLeveling lang={lang} selections={genreSelections} onToggle={handleGenreToggle} />

        {/* EH Rule Level + Auto Generate */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-text-secondary uppercase">
                {L4(lang, { ko: "EH 규칙 강도", en: "EH Rule Intensity" })}
              </h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded font-[family-name:var(--font-mono)]"
                style={{
                  background: `${RULE_LEVELS[ruleLevel - 1].color}20`,
                  color: RULE_LEVELS[ruleLevel - 1].color,
                }}>
                {RULE_LEVELS[ruleLevel - 1].pct}% &mdash; {L4(lang, { ko: RULE_LEVELS[ruleLevel - 1].genre_ko, en: RULE_LEVELS[ruleLevel - 1].genre_en })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {RULE_LEVELS.map(rl => (
                <button key={rl.lv} type="button" onClick={() => setRuleLevel(rl.lv)}
                  className={`py-1.5 px-2 rounded text-[8px] font-bold border transition-all min-w-[60px] ${
                    ruleLevel === rl.lv
                      ? "text-white border-transparent"
                      : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"
                  }`}
                  style={ruleLevel === rl.lv ? {
                    background: rl.color,
                    borderColor: "transparent",
                  } : undefined}
                  title={L4(lang, { ko: rl.desc_ko, en: rl.desc_en })}
                >
                  <div>{L4(lang, rl)}</div>
                  <div className="text-[7px] opacity-70">Lv{rl.lv}</div>
                </button>
              ))}
            </div>
            <div className="text-[9px] text-text-tertiary">
              {L4(lang, { ko: RULE_LEVELS[ruleLevel - 1].desc_ko, en: RULE_LEVELS[ruleLevel - 1].desc_en })}
            </div>
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-2 shrink-0 relative">
            <button onClick={() => setShowPresetMenu(v => !v)}
              className="px-3 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
              &#9889; {L4(lang, { ko: '\uD504\uB9AC\uC14B', en: 'Preset' })}
            </button>
            {showPresetMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {Object.keys(AUTO_WORLD_TEMPLATES).map(key => (
                  <button key={key} onClick={() => {
                    const template = AUTO_WORLD_TEMPLATES[key];
                    if (!template) return;
                    const newCivs = template.civs.map((c, i) => ({ ...c, id: `auto-${Date.now()}-${i}` }));
                    setCivs(newCivs);
                    const newRels: CivRelation[] = [];
                    template.relations.forEach((r, i) => {
                      if (newCivs[i] && newCivs[i + 1]) {
                        newRels.push({ from: newCivs[i].id, to: newCivs[i + 1].id, type: r.type });
                      }
                    });
                    setRelations(newRels);
                    setTransitions([]);
                    setShowPresetMenu(false);
                  }}
                    className="w-full text-left px-4 py-2.5 text-[11px] text-text-secondary hover:bg-accent-purple/20 hover:text-text-primary transition-colors border-b border-border/50 last:border-0">
                    {key}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={aiGenerating}
              onClick={async () => {
              if (!synopsis) { showAlert(L4(lang, { ko: '\uC138\uACC4\uAD00 \uC124\uACC4\uC5D0\uC11C \uC2DC\uB18D\uC2DC\uC2A4\uB97C \uBA3C\uC800 \uC791\uC131\uD558\uC138\uC694.', en: 'Write a synopsis in World Design first.' })); return; }
              setAiGenerating(true);
              try {
                const { generateWorldSim } = await import('@/services/geminiService');
                const result = await generateWorldSim(synopsis, selectedGenre, lang === "ko" ? 'KO' : 'EN', worldContext);
                if (result.civilizations) {
                  const newCivs = result.civilizations.map((c: { name: string; era: string; traits: string[] }, i: number) => ({
                    id: `ai-${Date.now()}-${i}`, name: c.name, era: c.era || 'medieval',
                    color: CIV_COLORS[i % CIV_COLORS.length], traits: c.traits || [],
                    x: 50 + 25 * Math.cos((i / Math.max(result.civilizations.length, 1)) * Math.PI * 2),
                    y: 50 + 25 * Math.sin((i / Math.max(result.civilizations.length, 1)) * Math.PI * 2),
                  }));
                  setCivs(newCivs);
                  setRelations([]);
                }
              } catch { showAlert(L4(lang, { ko: '\uC790\uB3D9 \uC0DD\uC131 \uC2E4\uD328. API \uD0A4\uB97C \uD655\uC778\uD558\uC138\uC694.', en: 'Generation failed. Check API key.' })); }
              finally { setAiGenerating(false); }
            }}
              className={`px-3 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-opacity ${aiGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}>
              {aiGenerating ? '\u23F3' : '\uD83E\uDD16'} {aiGenerating ? L4(lang, { ko: '생성 중...', en: 'Generating...' }) : L4(lang, { ko: '자동 생성', en: 'Auto Generate' })}
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-2 rounded-t text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider uppercase transition-all whitespace-nowrap ${
                activeView === tab.id
                  ? "bg-accent-purple/10 text-accent-purple border-b-2 border-accent-purple"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {L4(lang, tab)}
            </button>
          ))}
        </div>

        {/* Active View */}
        {activeView === "leveling" && (
          <div className="text-center py-8 space-y-3">
            {genreSelections.length === 0 ? (
              <div className="text-text-tertiary text-sm">
                {L4(lang, { ko: "장르를 선택하세요 (최대 5개)", en: "Select genres (max 5)" })}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-3">
                  {genreSelections.map((s, i) => {
                    const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
                    const lvName = g?.levels[(s.level ?? 1) - 1];
                    return (
                      <div key={i} className="text-center">
                        <div className="text-xl font-black font-[family-name:var(--font-display)]" style={{ color: g?.color }}>
                          {s.genre} Lv.{s.level}
                        </div>
                        <div className="text-text-secondary text-xs">
                          {lvName ? L4(lang, lvName) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-text-tertiary text-xs max-w-md mx-auto">
                  {L4(lang, {
                    ko: `${genreSelections.length}개 장르 조합 — 문명 매핑, 타임라인, 검증 및 AI 집필에 반영됩니다.`,
                    en: `${genreSelections.length} genre blend — applied to civilization mapping, timeline, validation, and AI writing.`,
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeView === "civilizations" && (
          <CivMapper lang={lang} civs={civs} setCivs={setCivs} />
        )}

        {activeView === "relations" && (
          <RelationsView lang={lang} civs={civs} relations={relations} setRelations={setRelations} />
        )}

        {activeView === "timeline" && (
          <TimelineView lang={lang} civs={civs} transitions={transitions} setTransitions={setTransitions} />
        )}

        {activeView === "map" && (
          <HexMapView lang={lang} civs={civs} hexMap={hexMap} setHexMap={setHexMap} />
        )}

        {activeView === "validation" && (
          <ValidationView lang={lang} civs={civs} selectedGenre={selectedGenre} selectedLevel={selectedLevel} />
        )}

        {activeView === "language" && (
          <LanguageForge lang={lang} civs={civs} phonemes={phonemes} setPhonemes={setPhonemes} words={words} setWords={setWords} />
        )}

        {/* Footer stats */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{L4(lang, { ko: "문명", en: "Civs" })}: </span>
            <span className="text-accent-purple font-bold">{civs.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{L4(lang, { ko: "관계", en: "Relations" })}: </span>
            <span className="text-accent-purple font-bold">{relations.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{L4(lang, { ko: "전환", en: "Transitions" })}: </span>
            <span className="text-accent-purple font-bold">{transitions.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{L4(lang, { ko: "장르", en: "Genre" })}: </span>
            {genreSelections.map((s, i) => (
              <span key={i}>
                {i > 0 && <span className="text-text-tertiary"> + </span>}
                <span className="font-bold" style={{ color: GENRE_LEVELS.find(g => g.genre === s.genre)?.color }}>
                  {s.genre} Lv{s.level}
                </span>
              </span>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{tl('worldSim.ehRules')}: </span>
            <span className="font-bold" style={{
              color: ruleLevel <= 1 ? "var(--color-text-tertiary)" : ruleLevel <= 2 ? "#22c55e" : ruleLevel <= 3 ? "#eab308" : ruleLevel <= 4 ? "#f97316" : "#ef4444"
            }}>
              Lv{ruleLevel} ({RULE_LEVELS[ruleLevel - 1].pct}%)
            </span>
          </div>
        </div>

        {/* World Narrative Summary */}
        {civs.length > 0 && (() => {
          const isKO = lang === "ko";
          const wsT = createT(isKO ? 'KO' : 'EN');
          const RELATION_KO: Record<string, string> = { war: "\uC804\uC7C1", alliance: "\uB3D9\uB9F9", trade: "\uAD50\uC5ED", vassal: "\uC885\uC18D" };
          const RELATION_EN: Record<string, string> = { war: "at war with", alliance: "allied with", trade: "trades with", vassal: "vassal of" };

          const genreDesc = genreSelections.map(s => {
            const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
            const lvName = g?.levels.find(l => l.lv === s.level);
            return `${s.genre} Lv${s.level}(${lvName ? (isKO ? lvName.ko : lvName.en) : ""})`;
          }).join(" + ");

          const paragraphs: string[] = [];

          paragraphs.push(isKO
            ? `\uC774 \uC138\uACC4\uB294 ${genreDesc} \uC7A5\uB974 \uBE14\uB80C\uB4DC\uB85C \uAD6C\uCD95\uB418\uC5C8\uC73C\uBA70, EH \uADDC\uCE59 Lv${ruleLevel}(${RULE_LEVELS[ruleLevel - 1][isKO ? "ko" : "en"]})\uC774 \uC801\uC6A9\uB429\uB2C8\uB2E4.`
            : `This world is built on a ${genreDesc} genre blend with EH Rules Lv${ruleLevel} (${RULE_LEVELS[ruleLevel - 1].en}).`);

          civs.forEach(c => {
            const era = ERAS.find(e => e.id === c.era);
            const eraName = era ? (isKO ? era.ko : era.en) : c.era;
            const traitStr = c.traits.length > 0 ? c.traits.join(", ") : wsT('worldSim.traitsTBD');
            paragraphs.push(isKO
              ? `"${c.name}"\uC740(\uB294) ${eraName} \uC2DC\uB300\uC758 \uBB38\uBA85\uC73C\uB85C, ${traitStr}\uC758 \uD2B9\uC131\uC744 \uAC00\uC9D1\uB2C8\uB2E4.`
              : `"${c.name}" is a ${eraName}-era civilization characterized by ${traitStr}.`);
          });

          if (relations.length > 0) {
            const relLines = relations.map(r => {
              const fromCiv = civs.find(c => c.id === r.from);
              const toCiv = civs.find(c => c.id === r.to);
              if (!fromCiv || !toCiv) return null;
              return isKO
                ? `${fromCiv.name}\uACFC(\uC640) ${toCiv.name}\uC740(\uB294) ${RELATION_KO[r.type] || r.type} \uAD00\uACC4\uC785\uB2C8\uB2E4.`
                : `${fromCiv.name} is ${RELATION_EN[r.type] || r.type} ${toCiv.name}.`;
            }).filter(Boolean);
            if (relLines.length > 0) paragraphs.push(relLines.join(" "));
          }

          if (transitions.length > 0) {
            const transLines = transitions.map(t => {
              const fromEra = ERAS.find(e => e.id === t.fromEra);
              const toEra = ERAS.find(e => e.id === t.toEra);
              return isKO
                ? `${fromEra ? fromEra.ko : t.fromEra}\uC5D0\uC11C ${toEra ? toEra.ko : t.toEra}\uB85C\uC758 \uC804\uD658: ${t.description}`
                : `Transition from ${fromEra ? fromEra.en : t.fromEra} to ${toEra ? toEra.en : t.toEra}: ${t.description}`;
            });
            paragraphs.push(transLines.join(" "));
          }

          const narrative = paragraphs.join("\n\n");

          return (
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                  {wsT('worldSim.narrativeSummary')}
                </span>
                <button onClick={() => navigator.clipboard.writeText(narrative)}
                  className="text-[8px] font-bold text-text-tertiary hover:text-accent-purple bg-bg-secondary px-2 py-1 rounded border border-border transition-colors">
                  {wsT('worldSim.copy')}
                </button>
              </div>
              <div className="text-[10px] text-text-secondary bg-bg-primary border border-border rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                {narrative}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=shell-render | inputs=all-state | outputs=JSX-layout
