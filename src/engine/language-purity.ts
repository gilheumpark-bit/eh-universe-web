/**
 * 언어 순도 검사 및 치환 엔진.
 *
 * 로컬 AI(Qwen 3.5-9B)가 한국어/일본어/중국어 본문을 생성할 때 혼입하는
 * 영어 단어를 감지하고 사전 기반 치환을 수행.
 *
 * @module language-purity
 * @example
 *   const result = purifyLanguage('그는 suddenly 돌아섰다', 'KO');
 *   // result.cleanedText === '그는 갑자기 돌아섰다'
 *   // result.replacements[0] === { position: 3, original: 'suddenly', replacement: '갑자기', confidence: 'high' }
 */

// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { logger } from '@/lib/logger';
import {
  KOREAN_CONTAMINATION_DICT,
  JAPANESE_CONTAMINATION_DICT,
  CHINESE_CONTAMINATION_DICT,
  COMMON_WHITELIST,
  type ContaminationDict,
} from './contamination-dict';

export type TargetLang = 'KO' | 'JP' | 'CN';

export type PurityMode = 'auto' | 'report';

export interface PurityReplacement {
  position: number;
  original: string;
  replacement: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface PurityUnresolved {
  position: number;
  word: string;
  reason: 'not_in_dictionary' | 'whitelisted';
}

export interface PurityOptions {
  /** 'auto' = 자동 치환, 'report' = 감지만 (cleanedText 불변) */
  mode?: PurityMode;
  /** 따옴표 내부 대사 보존 (기본 true — 의도적 영어일 수 있음) */
  preserveQuotes?: boolean;
  /** 프로젝트별 추가 화이트리스트 (캐릭터 이름 등) */
  customWhitelist?: readonly string[];
}

export interface PurityResult {
  cleanedText: string;
  replacements: PurityReplacement[];
  unresolved: PurityUnresolved[];
  stats: {
    totalEnglishWords: number;
    replaced: number;
    preserved: number;
    unknown: number;
  };
}

const DICT_MAP: Record<TargetLang, ContaminationDict> = {
  KO: KOREAN_CONTAMINATION_DICT,
  JP: JAPANESE_CONTAMINATION_DICT,
  CN: CHINESE_CONTAMINATION_DICT,
};

// 영어 단어 감지 — 2자 이상 라틴 알파벳 시퀀스. 숫자/기호 미포함.
// Note: /g flag 는 purifyLanguage 내부에서 새 RegExp 로 재생성 (lastIndex 격리).
const ENGLISH_WORD_PATTERN_SOURCE = '[A-Za-z][a-zA-Z]{1,}';

// 따옴표 범위 감지 — 대사/인용 보존용.
// Note: 각 pattern 은 purifyLanguage 내부에서 재생성되어 lastIndex 오염 없음.
const QUOTE_PATTERN_SOURCES: readonly string[] = [
  '"[^"]*"',
  "'[^']*'",
  '「[^」]*」',
  '『[^』]*』',
];

// ============================================================
// PART 2 — Helpers (Range / Whitelist)
// ============================================================

type Range = readonly [number, number];

function findQuoteRanges(text: string): Range[] {
  const ranges: Range[] = [];
  for (const source of QUOTE_PATTERN_SOURCES) {
    const regex = new RegExp(source, 'g');
    let match: RegExpExecArray | null = regex.exec(text);
    while (match !== null) {
      ranges.push([match.index, match.index + match[0].length] as const);
      // 빈 매치 무한루프 방어
      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
      match = regex.exec(text);
    }
  }
  return ranges;
}

function isInRange(pos: number, ranges: readonly Range[]): boolean {
  for (const [start, end] of ranges) {
    if (pos >= start && pos < end) return true;
  }
  return false;
}

interface WordMatch {
  word: string;
  position: number;
}

function collectEnglishWords(text: string): WordMatch[] {
  const regex = new RegExp(ENGLISH_WORD_PATTERN_SOURCE, 'g');
  const out: WordMatch[] = [];
  let match: RegExpExecArray | null = regex.exec(text);
  while (match !== null) {
    out.push({ word: match[0], position: match.index });
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
    match = regex.exec(text);
  }
  return out;
}

// ============================================================
// PART 3 — Public API
// ============================================================

/**
 * 텍스트의 언어 순도 검사 + 선택적 자동 치환.
 *
 * 처리 순서:
 *   1) 영어 단어 전체 수집 (정규식 /g)
 *   2) 따옴표 범위 계산 (preserveQuotes 시)
 *   3) 역순 루프로 치환 (position invalidation 방지)
 *   4) 사전 미존재 → unresolved, 화이트리스트 매치 → 유지
 *
 * @param text 검사할 텍스트
 * @param targetLang 목표 언어 (KO/JP/CN)
 * @param options 옵션 (mode / preserveQuotes / customWhitelist)
 */
export function purifyLanguage(
  text: string,
  targetLang: TargetLang,
  options: PurityOptions = {},
): PurityResult {
  // 빈 문자열 / 비문자열 방어
  if (!text) {
    return {
      cleanedText: text ?? '',
      replacements: [],
      unresolved: [],
      stats: { totalEnglishWords: 0, replaced: 0, preserved: 0, unknown: 0 },
    };
  }

  const mode: PurityMode = options.mode ?? 'auto';
  const preserveQuotes = options.preserveQuotes ?? true;
  const customWhitelist = new Set<string>(options.customWhitelist ?? []);

  const dict = DICT_MAP[targetLang];
  const quoteRanges = preserveQuotes ? findQuoteRanges(text) : [];
  const matches = collectEnglishWords(text);
  const totalEnglishWords = matches.length;

  const replacements: PurityReplacement[] = [];
  const unresolved: PurityUnresolved[] = [];
  let preservedCount = 0;

  // 역순 처리 — 뒤에서부터 치환해야 앞쪽 position 이 유효하게 유지됨.
  let cleanedText = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const current = matches[i];
    if (!current) continue;
    const { word, position } = current;

    // 1) 따옴표 내부 → 보존
    if (preserveQuotes && isInRange(position, quoteRanges)) {
      preservedCount += 1;
      continue;
    }

    // 2) 화이트리스트 → 보존 (대소문자 원형 매치)
    if (COMMON_WHITELIST.has(word) || customWhitelist.has(word)) {
      preservedCount += 1;
      continue;
    }

    // 3) 사전 조회 (소문자 키)
    const lowerWord = word.toLowerCase();
    const replacement = dict[lowerWord];
    if (typeof replacement === 'string' && replacement.length > 0) {
      // 완전 소문자 → high, 대소문자 혼용/대문자 시작 → medium (고유명사 가능성)
      const confidence: 'high' | 'medium' | 'low' =
        word === lowerWord ? 'high' : 'medium';
      replacements.push({ position, original: word, replacement, confidence });
      if (mode === 'auto') {
        cleanedText =
          cleanedText.slice(0, position) +
          replacement +
          cleanedText.slice(position + word.length);
      }
      continue;
    }

    // 4) 사전 미존재 → unresolved
    unresolved.push({
      position,
      word,
      reason: 'not_in_dictionary',
    });
  }

