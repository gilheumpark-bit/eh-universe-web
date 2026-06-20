/**
 * server-lang.ts (2026-05-10 신설 — NEXT16-LAYOUT 수리)
 *
 * Next.js 16 의 LayoutProps 타입에서 searchParams 가 제거됨.
 * 기존 layout.tsx 의 generateMetadata 가 searchParams 로 lang 분기 → 컴파일 에러.
 *
 * 해결: cookie 'lang' → accept-language header → 'ko' default 우선순위.
 * layout level 에서 안전하게 사용자 언어 검출.
 *
 * 사용:
 *   import { detectServerLang } from '@/lib/i18n/server-lang';
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const lang = await detectServerLang();
 *     return { title: TITLES[lang], description: DESCRIPTIONS[lang] };
 *   }
 *
 * [C] 안전성: 알 수 없는 입력 fallback 'ko'
 * [G] 성능: cookie 우선 (header lookup skip)
 * [K] 간결성: 단일 헬퍼, 4 layout 공통 사용
 */

import { cookies, headers } from 'next/headers';

export type SupportedLang = 'ko' | 'en' | 'ja' | 'zh';

const SUPPORTED: readonly SupportedLang[] = ['ko', 'en', 'ja', 'zh'] as const;

function isSupported(v: string): v is SupportedLang {
  return SUPPORTED.includes(v as SupportedLang);
}

/**
 * Layout/page 의 generateMetadata 에서 사용자 lang 검출.
 * 우선순위: cookie 'lang' → accept-language header → 'ko' default.
 *
 * Next.js 16 에서 layout 의 generateMetadata 는 searchParams 를 받지 못한다.
 * Query param ?lang=xx 로 SSR 분기를 원한다면 page.tsx 의 generateMetadata 사용.
 */
export async function detectServerLang(): Promise<SupportedLang> {
  // 1) cookie 우선 — 사용자 명시 선택
  try {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get('lang')?.value;
    if (cookieLang && isSupported(cookieLang)) {
      return cookieLang;
    }
  } catch {
    // cookies() 사용 불가 컨텍스트 — fallback
  }

  // 2) accept-language header — 브라우저 기본
  try {
    const h = await headers();
    const accept = (h.get('accept-language') || '').toLowerCase();
    if (accept.startsWith('en')) return 'en';
    if (accept.startsWith('ja')) return 'ja';
    if (accept.startsWith('zh')) return 'zh';
  } catch {
    // headers() 사용 불가 컨텍스트 — fallback
  }

  // 3) default 'ko' — Loreguard 주력 언어
  return 'ko';
}
