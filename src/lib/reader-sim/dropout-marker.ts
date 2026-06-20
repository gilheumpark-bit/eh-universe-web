// ============================================================
// dropout-marker.ts — 본문 marking helper.
// 페르소나 X% 이탈 발생 화수 → 본문 좌측 거터 빨강 표시용.
// ============================================================

import type { EngagementProfile, PersonaId } from './types';
import { PERSONA_IDS } from './personas';

export interface DropoutMarker {
  episodeId: number;
  /** 새로 이탈한 페르소나 list */
  newDropouts: PersonaId[];
  /** 이 화에서 누적 이탈률 */
  cumulativeDropoutRate: number;
  /** severity — 1명 이탈 'info', 2명 'warning', 3+ 'error' */
  severity: 'info' | 'warning' | 'error';
}

export function buildDropoutMarkers(profile: EngagementProfile): DropoutMarker[] {
  if (profile.predictions.length === 0) return [];

  const markers: DropoutMarker[] = [];
  const seenDropouts: Record<PersonaId, boolean> = {
    'genre-fan': false,
    general: false,
    critical: false,
    casual: false,
    expert: false,
  };

  for (const pred of profile.predictions) {
    const newDropouts: PersonaId[] = [];
    for (const pid of PERSONA_IDS) {
      if (pred.perPersona[pid] && !seenDropouts[pid]) {
        seenDropouts[pid] = true;
        newDropouts.push(pid);
      }
    }
    if (newDropouts.length === 0) continue;

    const severity: DropoutMarker['severity'] =
      newDropouts.length >= 3 ? 'error' : newDropouts.length === 2 ? 'warning' : 'info';

    markers.push({
      episodeId: pred.episodeId,
      newDropouts,
      cumulativeDropoutRate: pred.dropoutRate,
      severity,
    });
  }

  return markers;
}
