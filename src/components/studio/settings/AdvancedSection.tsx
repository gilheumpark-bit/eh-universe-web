"use client";

// ============================================================
// PART 1 — Imports, State, and Shell
// ============================================================

import React, { useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  ChevronDown, Zap, Monitor, Smartphone, Hash, Thermometer, BookOpen, HelpCircle, Shield, Sparkles,
} from 'lucide-react';
import type { DraftDetailMode } from '@/lib/feature-flags';
import { setNarrativeDepth as narrativeDepthSetter } from '@/lib/noa/lora-swap';
import ApiKeysSection from '@/components/studio/settings/ApiKeysSection';
import { getFallbackPreference, setFallbackPreference } from '@/hooks/useSparkHealth';
import { TermTooltip } from '@/components/ui/TermTooltip';
import { isOriginBadgeVisible, setOriginBadgeVisible } from '@/components/studio/OriginBadge';

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
  // [M4] 출처 뱃지 항상 표시 토글 (기본 false — 초보 작가 노출 0)
  const [originBadgeShown, setOriginBadgeShownState] = useState<boolean>(() => isOriginBadgeVisible());
  const persistOriginBadgeShown = (enabled: boolean) => {
    setOriginBadgeShownState(enabled);
    setOriginBadgeVisible(enabled);
  };

  // [Task 4 Phase 3] Draft+Detail 실험 파이프라인 플래그 토글 — 기본 'off'.
  // localStorage('noa_flag_draft_detail_v2') 에 'off'|'shadow'|'on' 저장.
  // Settings 에서만 접근 — feature-flags.ts 기본값은 절대 바꾸지 않음.
  const [draftDetailMode, setDraftDetailModeState] = useState<DraftDetailMode>(() => {
    if (typeof window === 'undefined') return 'off';
    try {
      const raw = localStorage.getItem('noa_flag_draft_detail_v2');
      if (raw === 'off' || raw === 'shadow' || raw === 'on') return raw;
    } catch (err) {
      logger.warn('AdvancedSection', 'read noa_flag_draft_detail_v2 failed', err);
    }
    return 'off';
  });
  const persistDraftDetailMode = (mode: DraftDetailMode) => {
    setDraftDetailModeState(mode);
    try {
      localStorage.setItem('noa_flag_draft_detail_v2', mode);
      // 같은 탭 내 버튼 컴포넌트가 재평가하도록 이벤트 발송.
      window.dispatchEvent(
        new CustomEvent('noa:feature-flag-changed', {
          detail: { flag: 'FEATURE_DRAFT_DETAIL_V2', value: mode },
        }),
      );
    } catch (err) {
      logger.warn('AdvancedSection', 'save noa_flag_draft_detail_v2 failed', err);
    }
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

            {/* Temperature — M8: Pattern B (Preset > Knob)
                3 프리셋 (자연스럽게 / 균형 / 강하게) 위, 슬라이더 아래 보조.
                "Temperature" 라는 용어는 기술적이므로 작가용 라벨 "창의성"을 병기.  */}
            <div className="p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0 mb-3">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Thermometer className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">
                    {L4(language, { ko: '창의성 (Temperature)', en: 'Creativity (Temperature)', ja: '創造性 (Temperature)', zh: '创造性 (Temperature)' })}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '낮을수록 안정적이고 예측 가능, 높을수록 독창적이고 예측 불가', en: 'Lower = stable & predictable, Higher = creative & unpredictable', ja: '低いほど安定的で予測可能、高いほど独創的で予測不能', zh: '越低越稳定可预测，越高越独创不可预测' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '프리셋을 고르면 됩니다. 세밀 조정이 필요할 때만 슬라이더를 사용하세요.',
                      en: 'Pick a preset. Use the slider only for fine tuning.',
                      ja: 'プリセットを選べば大丈夫。細かく調整したいときだけスライダーを使ってください。',
                      zh: '选择一个预设即可。需要精细调整时再使用滑块。',
                    })}
                  </div>
                </div>
              </div>
              {/* 3 프리셋 버튼 (Pattern B) */}
              <div
                role="radiogroup"
                aria-label={L4(language, { ko: '창의성 프리셋', en: 'Creativity preset', ja: '創造性プリセット', zh: '创造性预设' })}
                className="grid grid-cols-3 gap-2 mb-3"
              >
                {([
                  { val: 0.6, label: { ko: '자연스럽게', en: 'Natural', ja: '自然に', zh: '自然' } },
                  { val: 0.9, label: { ko: '균형', en: 'Balanced', ja: 'バランス', zh: '均衡' } },
                  { val: 1.2, label: { ko: '강하게', en: 'Bold', ja: '強めに', zh: '强烈' } },
                ] as const).map(p => {
                  // [C] 부동소수 오차 0.01 내 근사 매칭
                  const selected = Math.abs(temperature - p.val) < 0.05;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`m8-temp-preset-${p.val}`}
                      onClick={() => persistTemperature(p.val)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue ${
                        selected
                          ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue'
                          : 'bg-bg-secondary border border-border text-text-secondary hover:border-accent-blue/30'
                      }`}
                    >
                      {L4(language, p.label)}
                    </button>
                  );
                })}
              </div>
              {/* 슬라이더 — 세밀 조정용, 시각적으로 secondary */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-widest shrink-0">
                  {L4(language, { ko: '세밀 조정', en: 'Fine tune', ja: '微調整', zh: '精调' })}
                </span>
                <input
                  type="range"
                  aria-label={L4(language, { ko: '창의성 세밀 조정', en: 'Creativity fine tune', ja: '創造性の微調整', zh: '创造性精调' })}
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={e => persistTemperature(parseFloat(e.target.value))}
                  className="flex-1 accent-accent-blue h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className={`text-xs md:text-sm font-black w-7 md:w-8 text-right font-mono ${temperature < 0.1 || temperature > 1.5 ? 'text-accent-red' : 'text-accent-blue'}`}>{temperature.toFixed(1)}</span>
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

            {/* M4 — Origin Badge Always Visible (default off) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">
                    {L4(language, {
                      ko: '출처 뱃지 항상 표시',
                      en: 'Always Show Origin Badges',
                      ja: '出典バッジを常に表示',
                      zh: '始终显示来源徽章',
                    })}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, {
                          ko: '씬시트 항목별 입력 출처(작가/기본/제안/초안)를 항상 표시',
                          en: 'Always show input origin (Author/Preset/Hint/Draft) per scene-sheet item',
                          ja: 'シーンシートの項目別入力出典(作家/既定/提案/草案)を常に表示',
                          zh: '场景表项目级输入来源(作家/预设/建议/草案)始终显示',
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '기본 끔 — 켜면 14필드 옆에 작은 뱃지가 항상 보입니다',
                      en: 'Default off — when on, small badges appear next to all 14 fields',
                      ja: '既定オフ — オンにすると14項目に小さなバッジが常時表示',
                      zh: '默认关闭 — 开启后14个字段旁始终显示小徽章',
                    })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={originBadgeShown}
                onClick={() => persistOriginBadgeShown(!originBadgeShown)}
                className={`relative w-11 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 shrink-0 ${originBadgeShown ? 'bg-accent-green' : 'bg-bg-tertiary'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${originBadgeShown ? 'translate-x-5' : 'translate-x-0.5'}`}
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

            {/* ============================================================ */}
            {/* PART 4 — Task 4 Draft+Detail 실험 파이프라인 (기본 'off')     */}
            {/* ============================================================ */}
            <div
              className="p-4 md:p-6 rounded-3xl border border-transparent"
              data-testid="advanced-draft-detail-toggle"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0 mb-3">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs md:text-sm font-bold truncate">
                    {L4(language, {
                      ko: 'Draft + Detail 파이프라인 (실험)',
                      en: 'Experimental: Draft + Detail',
                      ja: 'Draft + Detail パイプライン (実験)',
                      zh: 'Draft + Detail 流水线 (实验)',
                    })}
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '초안(4,000자) 생성 후 "AI 살 붙이기"를 작가가 선택하는 2-Pass 경로. 이 기능은 실험적입니다. 플래그 변경 시 새로고침 필요.',
                      en: 'Two-pass path: draft (~4,000 chars) then author-initiated AI expansion. Experimental. Reload after changing flag.',
                      ja: '下書き(4,000字)生成後、作家が「AIで肉付け」を選ぶ2-Passパス。実験的機能。フラグ変更後にリロードが必要。',
                      zh: '先生成初稿(4,000字)，作家再选择「AI扩写」的两阶段路径。实验功能。更改标志后需刷新。',
                    })}
                  </div>
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label={L4(language, {
                  ko: 'Draft+Detail 파이프라인 모드',
                  en: 'Draft+Detail pipeline mode',
                  ja: 'Draft+Detail パイプラインモード',
                  zh: 'Draft+Detail 流水线模式',
                })}
                className="grid grid-cols-3 gap-2"
              >
                {([
                  {
                    val: 'off' as const,
                    label: { ko: '끔 (기본)', en: 'Off (default)', ja: 'オフ (既定)', zh: '关闭 (默认)' },
                  },
                  {
                    val: 'shadow' as const,
                    label: { ko: 'Shadow (힌트만)', en: 'Shadow (prompt hints)', ja: 'Shadow (ヒントのみ)', zh: 'Shadow (仅提示)' },
                  },
                  {
                    val: 'on' as const,
                    label: { ko: '전면 활성', en: 'Full on', ja: '完全有効', zh: '完全开启' },
                  },
                ]).map((opt) => {
                  const selected = draftDetailMode === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`draft-detail-mode-${opt.val}`}
                      onClick={() => persistDraftDetailMode(opt.val)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue ${
                        selected
                          ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue'
                          : 'bg-bg-secondary border border-border text-text-secondary hover:border-accent-blue/30'
                      }`}
                    >
                      {L4(language, opt.label)}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>}
        </div>
      </div>
    </details>
  );
};

export default AdvancedSection;
