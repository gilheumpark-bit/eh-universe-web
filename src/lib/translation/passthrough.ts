// ============================================================
// Passthrough Filter — 번역하면 안 되는 블록 보호 (Sandboxed)
// ============================================================
// 수식, 코드, 인용, URL 등을 플레이스홀더로 치환 → 번역 후 복원

const PLACEHOLDER_PREFIX = '⟦EHPT:';
const PLACEHOLDER_SUFFIX = '⟧';

export interface PassthroughResult {
  /** 플레이스홀더로 치환된 텍스트 */
  filtered: string;
  /** 복원용 맵 */
  map: Map<string, string>;
}

/**
 * 텍스트에서 패스스루 패턴을 플레이스홀더로 치환.
 * 번역 전에 호출.
 */
export function applyPassthrough(text: string, patterns: RegExp[]): PassthroughResult {
  const map = new Map<string, string>();
  let idx = 0;
  let filtered = text;

  for (const pattern of patterns) {
    // 정규식을 복사해서 global 플래그 보장
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    filtered = filtered.replace(re, (match) => {
      const key = `${PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`;
      map.set(key, match);
      idx++;
      return key;
    });
  }

  return { filtered, map };
}

/**
 * 번역된 텍스트에서 플레이스홀더를 원본으로 복원.
 * 번역 후에 호출.
 */
export function restorePassthrough(translated: string, map: Map<string, string>): string {
  let result = translated;
  for (const [key, original] of map) {
    // 번역 모델이 플레이스홀더를 약간 변형할 수 있으므로 유연하게 매칭
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), original);
  }
  return result;
}
