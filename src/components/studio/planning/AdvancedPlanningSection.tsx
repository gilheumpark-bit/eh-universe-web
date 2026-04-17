'use client';

// ============================================================
// AdvancedPlanningSection — PlanningView 고급 모드 전용 섹션
// 서사 강도 / 연재 플랫폼 / POV·배경·감정 / 시놉시스
// 세계관 Tier 1/2/3 / 긴장도 곡선 / 가드레일 / PRISM / PRISM-MODE
// ============================================================

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BarChart3, Shield, Info, CheckCircle2, Circle } from 'lucide-react';
import type { StoryConfig, AppLanguage } from '@/lib/studio-types';
import { PublishPlatform } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { PLATFORM_PRESETS, PLATFORM_BY_LANG } from '@/engine/types';
import { createT } from '@/lib/i18n';
import { TRANSLATIONS } from '@/lib/studio-constants';
import { validateWorld, calcCompletionScore, WarningBadge, CompletionBar } from '../TierValidator';

interface AdvancedPlanningSectionProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  totalEpisodes: number;
  tensionData: number[];
}

const AdvancedPlanningSection: React.FC<AdvancedPlanningSectionProps> = ({
  language, config, setConfig, totalEpisodes, tensionData,
}) => {
  const tl = createT(language);
  const t = TRANSLATIONS[language].planning;
  const te = TRANSLATIONS[language].engine;
  const isKO = language === 'KO';

  const [showWorldTier2, setShowWorldTier2] = useState(false);
  const [showWorldTier3, setShowWorldTier3] = useState(false);

  return (
    <>
      {/* 서사 강도 */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
          {isKO ? '서사 강도' : 'Narrative Intensity'}
        </label>
        <div className="flex gap-3">
          {([
            { value: 'iron' as const, label: isKO ? '강 (Iron)' : 'Iron', activeClass: 'bg-red-600/10 border-red-500/30 text-red-400', desc: isKO ? '인과 필수, 모든 경고 표시' : 'Strict causality, all warnings' },
            { value: 'standard' as const, label: isKO ? '중 (Standard)' : 'Standard', activeClass: 'bg-blue-600/10 border-blue-500/30 text-blue-400', desc: isKO ? '주요 경고만 표시' : 'Major warnings only' },
            { value: 'soft' as const, label: isKO ? '약 (Soft)' : 'Soft', activeClass: 'bg-text-tertiary/10 border-zinc-500/30 text-text-secondary', desc: isKO ? '자유 창작, 오타만 표시' : 'Free creation, typos only' },
          ]).map(({ value, label, activeClass, desc }) => (
            <button key={value} onClick={() => setConfig({ ...config, narrativeIntensity: value })}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${(config.narrativeIntensity || 'standard') === value ? activeClass : 'bg-bg-tertiary border-border text-text-tertiary hover:text-text-secondary'}`}
              title={desc}>
              <span>{label}</span>
              <span className="text-[8px] font-normal normal-case tracking-normal text-text-tertiary">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 연재 플랫폼 */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{tl('planningExtra.publishPlatform')}</label>
        <div className="flex flex-wrap gap-2">
          {[PublishPlatform.NONE, ...(PLATFORM_BY_LANG[language] || Object.values(PublishPlatform).filter(p => p !== 'NONE'))].map(pp => {
            const labels: Record<string, string> = {
              NONE: tl('planningExtra.none'), MUNPIA: '문피아', NOVELPIA: '노벨피아', KAKAOPAGE: '카카오페이지', SERIES: '시리즈',
              ROYAL_ROAD: 'Royal Road', WEBNOVEL: 'Webnovel', KINDLE_VELLA: 'Kindle Vella', WATTPAD: 'Wattpad',
              KAKUYOMU: 'カクヨム', NAROU: 'なろう', ALPHAPOLIS: 'アルファポリス', QIDIAN: '起点', JJWXC: '晋江', FANQIE: '番茄',
            };
            const selected = (config.publishPlatform || PublishPlatform.NONE) === pp;
            const preset = PLATFORM_PRESETS[pp];
            return (
              <button key={pp} onClick={() => {
                const updates: Partial<StoryConfig> = { publishPlatform: pp };
                if (preset) updates.guardrails = { min: preset.episodeLength.min, max: preset.episodeLength.max };
                setConfig(prev => ({ ...prev, ...updates }));
              }}
                className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${selected ? 'bg-accent-purple/10 border-accent-purple/40 text-accent-purple' : 'bg-bg-tertiary border-border text-text-tertiary hover:text-text-secondary'}`}>
                {labels[pp] || pp}
              </button>
            );
          })}
        </div>
        {config.publishPlatform && config.publishPlatform !== PublishPlatform.NONE && PLATFORM_PRESETS[config.publishPlatform] && (
          <div className="mt-2 p-3 bg-bg-secondary/50 border border-border rounded-xl text-[10px] text-text-tertiary space-y-1">
            <div><span className="text-text-secondary font-bold">{tl('planningExtra.target')}:</span> {PLATFORM_PRESETS[config.publishPlatform].targetReader}</div>
            <div><span className="text-text-secondary font-bold">{tl('planningExtra.length')}:</span> {PLATFORM_PRESETS[config.publishPlatform].episodeLength.min.toLocaleString()}~{PLATFORM_PRESETS[config.publishPlatform].episodeLength.max.toLocaleString()}{tl('planningExtra.chars')}</div>
            <div><span className="text-text-secondary font-bold">{tl('planningExtra.pace')}:</span> {PLATFORM_PRESETS[config.publishPlatform].pace}</div>
          </div>
        )}
      </div>

      {/* POV / 배경 / 감정 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{tl('planningExtra.povCharacter')}</label>
          <input className="w-full bg-bg-tertiary border border-border rounded-xl p-4 text-sm font-bold text-text-primary placeholder:text-text-tertiary focus:border-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color]" placeholder={tl('planningExtra.povPlaceholder')} maxLength={100} value={config.povCharacter} onChange={e => setConfig({ ...config, povCharacter: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{tl('planningExtra.settingLabel')}</label>
          <input className="w-full bg-bg-tertiary border border-border rounded-xl p-4 text-sm font-bold text-text-primary placeholder:text-text-tertiary focus:border-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color]" placeholder={tl('planningExtra.settingPlaceholder')} maxLength={300} value={config.setting} onChange={e => setConfig({ ...config, setting: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{tl('planningExtra.coreEmotion')}</label>
          <input className="w-full bg-bg-tertiary border border-border rounded-xl p-4 text-sm font-bold text-text-primary placeholder:text-text-tertiary focus:border-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color]" placeholder={tl('planningExtra.emotionPlaceholder')} value={config.primaryEmotion} onChange={e => setConfig({ ...config, primaryEmotion: e.target.value })} />
        </div>
      </div>

      {/* 시놉시스 */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{t.synopsis}</label>
        <textarea className="w-full bg-bg-tertiary border border-border rounded-2xl p-6 text-sm h-64 resize-none text-text-primary placeholder:text-text-tertiary focus:border-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 font-serif leading-relaxed" placeholder={t.synopsisPlaceholder} maxLength={5000} value={config.synopsis} onChange={e => setConfig({ ...config, synopsis: e.target.value })} />
      </div>

      {/* 세계관 작성 가이드 배너 */}
      <WorldBuildingGuide language={language} config={config} />

      {/* 세계관 Tier 1 */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{t.worldTier1}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'corePremise', label: t.corePremise, ph: t.corePremisePH },
            { key: 'powerStructure', label: t.powerStructure, ph: t.powerStructurePH },
            { key: 'currentConflict', label: t.currentConflict, ph: t.currentConflictPH },
          ] as const).map(f => (
            <div key={f.key} className="space-y-2">
              <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                {(config[f.key] as string)?.trim() ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-text-quaternary" />}
                {f.label}
              </label>
              <textarea className="w-full bg-bg-tertiary border border-border rounded-xl p-4 text-sm h-24 resize-none text-text-primary placeholder:text-text-tertiary focus:border-blue-600 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 leading-relaxed" placeholder={f.ph} value={(config[f.key] as string) ?? ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        {(config.corePremise || config.currentConflict) && (
          <div className="p-4 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
            <span className="text-[10px] font-black text-accent-purple/60 uppercase tracking-widest">{t.worldFormula}</span>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
              {tl('planningExtra.worldFormulaSentence').replace('{premise}', config.corePremise || '___').replace('{genre}', config.genre).replace('{power}', config.powerStructure || '___').replace('{conflict}', config.currentConflict || '___')}
            </p>
          </div>
        )}
        {(() => { const w = validateWorld(config, language); const s = calcCompletionScore(w, 11); return (<div className="space-y-2 mt-4"><CompletionBar score={s} language={language} /><WarningBadge warnings={w} language={language} /></div>); })()}
      </div>

      {/* Tier 2 */}
      <div className="space-y-4 pt-6 border-t border-border">
        <button type="button" onClick={() => setShowWorldTier2(v => !v)} className="text-[10px] font-black text-text-tertiary uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-text-secondary transition-colors">
          {showWorldTier2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {t.worldTier2}
        </button>
        {showWorldTier2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { key: 'worldHistory', label: t.worldHistory, ph: t.worldHistoryPH },
              { key: 'socialSystem', label: t.socialSystem, ph: t.socialSystemPH },
              { key: 'economy', label: t.economy, ph: t.economyPH },
              { key: 'magicTechSystem', label: t.magicTechSystem, ph: t.magicTechSystemPH },
              { key: 'factionRelations', label: t.factionRelations, ph: t.factionRelationsPH },
              { key: 'survivalEnvironment', label: t.survivalEnvironment, ph: t.survivalEnvironmentPH },
            ] as const).map(f => (
              <div key={f.key} className="space-y-2">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                  {(config[f.key] as string)?.trim() ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-text-quaternary" />}
                  {f.label}
                </label>
                <textarea className="w-full bg-bg-tertiary border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none text-text-primary placeholder:text-text-tertiary focus:border-amber-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 leading-relaxed" placeholder={f.ph} value={(config[f.key] as string) ?? ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier 3 */}
      <div className="space-y-4 pt-6 border-t border-border">
        <button type="button" onClick={() => setShowWorldTier3(v => !v)} className="text-[10px] font-black text-text-tertiary uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-text-secondary transition-colors">
          {showWorldTier3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {t.worldTier3}
        </button>
        {showWorldTier3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { key: 'culture', label: t.culture, ph: t.culturePH },
              { key: 'religion', label: t.religion, ph: t.religionPH },
              { key: 'education', label: t.education, ph: t.educationPH },
              { key: 'lawOrder', label: t.lawOrder, ph: t.lawOrderPH },
              { key: 'taboo', label: t.taboo, ph: t.tabooPH },
              { key: 'dailyLife', label: t.dailyLife, ph: t.dailyLifePH },
              { key: 'travelComm', label: t.travelComm, ph: t.travelCommPH },
              { key: 'truthVsBeliefs', label: t.truthVsBeliefs, ph: t.truthVsBeliefsPH },
            ] as const).map(f => (
              <div key={f.key} className="space-y-2">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                  {(config[f.key] as string)?.trim() ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-text-quaternary" />}
                  {f.label}
                </label>
                <textarea className="w-full bg-bg-tertiary border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none text-text-primary placeholder:text-text-tertiary focus:border-emerald-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 leading-relaxed" placeholder={f.ph} value={(config[f.key] as string) ?? ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tension Curve */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" /> {te.tensionPreview}
        </h3>
        <div className="bg-bg-tertiary/40 rounded-2xl border border-border/50 p-4">
          <div className="h-20 flex items-end gap-px">
            {tensionData.map((td, i) => {
              const height = Math.round(td * 100);
              const isCurrentEp = i + 1 === config.episode;
              return (
                <div key={i} className="flex-1 relative h-full group cursor-default">
                  <div className={`absolute bottom-0 w-full rounded-t-sm transition-[transform,opacity,background-color,border-color,color] duration-300 ${isCurrentEp ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-gradient-to-t from-blue-600/40 to-indigo-400/20'}`} style={{ height: `${height}%` }} />
                  {isCurrentEp && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-tertiary text-text-secondary text-[7px] px-1 py-0.5 rounded whitespace-nowrap">EP.{i + 1}: {height}%</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-text-tertiary mt-2"><span>EP.1</span><span>EP.{totalEpisodes}</span></div>
        </div>
      </div>

      {/* Guardrails */}
      <div className="space-y-6 pt-6 border-t border-border">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {tl('planningExtra.narrativeGuardrails')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase"><span>{t.minDensity}</span><span>{config.guardrails.min}{tl('planningExtra.chars')}</span></div>
            <input type="range" min="1000" max="10000" step="500" aria-label={t.minDensity} className="w-full accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none" value={config.guardrails.min} onChange={e => setConfig({...config, guardrails: {...config.guardrails, min: parseInt(e.target.value)}})} />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase"><span>{t.maxCapacity}</span><span>{config.guardrails.max}{tl('planningExtra.chars')}</span></div>
            <input type="range" min="2000" max="15000" step="500" aria-label={t.maxCapacity} className="w-full accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none" value={config.guardrails.max} onChange={e => setConfig({...config, guardrails: {...config.guardrails, max: parseInt(e.target.value)}})} />
          </div>
        </div>
      </div>

      {/* PRISM */}
      <div className="space-y-6 pt-6 border-t border-border">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2"><Shield className="w-4 h-4" /> {tl('planningExtra.prismTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase"><span>{tl('planningExtra.prismPreserve')}</span><span className="font-mono">{config.prismPreserve ?? 100}</span></div>
            <input type="range" min="0" max="150" step="5" aria-label={tl('planningExtra.prismPreserve')} className="w-full accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none" value={config.prismPreserve ?? 100} onChange={e => setConfig({ ...config, prismPreserve: parseInt(e.target.value) })} />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase"><span>{tl('planningExtra.prismExpand')}</span><span className="font-mono">{config.prismScale ?? 120}</span></div>
            <input type="range" min="0" max="150" step="5" aria-label={tl('planningExtra.prismExpand')} className="w-full accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none" value={config.prismScale ?? 120} onChange={e => setConfig({ ...config, prismScale: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { label: tl('planningExtra.prism100'), preserve: 100, scale: 100 },
            { label: tl('planningExtra.prism105'), preserve: 100, scale: 105 },
            { label: tl('planningExtra.prism120'), preserve: 100, scale: 120 },
            { label: tl('planningExtra.prism135'), preserve: 100, scale: 135 },
            { label: tl('planningExtra.prism150'), preserve: 100, scale: 150 },
          ]).map(p => {
            const isActive = (config.prismPreserve ?? 100) === p.preserve && (config.prismScale ?? 120) === p.scale;
            return (<button key={p.scale} onClick={() => setConfig({ ...config, prismPreserve: p.preserve, prismScale: p.scale })} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors font-mono ${isActive ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400' : 'bg-bg-secondary border border-border text-text-tertiary hover:text-text-secondary'}`}>PRISM-{p.scale} {p.label}</button>);
          })}
        </div>
      </div>

      {/* PRISM-MODE */}
      <div className="space-y-6 pt-6 border-t border-border">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2"><Shield className="w-4 h-4" /> {tl('planningExtra.prismModeTitle')}</h3>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'OFF' as const, label: tl('planningExtra.prismModeOff'), desc: tl('planningExtra.prismModeOffDesc') },
            { key: 'FREE' as const, label: tl('planningExtra.prismModeFree'), desc: tl('planningExtra.prismModeFreeDesc') },
            { key: 'ALL' as const, label: tl('planningExtra.prismModeAll'), desc: tl('planningExtra.prismModeAllDesc') },
            { key: 'T15' as const, label: tl('planningExtra.prismModeT15'), desc: tl('planningExtra.prismModeT15Desc') },
            { key: 'M18' as const, label: tl('planningExtra.prismModeM18'), desc: tl('planningExtra.prismModeM18Desc') },
            { key: 'CUSTOM' as const, label: tl('planningExtra.prismModeCustom'), desc: tl('planningExtra.prismModeCustomDesc') },
          ]).map(pm => (
            <button key={pm.key} onClick={() => setConfig({ ...config, prismMode: pm.key })}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors font-mono ${(config.prismMode ?? 'OFF') === pm.key ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400' : 'bg-bg-secondary border border-border text-text-tertiary hover:text-text-secondary'}`}
              title={pm.desc}>{pm.label}</button>
          ))}
        </div>
        {/* 선택된 등급 설명 + 국가별 등급 기준 안내 */}
        {(() => {
          const activePm = ([
            { key: 'OFF', desc: tl('planningExtra.prismModeOffDesc') },
            { key: 'FREE', desc: tl('planningExtra.prismModeFreeDesc') },
            { key: 'ALL', desc: tl('planningExtra.prismModeAllDesc') },
            { key: 'T15', desc: tl('planningExtra.prismModeT15Desc') },
            { key: 'M18', desc: tl('planningExtra.prismModeM18Desc') },
            { key: 'CUSTOM', desc: tl('planningExtra.prismModeCustomDesc') },
          ] as const).find(p => p.key === (config.prismMode ?? 'OFF'));
          return (
            <div className="space-y-1.5 mt-2">
              {activePm && (
                <p className="text-[10px] text-text-secondary font-mono">
                  {activePm.key}: {activePm.desc}
                </p>
              )}
              <p className="text-[9px] text-text-tertiary font-mono">
                {tl('planningExtra.ratingGuide')}
              </p>
            </div>
          );
        })()}
        {config.prismMode === 'CUSTOM' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-4 p-4 bg-bg-secondary/50 border border-border rounded-xl">
            {(['sexual', 'violence', 'profanity'] as const).map(axis => {
              const labelKey = axis === 'sexual' ? 'prismSexual' : axis === 'violence' ? 'prismViolence' : 'prismProfanity';
              const val = config.prismCustom?.[axis] ?? 0;
              return (
                <div key={axis} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase"><span>{tl(`planningExtra.${labelKey}`)}</span><span className="font-mono">{val}/5</span></div>
                  <input type="range" min="0" max="5" step="1" aria-label={tl(`planningExtra.${labelKey}`)} className="w-full accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none" value={val}
                    onChange={e => setConfig({ ...config, prismCustom: { sexual: config.prismCustom?.sexual ?? 0, violence: config.prismCustom?.violence ?? 0, profanity: config.prismCustom?.profanity ?? 0, [axis]: parseInt(e.target.value) } })} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================
// WorldBuildingGuide — 세계관 작성 순서 안내 배너
// ============================================================

function WorldBuildingGuide({ language, config }: { language: AppLanguage; config: StoryConfig }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('noa_world_guide_dismissed') === '1'; } catch { return false; }
  });

  // Auto-dismiss after first view (5 seconds)
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => {
      // Don't auto-dismiss; let user collapse manually
    }, 5000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const tier1Filled = [config.corePremise, config.powerStructure, config.currentConflict]
    .filter(v => v?.trim()).length;
  const tier2Filled = [config.worldHistory, config.socialSystem, config.economy, config.magicTechSystem, config.factionRelations, config.survivalEnvironment]
    .filter(v => (v as string | undefined)?.trim()).length;
  const tier3Filled = [config.culture, config.religion, config.education, config.lawOrder, config.taboo, config.dailyLife, config.travelComm, config.truthVsBeliefs]
    .filter(v => (v as string | undefined)?.trim()).length;
  const totalFilled = tier1Filled + tier2Filled + tier3Filled;
  const totalFields = 3 + 6 + 8; // 17

  if (dismissed) {
    return (
      <div className="pt-4">
        <button
          type="button"
          onClick={() => {
            setDismissed(false);
            try { localStorage.removeItem('noa_world_guide_dismissed'); } catch { /* private */ }
          }}
          className="flex items-center gap-1.5 text-[9px] text-text-quaternary hover:text-text-tertiary transition-colors"
        >
          <Info className="w-3 h-3" />
          {L4(language, { ko: '세계관 가이드 보기', en: 'Show world guide', ja: '世界観ガイド表示', zh: '显示世界观指南' })}
          <span className="font-mono text-accent-amber">({totalFilled}/{totalFields})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="relative p-4 bg-[linear-gradient(135deg,rgba(255,200,50,0.04),rgba(100,130,255,0.04))] border border-border/60 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem('noa_world_guide_dismissed', '1'); } catch { /* quota/private */ }
          }}
          className="absolute top-2.5 right-3 text-text-quaternary hover:text-text-tertiary transition-colors text-[9px]"
          aria-label="Close guide"
        >
          {L4(language, { ko: '접기', en: 'Hide', ja: '閉じる', zh: '收起' })}
        </button>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="text-[10px] font-bold text-text-secondary">
              {L4(language, { ko: '세계관 작성 순서', en: 'World Building Order', ja: '世界観作成順序', zh: '世界观创作顺序' })}
            </div>
            <div className="space-y-1.5 text-[10px] text-text-tertiary">
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${tier1Filled === 3 ? 'text-emerald-400' : 'text-accent-amber'}`}>1</span>
                <span>{L4(language, {
                  ko: '한 줄 세계관 (핵심 전제, 권력 구조, 현재 갈등)',
                  en: 'Core premise (premise, power structure, current conflict)',
                  ja: '一行世界観（核心前提・権力構造・現在の葛藤）',
                  zh: '一句世界观（核心前提、权力结构、当前冲突）',
                })}</span>
                <span className="ml-auto text-[8px] font-mono">{tier1Filled}/3</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${tier2Filled === 6 ? 'text-emerald-400' : 'text-text-quaternary'}`}>2</span>
                <span>{L4(language, {
                  ko: '주요 설정 (역사, 사회, 경제, 마법/기술, 세력, 환경)',
                  en: 'Key settings (history, society, economy, magic/tech, factions, environment)',
                  ja: '主要設定（歴史・社会・経済・魔法/技術・勢力・環境）',
                  zh: '主要设定（历史、社会、经济、魔法/科技、势力、环境）',
                })}</span>
                <span className="ml-auto text-[8px] font-mono">{tier2Filled}/6</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${tier3Filled === 8 ? 'text-emerald-400' : 'text-text-quaternary'}`}>3</span>
                <span>{L4(language, {
                  ko: '세부 사항 (문화, 종교, 교육, 법, 금기, 일상, 교통, 진실)',
                  en: 'Details (culture, religion, education, law, taboo, daily life, travel, truth)',
                  ja: '詳細（文化・宗教・教育・法・禁忌・日常・交通・真実）',
                  zh: '细节（文化、宗教、教育、法律、禁忌、日常、交通、真相）',
                })}</span>
                <span className="ml-auto text-[8px] font-mono">{tier3Filled}/8</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color] duration-500 bg-gradient-to-r from-accent-amber to-emerald-400"
                  style={{ width: `${Math.round((totalFilled / totalFields) * 100)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-text-quaternary">{Math.round((totalFilled / totalFields) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedPlanningSection;
