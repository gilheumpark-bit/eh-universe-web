"use client";
// ============================================================
// ReaderProfilePanel — 5 페르소나 engagement 곡선 + 이탈 마킹.
// ============================================================

import React, { useMemo, useState } from 'react';
import { Users, RefreshCw, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { EngagementProfile, PersonaId } from '@/lib/reader-sim/types';
import { PERSONAS, PERSONA_IDS } from '@/lib/reader-sim/personas';
// [검수 wiring — 2026-05-07] dropout-marker 미연결 해결 — 주요 이탈 시점 카드.
import { buildDropoutMarkers } from '@/lib/reader-sim/dropout-marker';
// [후속 A-5 — 2026-05-07] PersonaSelector — 단일 페르소나 모드 필터.
import { PersonaSelector } from './PersonaSelector';

const PERSONA_COLORS: Record<string, string> = {
  'genre-fan': '#8b5cf6',
  general: '#3b82f6',
  critical: '#ef4444',
  casual: '#10b981',
  expert: '#f59e0b',
};

export interface ReaderProfilePanelProps {
  profile: EngagementProfile | null;
  loading?: boolean;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onRefresh?: () => void;
}

export const ReaderProfilePanel: React.FC<ReaderProfilePanelProps> = ({
  profile,
  loading = false,
  language = 'KO',
  onRefresh,
}) => {
  const isKO = language === 'KO';
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';

  // [검수 wiring] 주요 이탈 시점 markers — severity 기준
  const markers = useMemo(() => (profile ? buildDropoutMarkers(profile) : []), [profile]);
  const criticalMarkers = useMemo(() => markers.filter((m) => m.severity !== 'info'), [markers]);
  // [후속 A-5] 페르소나 필터 — 'all' 또는 단일
  const [personaFilter, setPersonaFilter] = useState<PersonaId | 'all'>('all');

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-bold text-text-primary">
            {isKO ? '독자 시뮬레이션' : 'Reader Simulation'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* [후속 A-5] PersonaSelector — 단일/전체 필터 */}
          <PersonaSelector value={personaFilter} onChange={setPersonaFilter} language={language} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-md bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-50 transition-colors"
            aria-label={isKO ? '재실행' : 'Refresh'}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[60vh]">
        {!profile || profile.points.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {isKO ? '재실행 버튼으로 시뮬 시작' : 'Click refresh to simulate'}
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-1 px-4 py-3 border-b border-border">
              <div className="text-center">
                <div className="text-[9px] uppercase text-text-tertiary tracking-wider">
                  {isKO ? '평균 engagement' : 'Avg engagement'}
                </div>
                <div className="text-2xl font-bold text-accent-purple">{profile.averageEngagement}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase text-text-tertiary tracking-wider">
                  {isKO ? '최종 이탈률' : 'Final dropout'}
                </div>
                <div className={`text-2xl font-bold ${profile.finalDropoutRate >= 0.6 ? 'text-accent-red' : profile.finalDropoutRate >= 0.4 ? 'text-accent-amber' : 'text-accent-green'}`}>
                  {Math.round(profile.finalDropoutRate * 100)}%
                </div>
              </div>
            </div>

            {/* [검수 wiring] 주요 이탈 시점 — markers severity warning/error */}
            {criticalMarkers.length > 0 && (
              <div className="px-4 py-3 border-b border-border bg-accent-amber/5">
                <div className="text-[10px] uppercase tracking-wider text-accent-amber mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isKO ? '주요 이탈 시점' : 'Critical dropout points'}
                </div>
                <ul className="space-y-1">
                  {criticalMarkers.slice(0, 5).map((m) => (
                    <li key={m.episodeId} className="flex items-center gap-2 text-xs">
                      <span className={`text-[10px] font-mono ${m.severity === 'error' ? 'text-accent-red' : 'text-accent-amber'}`}>
                        EP{m.episodeId}
                      </span>
                      <span className="text-text-secondary flex-1">
                        {isKO ? `${m.newDropouts.length}명 이탈` : `${m.newDropouts.length} dropped`}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-mono">
                        {Math.round(m.cumulativeDropoutRate * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5 페르소나 이탈 화수 */}
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                {isKO ? '페르소나별 이탈 시점' : 'Dropout by persona'}
              </div>
              <ul className="space-y-1">
                {PERSONA_IDS.filter((pid) => personaFilter === 'all' || pid === personaFilter).map((pid) => {
                  const persona = PERSONAS[pid];
                  const dropoutEp = profile.dropoutEpisodeByPersona[pid];
                  return (
                    <li key={pid} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PERSONA_COLORS[pid] }}
                      />
                      <span className="text-text-secondary flex-1">{persona.label[lang]}</span>
                      {dropoutEp !== undefined ? (
                        <span className="text-accent-red font-mono flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          EP{dropoutEp}
                        </span>
                      ) : (
                        <span className="text-accent-green font-mono">{isKO ? '유지' : 'kept'}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Engagement curve (간단 텍스트 표) */}
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                {isKO ? 'Engagement 곡선 (최근 20화)' : 'Engagement curve (last 20)'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-text-tertiary">
                      <th className="text-left">EP</th>
                      <th>Avg</th>
                      <th>{PERSONAS['genre-fan'].label[lang]}</th>
                      <th>{PERSONAS.general.label[lang]}</th>
                      <th>{PERSONAS.critical.label[lang]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.points.slice(-20).map((p) => (
                      <tr key={p.episodeId} className="text-text-secondary">
                        <td className="text-accent-purple">EP{p.episodeId}</td>
                        <td className="text-center">{p.average}</td>
                        <td className="text-center">{p.perPersona['genre-fan']}</td>
                        <td className="text-center">{p.perPersona.general}</td>
                        <td className="text-center">{p.perPersona.critical}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ReaderProfilePanel;
