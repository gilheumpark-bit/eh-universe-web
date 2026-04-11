// ============================================================
// Translation Memory (TM) — 번역 재활용 시스템
// ============================================================
// 이전 번역 결과를 저장하고, 유사 문장 발견 시 재활용.
// localStorage 기반 (오프라인 지원).

const TM_STORAGE_KEY = 'eh-translation-memory';
const MAX_TM_ENTRIES = 5000;

export interface TMEntry {
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  domain?: string;
  /** 확정된 번역인지 (human-confirmed) */
  confirmed: boolean;
  timestamp: number;
  /** 사용 횟수 */
  useCount: number;
}

export interface TMMatch {
  entry: TMEntry;
  /** 유사도 (0-1) */
  similarity: number;
  /** 매칭 타입 */
  type: 'exact' | 'fuzzy';
}

// ── Storage + Trigram 캐시 ──

let _tmCache: TMEntry[] | null = null;
let _trigramIndex: Map<string, number[]> | null = null;
let _cacheVersion = 0;

function toTrigrams(s: string): Set<string> {
  const norm = s.toLowerCase().replace(/\s+/g, ' ').trim();
  const tgs = new Set<string>();
  for (let i = 0; i <= norm.length - 3; i++) tgs.add(norm.slice(i, i + 3));
  return tgs;
}

function buildTrigramIndex(entries: TMEntry[]): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (let i = 0; i < entries.length; i++) {
    for (const tg of toTrigrams(entries[i].source)) {
      const arr = idx.get(tg);
      if (arr) arr.push(i); else idx.set(tg, [i]);
    }
  }
  return idx;
}

function getCachedTM(): { entries: TMEntry[]; index: Map<string, number[]> } {
  if (!_tmCache) {
    _tmCache = loadTMRaw();
    _trigramIndex = buildTrigramIndex(_tmCache);
  }
  return { entries: _tmCache, index: _trigramIndex! };
}

/** 캐시 무효화 (addToTM/saveTM 후 호출) */
function invalidateCache() { _tmCache = null; _trigramIndex = null; _cacheVersion++; }

function loadTMRaw(): TMEntry[] {
  try {
    const raw = localStorage.getItem(TM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadTM(): TMEntry[] {
  return getCachedTM().entries;
}

export function saveTM(entries: TMEntry[]): void {
  const trimmed = entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_TM_ENTRIES);
  localStorage.setItem(TM_STORAGE_KEY, JSON.stringify(trimmed));
  invalidateCache();
}

/** TM에 번역 결과 추가 */
export function addToTM(
  source: string, target: string,
  sourceLang: string, targetLang: string,
  confirmed: boolean = false, domain?: string,
): void {
  const entries = loadTM();
  const existing = entries.find(e => e.source === source && e.targetLang === targetLang);
  if (existing) {
    existing.target = target;
    existing.confirmed = confirmed || existing.confirmed;
    existing.timestamp = Date.now();
    existing.useCount++;
  } else {
    entries.push({ source, target, sourceLang, targetLang, domain, confirmed, timestamp: Date.now(), useCount: 0 });
  }
  saveTM(entries);
}

/** 배치로 TM에 추가 */
export function addBatchToTM(
  pairs: Array<{ source: string; target: string }>,
  sourceLang: string, targetLang: string,
  confirmed: boolean = false,
): void {
  const entries = loadTM();
  for (const { source, target } of pairs) {
    if (!source.trim() || !target.trim()) continue;
    const existing = entries.find(e => e.source === source && e.targetLang === targetLang);
    if (existing) {
      existing.target = target;
      existing.confirmed = confirmed || existing.confirmed;
      existing.timestamp = Date.now();
    } else {
      entries.push({ source, target, sourceLang, targetLang, confirmed, timestamp: Date.now(), useCount: 0 });
    }
  }
  saveTM(entries);
}

/** 소스 문장에 대한 TM 매치 검색 (trigram 프리필터 → Jaro-Winkler 정밀 비교) */
export function searchTM(source: string, targetLang: string, threshold: number = 0.7): TMMatch[] {
  const { entries, index } = getCachedTM();
  const matches: TMMatch[] = [];

  // 1단계: trigram 프리필터 — 후보 O(trigram수) 로 축소
  const sourceTrigrams = toTrigrams(source);
  const candidateSet = new Set<number>();
  for (const tg of sourceTrigrams) {
    const idxs = index.get(tg);
    if (idxs) for (const i of idxs) candidateSet.add(i);
  }

  // 2단계: 후보만 Jaro-Winkler 정밀 비교
  const normSource = normalize(source);
  for (const i of candidateSet) {
    const entry = entries[i];
    if (entry.targetLang !== targetLang) continue;

    if (entry.source === source) {
      matches.push({ entry, similarity: 1.0, type: 'exact' });
      continue;
    }
    const sim = jaroWinkler(normSource, normalize(entry.source));
    if (sim >= threshold) {
      matches.push({ entry, similarity: sim, type: 'fuzzy' });
    }
  }

  return matches
    .sort((a, b) => b.similarity - a.similarity || (b.entry.confirmed ? 1 : 0) - (a.entry.confirmed ? 1 : 0))
    .slice(0, 5);
}

/** TM 내보내기 (JSON) */
export function exportTM(): string {
  return JSON.stringify(loadTM(), null, 2);
}

/** TM 가져오기 (JSON) */
export function importTM(json: string): number {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) return 0;
    const existing = loadTM();
    let added = 0;
    for (const entry of imported) {
      if (!entry.source || !entry.target) continue;
      const dup = existing.find(e => e.source === entry.source && e.targetLang === entry.targetLang);
      if (!dup) {
        existing.push({ ...entry, timestamp: entry.timestamp || Date.now(), useCount: 0 });
        added++;
      }
    }
    saveTM(existing);
    return added;
  } catch {
    return 0;
  }
}

/** TM 통계 */
export function tmStats(): { total: number; confirmed: number; languages: string[] } {
  const entries = loadTM();
  return {
    total: entries.length,
    confirmed: entries.filter(e => e.confirmed).length,
    languages: [...new Set(entries.map(e => e.targetLang))],
  };
}

// ── 유사도 계산 (Jaro-Winkler) ──

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
