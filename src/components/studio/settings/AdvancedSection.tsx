"use client";

// ============================================================
// PART 1 — Imports, State, and Shell
// ============================================================

import React, { useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  ChevronDown, Zap, Monitor, Smartphone, Hash, Thermometer, BookOpen, HelpCircle, Shield,
} from 'lucide-react';
import { setNarrativeDepth as narrativeDepthSetter } from '@/lib/noa/lora-swap';
import ApiKeysSection from '@/components/studio/settings/ApiKeysSection';
import { getFallbackPreference, setFallbackPreference } from '@/hooks/useSparkHealth';
import { TermTooltip } from '@/components/ui/TermTooltip';

interface AdvancedSectionProps {
  language: AppLanguage;
  hostedProviders?: Partial<Record<string, boolean>>;
  onManageApiKey: () => void;
}

const AdvancedSection: React.FC<AdvancedSectionProps> = ({ language, hostedProviders, onManageApiKey }) => {
  const t = createT(language);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [defaultPlatform, setDefaultPlatform] = useState<string>(() => { try { return (typeof window !== 'undefined' ? localStorage.getItem('noa_default_platform') : null) || 'MOBILE'; } catch (err) { logger.warn('AdvancedSection', 'read noa_default_platform failed', err); return 'MOBILE'; } });
  const [defaultEpisodes, setDefaultEpisodes] = useState<number>(() => { try { return parseInt((typeof window !== 'undefined' ? localStorage.getItem('noa_default_episodes') : null) || '25'); } catch (err) { logger.warn('AdvancedSection', 'read noa_default_episodes failed', err); return 25; } });
  const [temperature, setTemperature] = useState<number>(() => { try { return parseFloat((typeof window !== 'undefined' ? localStorage.getItem('noa_temperature') : null) || '0.9'); } catch (err) { logger.warn('AdvancedSection', 'read noa_temperature failed', err); return 0.9; } });
  const [narrativeDepth, setNarrativeDepthState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    let stored: string | null = null;
    try { stored = localStorage.getItem('noa_narrative_depth'); } catch (err) { logger.warn('AdvancedSection', 'read noa_narrative_depth failed', err); }
    const val = stored ? parseFloat(stored) : 1.0;
    narrativeDepthSetter(val);
    return val;
  });
  // [BYOK fallback] DGX Spark 다운 시 BYOK 자동 전환 선호 (기본 true)
  const [byokFallback, setByokFallbackState] = useState<boolean>(() => getFallbackPreference());
  const persistByokFallback = (enabled: boolean) => {
    setByokFallbackState(enabled);
    setFallbackPreference(enabled);
  };

  // ============================================================
  // PART 2 — Persistence helpers (localStorage writes)
  // ============================================================
  const persistPlatform = (p: string) => {
    setDefaultPlatform(p);
    try { localStorage.setItem('noa_default_platform', p); } catch (err) { logger.warn('AdvancedSection', 'save noa_default_platform failed', err); }
  };
  const persistEpisodes = (v: number) => {
    setDefaultEpisodes(v);
    try { localStorage.setItem('noa_default_episodes', String(v)); } catch (err) { logger.warn('AdvancedSection', 'save noa_default_episodes failed', err); }
  };
  const persistTemperature = (v: number) => {
    setTemperature(v);
    try { localStorage.setItem('noa_temperature', String(v)); } catch (err) { logger.warn('AdvancedSection', 'save noa_temperature failed', err); }
  };
  const persistNarrativeDepth = (v: number) => {
    setNarrativeDepthState(v);
    try { localStorage.setItem('noa_narrative_depth', String(v)); } catch (err) { logger.warn('AdvancedSection', 'save noa_narrative_depth failed', err); }
    narrativeDepthSetter(v);
  };

  const depthLabel = narrativeDepth <= 0.9 ? L4(language, { ko: '평작 — 가독성 우선', en: 'Light — Readability first', ja: 'Light — Readability first', zh: 'Light — Readability first' }) :
    narrativeDepth <= 1.0 ? L4(language, { ko: '기본 — 장르 균형', en: 'Standard — Genre balance', ja: '標準 — ジャンルのバランス', zh: '标准 — 类型均衡' }) :
    narrativeDepth <= 1.2 ? L4(language, { ko: '심화 — 비유/상징 활용', en: 'Deep — Metaphor/symbolism', ja: 'Deep — Metaphor/symbolism', zh: 'Deep — Metaphor/symbolism' }) :
    L4(language, { ko: '최대 — 문예 수준 밀도', en: 'Maximum — Literary density', ja: '最大 — 文芸レベルの密度', zh: '最大 — 文学级密度' });

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <Zap className="w-4 h-4 text-accent-blue shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, { ko: '고급', en: 'Advanced', ja: '詳細設定', zh: '高级' })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="md:col-span-2 ds-card-lg">
          <button
            onClick={() => setAdvancedOpen(prev => !prev)}
            className="w-full flex items-center justify-between mb-4 group cursor-pointer"
          >
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-blue" /> {t('settingsEngine.engineSettings')}
            </h3>
            <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="text-[13px] text-text-tertiary mb-4">
            {L4(language, { ko: '노아 엔진 연결, 창의성 조절 등 기술적인 설정입니다.', en: 'Technical settings including NOA engine connection and creativity tuning.', ja: 'ノアエンジン接続や創造性調整などの技術設定です。', zh: '诺亚引擎连接和创造性调整等技术设置。' })}
          </p>

          {/* ============================================================ */}
          {/* PART 3 — Expanded advanced controls                          */}
          {/* ============================================================ */}
          {advancedOpen && <div className="space-y-2">
            <ApiKeysSection language={language} hostedProviders={hostedProviders} onManageApiKey={onManageApiKey} />

            {/* Default Platform */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  {defaultPlatform === 'MOBILE' ? <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /> : <Monitor className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settingsEngine.defaultPlatform')}</div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settingsEngine.defaultPlatformDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {(['MOBILE', 'WEB'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => persistPlatform(p)}
                    className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${defaultPlatform === p ? 'bg-accent-blue text-text-primary' : 'bg-bg-secondary text-text-tertiary hover:text-text-primary'}`}
                  >
                    {p === 'MOBILE' ? t('settingsEngine.mobile') : t('settingsEngine.web')}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Episodes */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Hash className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settingsEngine.defaultEpisodes')}</div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settingsEngine.defaultEpisodesDesc')}</div>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                value={defaultEpisodes}
                onChange={e => persistEpisodes(parseInt(e.target.value) || 25)}
                className="w-16 md:w-20 bg-bg-secondary border border-border rounded-xl px-2 md:px-3 py-2 text-xs md:text-sm font-black text-center text-accent-blue focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 shrink-0"
              />
            </div>

            {/* Temperature */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Thermometer className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">{t('settingsEngine.temperature')}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '낮을수록 안정적이고 예측 가능, 높을수록 독창적이고 예측 불가', en: 'Lower = stable & predictable, Higher = creative & unpredictable', ja: '低いほど安定的で予測可能、高いほど独創的で予測不能', zh: '越低越稳定可预测，越高越独创不可预测' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settingsEngine.temperatureDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={e => persistTemperature(parseFloat(e.target.value))}
                  className="w-20 md:w-24 accent-accent-blue h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className={`text-xs md:text-sm font-black w-7 md:w-8 text-right ${temperature < 0.1 || temperature > 1.5 ? 'text-accent-red' : 'text-accent-blue'}`}>{temperature.toFixed(1)}</span>
              </div>
            </div>

            {/* BYOK Fallback (DGX down → 자동 전환) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">
                    {language === 'KO' ? (
                      <>DGX 다운 시 <TermTooltip term="BYOK">BYOK</TermTooltip> 자동 사용</>
                    ) : (
                      <>Auto <TermTooltip term="BYOK">BYOK</TermTooltip> on DGX down</>
                    )}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '권장: 로컬 엔진이 응답 없을 때 자신의 API 키로 자동 전환', en: 'Recommended: auto-switch to your API key when local engine is unresponsive', ja: '推奨:ローカルエンジン無応答時に自身のAPIキーへ自動切替', zh: '推荐:本地引擎无响应时自动切换到您的API密钥' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '서비스 중단 방지 — BYOK 키가 설정된 경우에만 동작',
                      en: 'Avoids downtime — works only when a BYOK key is configured',
                      ja: 'ダウンタイムを回避 — BYOKキー設定時のみ動作',
                      zh: '避免停机 — 仅在配置了BYOK密钥时有效',
                    })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={byokFallback}
                onClick={() => persistByokFallback(!byokFallback)}
                className={`relative w-11 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 shrink-0 ${byokFallback ? 'bg-accent-green' : 'bg-bg-tertiary'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${byokFallback ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {/* Narrative Depth Slider */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-accent-purple shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">{L4(language, { ko: '서사 깊이', en: 'Narrative Depth', ja: 'Narrative Depth', zh: 'Narrative Depth' })}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '낮을수록 간결하고 빠른 전개, 높을수록 묘사가 풍부', en: 'Lower = concise & fast pacing, Higher = rich descriptions', ja: '低いほど簡潔で速い展開、高いほど描写が豊か', zh: '越低越简洁节奏快，越高描写越丰富' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{depthLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={narrativeDepth}
                  onChange={e => persistNarrativeDepth(parseFloat(e.target.value))}
                  className="w-20 md:w-24 accent-purple-500 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className={`text-xs md:text-sm font-black w-7 md:w-8 text-right ${narrativeDepth < 0.5 || narrativeDepth > 2.0 ? 'text-accent-red' : 'text-accent-purple'}`}>{narrativeDepth.toFixed(1)}</span>
              </div>
            </div>

          </div>}
        </div>
      </div>
    </details>
  );
};

export default AdvancedSection;
