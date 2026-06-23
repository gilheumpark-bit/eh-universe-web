import type { CharRelation, CharRelationType } from '@/lib/studio-types';

export const ROLE_COLORS: Record<string, string> = {
  hero: '#3b82f6',
  villain: '#ef4444',
  ally: '#22c55e',
  extra: '#6b7280',
};

export const REL_STYLES: Record<CharRelationType, { ko: string; en: string; color: string; dash?: string }> = {
  lover: { ko: '연인', en: 'Lover', color: '#ec4899' },
  rival: { ko: '라이벌', en: 'Rival', color: '#f59e0b', dash: '6,3' },
  friend: { ko: '친구', en: 'Friend', color: '#22c55e' },
  enemy: { ko: '적', en: 'Enemy', color: '#ef4444', dash: '4,4' },
  family: { ko: '가족', en: 'Family', color: '#8b5cf6' },
  mentor: { ko: '사제', en: 'Mentor', color: '#06b6d4', dash: '8,3' },
  subordinate: { ko: '상하', en: 'Sub', color: '#6b7280', dash: '2,4' },
};

export const ALL_REL_TYPES: CharRelationType[] = Object.keys(REL_STYLES) as CharRelationType[];

export const SVG_W = 600;
export const SVG_H = 450;
export const NODE_R = 24;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.1;

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export function bindStudioTone(node: HTMLElement | SVGElement | null, color: string) {
  if (!node) return;
  node.style.setProperty('--studio-tone-color', color);
}

export function getIntroducedEpisode(rel: CharRelation): number | undefined {
  return (rel as CharRelation & { introducedEpisode?: number }).introducedEpisode;
}
