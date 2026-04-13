"use client";

// ============================================================
// DirectionReferencePanel — 연출/참고/캐릭터 선택 통합 패널
// 집필 탭 오른쪽 분할 뷰에 표시
// ============================================================

import React, { useState, useCallback } from 'react';
import { X, Users, BookOpen, Clapperboard, Check, ChevronDown } from 'lucide-react';
import type { StoryConfig, AppLanguage, Character, SceneDirectionData } from '@/lib/studio-types';

// ============================================================
// PART 1 — Types & Props
// ============================================================

type PanelTab = 'direction' | 'reference' | 'characters';

interface Props {
  config: StoryConfig;
  language: AppLanguage;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onClose: () => void;
}

// ============================================================
// PART 2 — 이번 화 등장인물 선택 (체크박스)
// ============================================================

function CharacterSelector({ config, language, setConfig }: { config: StoryConfig; language: AppLanguage; setConfig: Props['setConfig'] }) {
  const isKO = language === 'KO';
  const characters = config.characters || [];
  const active = config.sceneDirection?.activeCharacters || [];

  const toggle = useCallback((name: string) => {
    setConfig(prev => {
      const sd = prev.sceneDirection || {};
      const current = sd.activeCharacters || [];
      const next = current.includes(name)
        ? current.filter(n => n !== name)
        : [...current, name];
      return { ...prev, sceneDirection: { ...sd, activeCharacters: next } };
    });
    // Notify session persistence layer of config change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noa:config-changed'));
    }
  }, [setConfig]);

  const selectAll = useCallback(() => {
    setConfig(prev => {
      const sd = prev.sceneDirection || {};
      return { ...prev, sceneDirection: { ...sd, activeCharacters: characters.map(c => c.name) } };
    });
  }, [setConfig, characters]);

  const clearAll = useCallback(() => {
    setConfig(prev => {
      const sd = prev.sceneDirection || {};
      return { ...prev, sceneDirection: { ...sd, activeCharacters: [] } };
    });
  }, [setConfig]);

  if (characters.length === 0) {
    return (
      <p className="text-xs text-text-tertiary text-center py-8 italic">
        {isKO ? '등록된 캐릭터가 없습니다. 캐릭터 탭에서 추가하세요.' : 'No characters. Add in Character tab.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          {isKO ? '이번 화 등장인물' : 'Episode Cast'}
        </span>
        <div className="flex gap-1">
          <button onClick={selectAll} className="text-[9px] text-accent-blue hover:underline">{isKO ? '전체' : 'All'}</button>
          <span className="text-text-quaternary">|</span>
          <button onClick={clearAll} className="text-[9px] text-text-tertiary hover:underline">{isKO ? '해제' : 'Clear'}</button>
        </div>
      </div>
      <div className="space-y-1">
        {characters.map(c => {
          const checked = active.includes(c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.name)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                checked
                  ? 'bg-accent-amber/10 border border-accent-amber/30'
                  : 'bg-bg-secondary/30 border border-transparent hover:border-border/50'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                checked ? 'bg-accent-amber border-accent-amber' : 'border-border'
              }`}>
                {checked && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs font-medium text-text-primary truncate">{c.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-tertiary font-mono ml-auto shrink-0">{c.role}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[9px] text-text-quaternary mt-1">
        {isKO
          ? `선택: ${active.length}명 → AI가 이 캐릭터의 성격 강도를 참조합니다`
          : `Selected: ${active.length} → AI will reference full personality for these characters`}
      </p>
    </div>
  );
}

// ============================================================
// PART 3 — 간이 연출 패널 (감정/긴장/메모)
// ============================================================

function QuickDirectionPanel({ config, language, setConfig }: { config: StoryConfig; language: AppLanguage; setConfig: Props['setConfig'] }) {
  const isKO = language === 'KO';
  const sd = config.sceneDirection || {};

  const updateSD = useCallback((patch: Partial<SceneDirectionData>) => {
    setConfig(prev => ({
      ...prev,
      sceneDirection: { ...(prev.sceneDirection || {}), ...patch },
    }));
  }, [setConfig]);

  return (
    <div className="space-y-4">
      {/* 작가 메모 */}
      <div>
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          {isKO ? '작가 메모' : 'Writer Notes'}
        </span>
        <textarea
          value={sd.writerNotes || ''}
          onChange={e => updateSD({ writerNotes: e.target.value })}
          placeholder={isKO ? '이번 화의 핵심 의도, 분위기, 주의사항...' : 'Episode intent, mood, notes...'}
          className="mt-1 w-full h-20 bg-bg-secondary/50 border border-border/50 rounded-lg p-2 text-xs text-text-primary placeholder-text-tertiary resize-none outline-none focus:border-accent-amber/50"
        />
      </div>

      {/* 감정 타겟 간이 */}
      <div>
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          {isKO ? '주요 감정' : 'Primary Emotion'}
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(isKO
            ? ['긴장', '감동', '분노', '공포', '설렘', '슬픔', '희열', '의문']
            : ['Tension', 'Touching', 'Anger', 'Fear', 'Excitement', 'Sadness', 'Joy', 'Mystery']
          ).map(em => (
            <button
              key={em}
              type="button"
              onClick={() => updateSD({ emotionTargets: [{ emotion: em, intensity: 70 }] })}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                sd.emotionTargets?.[0]?.emotion === em
                  ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                  : 'border-border/40 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* 긴장도 슬라이더 */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
            {isKO ? '긴장도' : 'Tension'}
          </span>
          <span className="text-[10px] font-mono text-accent-amber">
            {sd.emotionTargets?.[0]?.intensity ?? 50}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sd.emotionTargets?.[0]?.intensity ?? 50}
          onChange={e => {
            const intensity = parseInt(e.target.value);
            const emotion = sd.emotionTargets?.[0]?.emotion || (isKO ? '긴장' : 'Tension');
            updateSD({ emotionTargets: [{ emotion, intensity }] });
          }}
          className="mt-1 w-full h-1.5 rounded-full appearance-none bg-bg-tertiary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-amber [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* 고구마/사이다 */}
      <div>
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          {isKO ? '고구마/사이다' : 'Frustration/Release'}
        </span>
        <div className="flex gap-1.5 mt-1">
          {[
            { type: 'goguma' as const, label: isKO ? '🍠 고구마' : '🍠 Frustration', color: 'accent-red' },
            { type: 'cider' as const, label: isKO ? '🥤 사이다' : '🥤 Release', color: 'accent-green' },
          ].map(g => (
            <button
              key={g.type}
              type="button"
              onClick={() => {
                const current = sd.goguma || [];
                updateSD({ goguma: [...current, { type: g.type, intensity: 'medium', desc: '' }] });
              }}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border border-border/40 text-text-secondary hover:bg-bg-secondary transition-colors`}
            >
              {g.label} +
            </button>
          ))}
        </div>
        {(sd.goguma || []).length > 0 && (
          <div className="mt-1.5 space-y-1">
            {sd.goguma?.map((g, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <span>{g.type === 'goguma' ? '🍠' : '🥤'}</span>
                <span className="truncate flex-1">{g.desc || (isKO ? '설명 없음' : 'No desc')}</span>
                <button
                  onClick={() => updateSD({ goguma: sd.goguma?.filter((_, j) => j !== i) })}
                  className="text-accent-red/60 hover:text-accent-red"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 씬시트 요약 (훅/클리프/복선) */}
      {sd && (sd.hooks?.length || sd.cliffhanger || sd.foreshadows?.length) ? (
        <div>
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
            {isKO ? '씬시트' : 'Scene Sheet'}
          </span>
          <div className="mt-1 space-y-1 pl-2 border-l-2 border-accent-amber/30">
            {sd.hooks?.slice(0, 3).map((h, i) => (
              <div key={i} className="text-[10px] text-accent-blue/80 truncate">⚓ {h.desc}</div>
            ))}
            {sd.cliffhanger && (
              <div className="text-[10px] text-accent-red/80 truncate">🔚 &ldquo;{sd.cliffhanger.desc}&rdquo;</div>
            )}
            {sd.foreshadows?.filter(f => !f.resolved).slice(0, 3).map((f, i) => (
              <div key={i} className="text-[10px] text-accent-purple/80 truncate">🔮 EP{f.episode}: {f.planted}</div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 에피소드 씬시트 */}
      {config.episodeSceneSheets?.length ? (
        <div>
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
            {isKO ? '에피소드 씬시트' : 'Episode Scenes'}
          </span>
          <div className="mt-1 space-y-1">
            {config.episodeSceneSheets
              .filter(s => s.episode === config.episode)
              .flatMap(s => s.scenes || [])
              .map((scene, i) => (
                <div key={i} className="text-[10px] px-2 py-1 rounded bg-bg-secondary/50 flex items-center gap-1.5">
                  <span className="font-medium text-text-primary truncate">{scene.sceneName || `#${i + 1}`}</span>
                  {scene.tone && <span className="text-[8px] px-1 py-0.5 rounded bg-accent-amber/10 text-accent-amber">{scene.tone}</span>}
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// PART 4 — 참고 패널 (세계관/시놉시스)
// ============================================================

function ReferencePanel({ config, language }: { config: StoryConfig; language: AppLanguage }) {
  const isKO = language === 'KO';
  return (
    <div className="space-y-3">
      {config.synopsis && (
        <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '시놉시스' : 'Synopsis'}</span>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed line-clamp-4">{config.synopsis}</p>
        </div>
      )}
      {config.corePremise && (
        <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '핵심 전제' : 'Core Premise'}</span>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{config.corePremise}</p>
        </div>
      )}
      {config.currentConflict && (
        <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '현재 갈등' : 'Current Conflict'}</span>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{config.currentConflict}</p>
        </div>
      )}
      {config.setting && (
        <div className="p-3 rounded-xl bg-bg-secondary/50 border border-border/50">
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isKO ? '배경' : 'Setting'}</span>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed line-clamp-3">{config.setting}</p>
        </div>
      )}
      {!config.synopsis && !config.corePremise && !config.currentConflict && (
        <p className="text-xs text-text-tertiary text-center py-8 italic">
          {isKO ? '세계관 설정이 없습니다.' : 'No world settings yet.'}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PART 5 — 메인 패널 (3탭 통합)
// ============================================================

export function DirectionReferencePanel({ config, language, setConfig, onClose, hideClose }: Props & { hideClose?: boolean }) {
  const isKO = language === 'KO';
  const [tab, setTab] = useState<PanelTab>('direction');
  const activeCount = config.sceneDirection?.activeCharacters?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더: 3탭 + 닫기 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 shrink-0">
        <button
          onClick={() => setTab('direction')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
            tab === 'direction' ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Clapperboard className="w-3.5 h-3.5" />
          {isKO ? '연출' : 'Direction'}
        </button>
        <button
          onClick={() => setTab('characters')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
            tab === 'characters' ? 'bg-accent-blue/15 text-accent-blue' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {isKO ? '인물' : 'Cast'}
          {activeCount > 0 && (
            <span className="text-[8px] px-1 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue font-mono">{activeCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('reference')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
            tab === 'reference' ? 'bg-accent-purple/15 text-accent-purple' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {isKO ? '참고' : 'Ref'}
        </button>
        {!hideClose && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {tab === 'direction' && <QuickDirectionPanel config={config} language={language} setConfig={setConfig} />}
        {tab === 'characters' && <CharacterSelector config={config} language={language} setConfig={setConfig} />}
        {tab === 'reference' && <ReferencePanel config={config} language={language} />}
      </div>
    </div>
  );
}

export default DirectionReferencePanel;
