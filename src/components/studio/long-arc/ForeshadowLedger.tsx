"use client";
// ============================================================
// ForeshadowLedger — 떡밥 watch window. 미회수 list + 회수 거리 평균.
// [C] markers 0 → 안내 / [G] sort 1회 / [K] 단일 책임
// ============================================================

import React, { useMemo } from 'react';
import { Bookmark, BookmarkCheck, AlertTriangle } from 'lucide-react';
import type { ForeshadowMarker } from '@/lib/long-arc-verifier/types';

export interface ForeshadowLedgerProps {
  markers: ForeshadowMarker[];
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onJump?: (episodeId: number, charOffset?: number) => void;
}

export const ForeshadowLedger: React.FC<ForeshadowLedgerProps> = ({
  markers,
  language = 'KO',
  onJump,
}) => {
  const isKO = language === 'KO';

  const stats = useMemo(() => {
    const total = markers.length;
    const resolved = markers.filter((m) => m.payoffEpisode !== undefined);
    const unresolved = markers.filter((m) => m.payoffEpisode === undefined);
    const avgDistance =
      resolved.length > 0
        ? resolved.reduce((sum, m) => sum + (m.resolutionDistance ?? 0), 0) / resolved.length
        : 0;
    return {
      total,
      resolvedCount: resolved.length,
      unresolvedCount: unresolved.length,
      avgDistance: Math.round(avgDistance * 10) / 10,
      unresolved,
    };
  }, [markers]);

  return (
    <section
      className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
      role="region"
      aria-label={isKO ? '떡밥 장부' : 'Foreshadow Ledger'}
    >
      <div className="px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <h3 className="text-sm font-bold text-text-primary">
          {isKO ? '떡밥 장부' : 'Foreshadow Ledger'}
        </h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1 px-4 py-3 border-b border-border">
        <div className="text-center">
          <div className="text-[9px] uppercase text-text-tertiary tracking-wider">{isKO ? '총' : 'Total'}</div>
          <div className="text-base font-bold text-text-primary">{stats.total}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase text-text-tertiary tracking-wider">{isKO ? '회수' : 'Resolved'}</div>
          <div className="text-base font-bold text-accent-green">{stats.resolvedCount}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase text-text-tertiary tracking-wider">{isKO ? '미회수' : 'Pending'}</div>
          <div className="text-base font-bold text-accent-amber">{stats.unresolvedCount}</div>
        </div>
      </div>

      {stats.resolvedCount > 0 && (
        <div className="px-4 py-2 border-b border-border text-[10px] text-text-tertiary text-center">
          {isKO ? `평균 회수 거리: ${stats.avgDistance}화` : `Avg distance: ${stats.avgDistance} eps`}
        </div>
      )}

      {/* Unresolved list */}
      <div className="px-4 py-3 max-h-[40vh] overflow-y-auto">
        {stats.unresolvedCount === 0 ? (
          <p className="text-xs text-accent-green flex items-center gap-2">
            <BookmarkCheck className="w-3.5 h-3.5" />
            {isKO ? '모든 떡밥 회수됨' : 'All resolved'}
          </p>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-accent-amber" />
              {isKO ? '미회수 목록' : 'Unresolved'}
            </div>
            <ul className="space-y-1">
              {stats.unresolved.slice(0, 30).map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onJump?.(m.setupEpisode, m.setupCharOffset)}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-bg-tertiary/30 text-left"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-accent-purple">EP{m.setupEpisode}</span>
                        <span className="text-xs font-bold text-text-primary truncate">[{m.id}]</span>
                      </div>
                      <p className="text-[10px] text-text-tertiary line-clamp-1 mt-0.5">{m.setupContext}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};

export default ForeshadowLedger;
