// ============================================================
// PART 1 — Module Header
// ============================================================
//
// honorifics.ts — 캐릭터 관계 거리 → 한국식 호칭 자동 매핑.
//
// 시장 분석 4차 §3 §4 §5 핵심 요구:
//   "캐릭터 호칭과 관계 거리 조정 / 존댓말/반말 뉘앙스"
//
// Faithful track: 원본 호칭 그대로 유지 (이 모듈 미사용)
// Market track:   관계 거리·나이차·성별 → 한국식 호칭 자동 변환 매트릭스
//
// 결정론적 — LLM 호출 없이 룰베이스로 호칭 후보 생성.
// LLM 은 후보를 받아 문맥에 따라 최종 채택 (prompt 영역에 hint 주입).
//
// [C] 모든 입력 normalize — 미지정 필드는 default 동작
// [C] 한국식 호칭 외에는 반환 X (Faithful 보존이 우선)
// [G] 정적 lookup table — O(1)
// [K] 단일 책임 — 호칭 매핑만, 대화 변환은 별개
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

/** 화자 → 청자 관계 거리 */
export type RelationDistance = 'close' | 'medium' | 'distant' | 'unknown';

/** 화자 기준 청자의 상대적 나이 */
export type AgeRelation = 'younger' | 'same' | 'older' | 'unknown';

export type Gender = 'male' | 'female' | 'unknown';

export interface CharacterRelation {
  /** 화자 (말하는 사람) */
  speaker: { name: string; gender?: Gender };
  /** 청자 (듣는 사람) */
  listener: { name: string; gender?: Gender };
  /** 관계 거리 */
  distance: RelationDistance;
  /** 나이 관계 */
  age: AgeRelation;
  /** 위계 (상사/부하/동료/낯선이/가족) */
  hierarchy?: 'superior' | 'subordinate' | 'peer' | 'stranger' | 'family' | 'romantic';
}

export interface HonorificSuggestion {
  /** 한국식 호칭 후보 (예: "오빠", "형", "님") */
  honorific: string;
  /** 영어 설명 (LLM hint 용) */
  reasoning: string;
  /** 추천도 0~1 — 동률일 때 LLM 판단 */
  confidence: number;
  /** 존댓말/반말 권장 */
  speechLevel: 'formal' | 'polite' | 'casual';
}

// ============================================================
// PART 3 — 호칭 매핑 매트릭스
// ============================================================

/**
 * 한국식 호칭 매트릭스.
 *
 * 우선 순위 룰:
 *   1) hierarchy='family' + age='older' + 청자 male → "형" (남자 화자) / "오빠" (여자 화자)
 *   2) hierarchy='family' + age='older' + 청자 female → "누나" (남자) / "언니" (여자)
 *   3) hierarchy='superior' + distance='medium/distant' → "선배"/"부장님" 등
 *   4) hierarchy='peer' + distance='close' → 이름 + "야" (반말)
 *   5) hierarchy='stranger' or distance='distant' → 이름 + "씨"/"님"
 *   6) hierarchy='romantic' + age='older' (남) → "오빠" (여자 화자, 친밀)
 */
export function suggestHonorific(rel: CharacterRelation): HonorificSuggestion[] {
  const suggestions: HonorificSuggestion[] = [];
  const speakerGender = rel.speaker.gender ?? 'unknown';
  const listenerGender = rel.listener.gender ?? 'unknown';

  // 1·2·6) 가족·연인 — 형/오빠/누나/언니
  if (rel.hierarchy === 'family' || rel.hierarchy === 'romantic') {
    if (rel.age === 'older') {
      if (listenerGender === 'male') {
        suggestions.push({
          honorific: speakerGender === 'female' ? '오빠' : '형',
          reasoning:
            speakerGender === 'female'
              ? 'female speaker → older male family/romantic = 오빠'
              : 'male speaker → older male family = 형',
          confidence: 0.95,
          speechLevel: rel.distance === 'close' ? 'casual' : 'polite',
        });
      } else if (listenerGender === 'female') {
        suggestions.push({
          honorific: speakerGender === 'male' ? '누나' : '언니',
          reasoning:
            speakerGender === 'male'
              ? 'male speaker → older female family = 누나'
              : 'female speaker → older female family = 언니',
          confidence: 0.95,
          speechLevel: rel.distance === 'close' ? 'casual' : 'polite',
        });
      }
    } else if (rel.age === 'younger') {
      // 동생: 이름만 부르거나 "동생"
      suggestions.push({
        honorific: rel.listener.name,
        reasoning: 'younger family/romantic → name only (반말)',
        confidence: 0.85,
        speechLevel: 'casual',
      });
    }
  }

  // 3) 직장 위계 — 선배/부장님/팀장님
  if (rel.hierarchy === 'superior') {
    suggestions.push({
      honorific: `${rel.listener.name} 선배`,
      reasoning: 'superior in company → 선배 with name',
      confidence: 0.7,
      speechLevel: 'formal',
    });
  } else if (rel.hierarchy === 'subordinate') {
    suggestions.push({
      honorific: `${rel.listener.name} 씨`,
      reasoning: 'subordinate → polite distance with 씨',
      confidence: 0.7,
      speechLevel: 'polite',
    });
  }

  // 4) peer + close → 이름만 / 야
  if (rel.hierarchy === 'peer' && rel.distance === 'close') {
    suggestions.push({
      honorific: rel.listener.name,
      reasoning: 'close peer → name only, casual register',
      confidence: 0.8,
      speechLevel: 'casual',
    });
  }

  // 5) stranger / distant → 씨 / 님
  if (rel.hierarchy === 'stranger' || rel.distance === 'distant') {
    suggestions.push({
      honorific: `${rel.listener.name} 씨`,
      reasoning: 'stranger / distant → 씨 (polite distance)',
      confidence: 0.85,
      speechLevel: 'polite',
    });
    suggestions.push({
      honorific: `${rel.listener.name} 님`,
      reasoning: 'distant + respectful → 님 (formal)',
      confidence: 0.75,
      speechLevel: 'formal',
    });
  }

  // 폴백 — 이름만
  if (suggestions.length === 0) {
    suggestions.push({
      honorific: rel.listener.name,
      reasoning: 'unknown relation → name only fallback',
      confidence: 0.3,
      speechLevel: 'polite',
    });
  }

  // confidence 내림차순
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================
// PART 4 — buildHonorificHint — buildPrompt 의 characterProfiles 영역 hint
// ============================================================

/**
 * 캐릭터 관계 list → buildPrompt 에 주입할 호칭 hint 텍스트.
 *
 * 출력 형식 (LLM 이 적용):
 *   [Honorific Hints — Market track only]:
 *   - 김철수 (speaker, female) → 김민수 (older male, romantic): suggest "오빠" (casual)
 *   - 이영희 (peer, close) → 박지수: suggest "지수" (casual)
 */
export function buildHonorificHint(relations: CharacterRelation[]): string {
  if (relations.length === 0) return '';
  const lines = relations
    .map((rel) => {
      const top = suggestHonorific(rel)[0];
      if (!top) return null;
      return `- ${rel.speaker.name} → ${rel.listener.name}: suggest "${top.honorific}" (${top.speechLevel}; ${top.reasoning})`;
    })
    .filter((l): l is string => l !== null);
  if (lines.length === 0) return '';
  return `[Honorific Hints — Market track]:\n${lines.join('\n')}\n`;
}
