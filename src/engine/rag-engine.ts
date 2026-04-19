// ============================================================
// PART 1 — RAG (Retrieval-Augmented Generation) Engine
// ============================================================
// 장르별 황금 예시 + 장편 구조 가이드를 컨텍스트에 주입
// 파인튜닝 대체: 모델 가중치 변경 없이 예시 기반 학습
//
// 토큰 예산: 128K 컨텍스트의 ~6% (8,000 토큰)
// 우선순위: 장르 예시 > 구조 가이드 > 트리밍

import type { AppLanguage } from '@/lib/studio-types';
import goldenExamples from './golden_examples.json';
import structureGuides from './structure_guides.json';

/**
 * 언어별 텍스트 픽업 헬퍼.
 */
function pickLang(language: AppLanguage, dict: Partial<Record<AppLanguage, string>>): string {
  return dict[language] ?? dict.KO ?? dict.EN ?? '';
}

// ============================================================
// PART 2 — Genre Example Retrieval
// ============================================================

type GenreKey = keyof typeof goldenExamples;

/** 장르 이름 → golden_examples.json 키 매핑 */
const GENRE_KEY_MAP: Record<string, GenreKey> = {
  'romance': '로맨스',
  'fantasy': '판타지',
  'martial_arts': '무협',
  'hunter': '헌터',
  'regression': '회귀',
  'horror': '공포',
  'romantic_fantasy': '로판',
  'alt_history': '대체역사',
  'thriller': '스릴러',
  // 매핑 없는 장르는 판타지 fallback
};

/** 한국어 장르명 직접 매핑 */
const GENRE_KO_MAP: Record<string, GenreKey> = {
  '로맨스': '로맨스',
  '판타지': '판타지',
  '무협': '무협',
  '헌터': '헌터',
  '회귀': '회귀',
  '공포': '공포',
  '로판': '로판',
  '대체역사': '대체역사',
  '스릴러': '스릴러',
};

interface GoldenExample {
  genre: string;
  instruction: string;
  output: string;
  length: number;
}

/**
 * 장르에 맞는 황금 예시를 최대 count개 반환.
 * 매칭 실패 시 판타지 fallback.
 */
export function getGenreExamples(genre: string, count: number = 2): GoldenExample[] {
  const key = GENRE_KEY_MAP[genre] ?? GENRE_KO_MAP[genre] ?? '판타지';
  const examples = (goldenExamples as Record<string, GoldenExample[]>)[key];
  if (!examples || examples.length === 0) {
    // fallback to 판타지
    const fallback = (goldenExamples as Record<string, GoldenExample[]>)['판타지'];
    return (fallback ?? []).slice(0, count);
  }
  return examples.slice(0, count);
}

// IDENTITY_SEAL: PART-2 | role=genre retrieval | inputs=genre | outputs=GoldenExample[]

// ============================================================
// PART 3 — Structure Guide Retrieval
// ============================================================

interface StructureGuide {
  structure: string;
  opening: string;
  middle: string;
  ending: string;
  instruction: string;
}

/**
 * 장편 구조 가이드 반환 (상위 1편).
 * opening/middle/ending 으로 구조 패턴만 제공 (문체 X).
 */
export function getStructureGuide(): StructureGuide {
  return (structureGuides as StructureGuide[])[0]!;
}

// IDENTITY_SEAL: PART-3 | role=structure guide | inputs=none | outputs=StructureGuide

// ============================================================
// PART 4 — RAG Prompt Block Builder
// ============================================================

/**
 * RAG 블록 생성 — 시스템 프롬프트에 주입할 텍스트.
 * 
 * 구성:
 *   1) 장르별 톤 참고 예시 (2편, ~2,000 토큰)
 *   2) 장편 구조 가이드 (1편, ~1,500 토큰)
 *   3) 합계: ~3,500 토큰 (128K의 2.7%)
 * 
 * @param genre - 현재 장르 (영문 또는 한국어)
 * @param language - UI 언어
 * @param maxChars - 최대 글자수 (토큰 예산 초과 방지)
 */
export function buildRAGBlock(
  genre: string,
  language: AppLanguage = 'KO',
  maxChars: number = 6000,
): string {
  const parts: string[] = [];
  let usedChars = 0;

  // --- 1) 장르 톤 참고 예시 ---
  const examples = getGenreExamples(genre, 2);
  if (examples.length > 0) {
    const header = pickLang(language, {
      KO: '[참고 문체 예시 — 이 장르의 톤과 분위기를 참고하되, 그대로 복사하지 마십시오]',
      EN: '[Reference Style Examples — Use these for tone and atmosphere, do NOT copy directly]',
      JP: '[参考文体例 — このジャンルのトーンと雰囲気を参考にしてください。直接コピーしないでください]',
      CN: '[参考文体示例 — 参考此类型的语调和氛围，但请勿直接复制]',
    });
    parts.push(header);

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      if (!ex) continue;
      // 예시는 800자로 트리밍 (핵심 톤만)
      const trimmed = ex.output.slice(0, 800);
      const remaining = maxChars - usedChars;
      if (remaining < 200) break; // 남은 여유 없으면 중단

      const snippet = trimmed.slice(0, Math.min(trimmed.length, remaining));
      parts.push(`\n--- 예시 ${i + 1} (${ex.genre}) ---\n${snippet}`);
      usedChars += snippet.length + 50;
    }
  }

  // --- 2) 장편 구조 가이드 ---
  const remaining = maxChars - usedChars;
  if (remaining > 500) {
    const guide = getStructureGuide();
    const structHeader = pickLang(language, {
      KO: '\n[장편 구조 참고 — 도입/전개/마무리 호흡 패턴]',
      EN: '\n[Long-Form Structure Reference — Opening/Development/Closing rhythm]',
      JP: '\n[長編構造参考 — 導入/展開/締め切りの呼吸パターン]',
      CN: '\n[长篇结构参考 — 开篇/发展/收尾节奏模式]',
    });
    parts.push(structHeader);
    parts.push(`구조: ${guide.structure}`);

    // 도입부
    const openSnippet = guide.opening.slice(0, Math.min(300, remaining / 3));
    parts.push(`\n[도입부 패턴]\n${openSnippet}`);

    // 중반부
    if (remaining > 800) {
      const midSnippet = guide.middle.slice(0, Math.min(300, remaining / 3));
      parts.push(`\n[중반부 전개]\n${midSnippet}`);
    }

    // 마무리
    if (remaining > 1200) {
      const endSnippet = guide.ending.slice(0, Math.min(300, remaining / 3));
      parts.push(`\n[마무리 호흡]\n${endSnippet}`);
    }

    parts.push(pickLang(language, {
      KO: '\n→ 위 구조 패턴을 참고하여 자연스러운 도입-전개-마무리 호흡을 유지하십시오.',
      EN: '\n→ Maintain natural opening-development-closing rhythm referencing the pattern above.',
      JP: '\n→ 上記の構造パターンを参考に、自然な導入-展開-締めの呼吸を維持してください。',
      CN: '\n→ 参考上述结构模式，保持自然的开篇-发展-收尾节奏。',
    }));
  }

  if (parts.length === 0) return '';
  return parts.join('\n');
}

// IDENTITY_SEAL: PART-4 | role=RAG block builder | inputs=genre,language | outputs=prompt string