  // replacements 는 역순으로 push 됨 → 호출자 편의 위해 position 오름차순 정렬
  replacements.sort((a, b) => a.position - b.position);
  unresolved.sort((a, b) => a.position - b.position);

  return {
    cleanedText,
    replacements,
    unresolved,
    stats: {
      totalEnglishWords,
      replaced: replacements.length,
      preserved: preservedCount,
      unknown: unresolved.length,
    },
  };
}

/**
 * 원스텝 정화 — 사전에 있는 단어만 치환하고 나머지는 유지.
 * `stripEngineArtifacts` 다음 단계에서 호출되는 편의 함수.
 *
 * @param text 정화할 텍스트
 * @param targetLang 목표 언어
 * @returns 치환 적용된 텍스트 (변경 없으면 원본 반환)
 */
export function quickPurify(text: string, targetLang: TargetLang): string {
  if (!text) return text;
  const result = purifyLanguage(text, targetLang, {
    mode: 'auto',
    preserveQuotes: true,
  });
  if (result.replacements.length > 0) {
    logger.info('language-purity', `replaced ${result.replacements.length} contaminations`, {
      lang: targetLang,
      total: result.stats.totalEnglishWords,
      unknown: result.stats.unknown,
    });
  }
  return result.cleanedText;
}

// IDENTITY_SEAL: PART-1~3 | role=language-purity | target=KO/JP/CN | strategy=reverse-replace + quote-preserve
