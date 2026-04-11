"use client";

import { useMemo } from 'react';
import type { StoryConfig, Character } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입
// ============================================================

export interface ContinuityWarning {
  type: 'name-typo' | 'name-missing' | 'trait-conflict' | 'setting-conflict' | 'timeline-gap';
  severity: 'error' | 'warning' | 'info';
  messageKO: string;
  messageEN: string;
  position?: number; // char offset in text
}

// ============================================================
// PART 2 — 캐릭터 이름 검증
// ============================================================

function checkNameConsistency(text: string, characters: Character[]): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  if (!characters || characters.length === 0) return warnings;

  for (const char of characters) {
    const name = char.name?.trim();
    if (!name || name.length < 2) continue;

    // 이름이 한 번도 안 나오면 경고
    if (!text.includes(name)) {
      // 비슷한 이름 찾기 (편집 거리 1)
      const similar = findSimilarNames(text, name);
      if (similar.length > 0) {
        warnings.push({
          type: 'name-typo',
          severity: 'warning',
          messageKO: `"${name}" 대신 "${similar[0]}"이(가) 사용됨 — 오타일 수 있습니다.`,
          messageEN: `"${similar[0]}" found instead of "${name}" — possible typo.`,
        });
      }
    }
  }

  return warnings;
}

function findSimilarNames(text: string, name: string): string[] {
  // 편집 거리 1 이내 이름 검색
  const results: string[] = [];
  const isKO = /[가-힣]/.test(name);

  if (isKO && name.length >= 2) {
    // 한글: 각 글자 하나씩 바꿔서 찾기
    for (let i = 0; i < name.length; i++) {
      const pattern = name.slice(0, i) + '.' + name.slice(i + 1);
      const regex = new RegExp(pattern, 'g');
      const matches = text.match(regex);
      if (matches) {
        for (const m of matches) {
          if (m !== name && !results.includes(m)) results.push(m);
        }
      }
    }
  }

  return results.slice(0, 3);
}

// ============================================================
// PART 3 — 특성 모순 검증
// ============================================================

function checkTraitConflicts(text: string, characters: Character[]): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];

  for (const char of characters) {
    if (!char.name || !text.includes(char.name)) continue;

    // 성격 모순 감지 (간단 휴리스틱)
    if (char.traits) {
      const traits = char.traits.toLowerCase();
      const lowerText = text.toLowerCase();

      // 특성 모순 검출 — severity: info (캐릭터 성장 장면에서 false positive 방지)
      const conflictPairs: [string, string, string, string][] = [
        ['조용', '소리를 질렀다', '조용한 성격 — 소리 지르는 장면 (의도적 변화?)', 'Quiet character shouting (intentional growth?)'],
        ['내성적', '파티를 즐기', '내성적 캐릭터 — 파티 장면 (의도적 변화?)', 'Introverted at party (intentional growth?)'],
        ['겁쟁이', '두려움 없이', '겁쟁이 캐릭터 — 두려움 없는 장면 (의도적 변화?)', 'Coward showing no fear (intentional growth?)'],
        ['shy', 'shouted', 'Shy character shouting (intentional growth?)', 'Shy character shouting (intentional growth?)'],
        ['introverted', 'party', 'Introverted at party (intentional growth?)', 'Introverted at party (intentional growth?)'],
      ];

      for (const [trait, conflict, ko, en] of conflictPairs) {
        if (traits.includes(trait) && lowerText.includes(conflict)) {
          const nameIdx = text.indexOf(char.name);
          // 캐릭터 이름 ±300자 범위에서만 검출 (문맥 확대)
          const nearbyText = text.slice(Math.max(0, nameIdx - 300), nameIdx + 300).toLowerCase();
          if (nearbyText.includes(conflict)) {
            warnings.push({
              type: 'trait-conflict',
              severity: 'info', // warning→info: 캐릭터 성장 장면 오감지 방지
              messageKO: `${char.name}: ${ko}`,
              messageEN: `${char.name}: ${en}`,
              position: nameIdx,
            });
          }
        }
      }
    }
  }

  return warnings;
}

// ============================================================
// PART 4 — 설정 모순 검증
// ============================================================

function checkSettingConflicts(text: string, config: StoryConfig): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];

  // 시간대 모순 (밤인데 태양, 낮인데 달)
  const nightPatterns = ['밤', '자정', '새벽', 'midnight', 'night', 'dawn'];
  const dayPatterns = ['낮', '정오', '오후', 'noon', 'afternoon', 'midday'];
  const sunPatterns = ['태양', '햇살', '햇빛', 'sunlight', 'sunshine', 'sun shone'];
  const moonPatterns = ['달빛', '보름달', '초승달', 'moonlight', 'moonlit'];

  const hasNight = nightPatterns.some(p => text.includes(p));
  const hasDay = dayPatterns.some(p => text.includes(p));
  const hasSun = sunPatterns.some(p => text.includes(p));
  const hasMoon = moonPatterns.some(p => text.includes(p));

  if (hasNight && hasSun) {
    warnings.push({
      type: 'setting-conflict', severity: 'info',
      messageKO: '밤 장면에 태양 묘사가 있습니다.',
      messageEN: 'Sunlight described in a nighttime scene.',
    });
  }
  if (hasDay && hasMoon) {
    warnings.push({
      type: 'setting-conflict', severity: 'info',
      messageKO: '낮 장면에 달빛 묘사가 있습니다.',
      messageEN: 'Moonlight described in a daytime scene.',
    });
  }

  // 장르 불일치 감지 (판타지인데 현대 기술 등)
  const genre = config.genre?.toLowerCase() || '';
  if (genre.includes('fantasy') || genre.includes('wuxia')) {
    const modernTerms = ['스마트폰', '컴퓨터', '인터넷', 'smartphone', 'computer', 'internet', 'email'];
    for (const term of modernTerms) {
      if (text.toLowerCase().includes(term)) {
        warnings.push({
          type: 'setting-conflict', severity: 'warning',
          messageKO: `판타지/무협 세계관에 현대 용어 "${term}" 사용됨.`,
          messageEN: `Modern term "${term}" in fantasy/wuxia setting.`,
        });
        break; // 하나만
      }
    }
  }

  return warnings;
}

// ============================================================
// PART 5 — 메인 훅
// ============================================================

export function useContinuityCheck(text: string, config: StoryConfig | null): ContinuityWarning[] {
  return useMemo(() => {
    if (!text || text.trim().length < 30 || !config) return [];

    const warnings: ContinuityWarning[] = [];

    // 캐릭터 이름 검증
    if (config.characters?.length) {
      warnings.push(...checkNameConsistency(text, config.characters));
      warnings.push(...checkTraitConflicts(text, config.characters));
    }

    // 설정 모순
    warnings.push(...checkSettingConflicts(text, config));

    // 중복 제거
    const seen = new Set<string>();
    return warnings.filter(w => {
      const key = `${w.type}:${w.messageKO}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [text, config]);
}
