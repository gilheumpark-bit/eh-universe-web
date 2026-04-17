// ============================================================
// Platform Adapters — 통합 export + 팩토리
// ============================================================
import { novelpiaAdapter } from './novelpia';
import { munpiaAdapter } from './munpia';
import { kakaopageAdapter } from './kakaopage';
import { joaraAdapter } from './joara';
import type { PlatformAdapter, PlatformId } from './types';

export * from './types';
export { novelpiaAdapter, munpiaAdapter, kakaopageAdapter, joaraAdapter };

const ADAPTERS: Partial<Record<PlatformId, PlatformAdapter>> = {
  novelpia: novelpiaAdapter,
  munpia: munpiaAdapter,
  kakaopage: kakaopageAdapter,
  joara: joaraAdapter,
};

/** 플랫폼 ID로 어댑터 조회. 미지원 시 null. */
export function getAdapter(id: PlatformId): PlatformAdapter | null {
  return ADAPTERS[id] ?? null;
}

/** 현재 지원되는 플랫폼 ID 목록 (4종). */
export const SUPPORTED_PLATFORMS: PlatformId[] = ['novelpia', 'munpia', 'kakaopage', 'joara'];

/** UI 드롭다운용 플랫폼 라벨 */
export const PLATFORM_LABELS: Record<PlatformId, { ko: string; en: string }> = {
  novelpia: { ko: '노벨피아', en: 'Novelpia' },
  munpia: { ko: '문피아', en: 'Munpia' },
  kakaopage: { ko: '카카오페이지', en: 'KakaoPage' },
  joara: { ko: '조아라', en: 'Joara' },
};
