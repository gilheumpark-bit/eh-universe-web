// ============================================================
// Deep Links — 문장/줄/세그먼트 단위 링크
// ============================================================
// 리뷰어에게 "이 문장 봐주세요" 하고 URL 하나 보내면 끝.
// 설치형에선 "몇 페이지 몇 번째 줄" 말로 설명해야 함.

/**
 * 딥링크 해시 생성.
 * 예: #L42 (42번째 줄), #S15 (15번째 세그먼트), #P3-L7 (3번째 단락 7번째 줄)
 */
export function createDeepLinkHash(opts: {
  type: 'line' | 'segment' | 'paragraph' | 'chapter';
  index: number;
  subIndex?: number;
}): string {
  const prefix = { line: 'L', segment: 'S', paragraph: 'P', chapter: 'C' }[opts.type];
  const sub = opts.subIndex !== undefined ? `-L${opts.subIndex}` : '';
  return `#${prefix}${opts.index}${sub}`;
}

/**
 * 딥링크 해시 파싱.
 * #L42 → { type: 'line', index: 42 }
 * #S15 → { type: 'segment', index: 15 }
 * #P3-L7 → { type: 'paragraph', index: 3, subIndex: 7 }
 */
export function parseDeepLinkHash(hash: string): {
  type: 'line' | 'segment' | 'paragraph' | 'chapter';
  index: number;
  subIndex?: number;
} | null {
  const clean = hash.replace(/^#/, '');
  const match = clean.match(/^([LSPC])(\d+)(?:-L(\d+))?$/);
  if (!match) return null;

  const typeMap: Record<string, 'line' | 'segment' | 'paragraph' | 'chapter'> = {
    L: 'line', S: 'segment', P: 'paragraph', C: 'chapter',
  };

  return {
    type: typeMap[match[1]] || 'line',
    index: parseInt(match[2], 10),
    subIndex: match[3] ? parseInt(match[3], 10) : undefined,
  };
}

/**
 * 딥링크 대상 요소로 스크롤 + 하이라이트.
 * 페이지 로드 시 hash에서 자동 호출.
 */
export function scrollToDeepLink(): boolean {
  const hash = window.location.hash;
  if (!hash) return false;

  const parsed = parseDeepLinkHash(hash);
  if (!parsed) return false;

  // data-deep-link 속성으로 요소 찾기
  const selector = `[data-deep-link="${parsed.type}-${parsed.index}"]`;
  const el = document.querySelector(selector);
  if (!el) return false;

  // 스크롤
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 하이라이트 (2초 후 해제)
  el.classList.add('eh-deep-link-highlight');
  setTimeout(() => el.classList.remove('eh-deep-link-highlight'), 3000);

  return true;
}

/**
 * 현재 페이지 URL + 딥링크 해시 조합.
 * 예: https://eh-universe.com/studio#L42
 */
export function getDeepLinkUrl(opts: Parameters<typeof createDeepLinkHash>[0]): string {
  const hash = createDeepLinkHash(opts);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/** 딥링크 URL을 클립보드에 복사 */
export async function copyDeepLink(opts: Parameters<typeof createDeepLinkHash>[0]): Promise<boolean> {
  try {
    const url = getDeepLinkUrl(opts);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
