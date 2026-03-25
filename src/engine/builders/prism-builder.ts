// ============================================================
// PRISM Builder — 콘텐츠 품질 제어 프롬프트 생성
// pipeline.ts에서 추출
// ============================================================

import type { StoryConfig } from '@/lib/studio-types';
import { PRISM_MODE_PRESETS } from '../types';
import { GENRE_PRESETS } from '../genre-presets';

// ============================================================
// NOA-PRISM v1.1 — Writing Quality Control System
// ============================================================

export function buildPrismBlock(config: StoryConfig, isKO: boolean): string {
  const scale = config.prismScale ?? 120;
  const preserve = config.prismPreserve ?? 100;

  const parts: string[] = [];

  // PRISM-CORE: Always-on writing rules
  parts.push(`[NOA-PRISM v1.1 — PRISM-CORE]`);
  if (isKO) {
    parts.push(`- 원문 보존 우선: 원문의 단어/문장/단락을 허가 없이 삭제·재배치 금지`);
    parts.push(`- 시점 잠금 (POV Lock): 설정된 시점 캐릭터 외 내면 서술 금지`);
    parts.push(`- 캐릭터 말맛 보존: 등록된 말투/대사 스타일을 절대 평준화하지 마라`);
    parts.push(`- 설정 환각 금지: 등록되지 않은 지명/인명/설정을 창작하지 마라`);
    parts.push(`- AI 냄새 차단: "그러나", "한편", "결론적으로" 등 요약형 연결사 사용 금지`);
    parts.push(`- 감정은 직접 명명 대신 장면으로: "슬펐다" 대신 행동/감각/환경으로 전달`);
  } else {
    parts.push(`- Preserve original: Never delete/reorder words/sentences/paragraphs without permission`);
    parts.push(`- POV Lock: No inner narration outside the set POV character`);
    parts.push(`- Character voice preservation: Never flatten registered speech styles`);
    parts.push(`- No setting hallucination: Do not invent unregistered names/places/lore`);
    parts.push(`- AI tone suppression: Avoid summary-style connectors ("however", "in conclusion")`);
    parts.push(`- Show emotion through scenes: Use action/sensation/environment instead of naming emotions`);
  }

  // Genre rhythm profile
  const genrePreset = GENRE_PRESETS[config.genre];
  if (genrePreset) {
    parts.push(`- ${isKO ? '장르 리듬' : 'Genre rhythm'}: ${genrePreset.pacing}`);
  }

  // PRISM-SCALE: Numeric control
  parts.push('');
  parts.push(`[PRISM-SCALE — Preserve: ${preserve} / Expand: ${scale}]`);

  // Preserve mode instructions
  if (preserve >= 100) {
    parts.push(isKO
      ? `- 보존 ${preserve}: 원문 삭제 금지, 순서 변경 금지.`
      : `- Preserve ${preserve}: No deletion, no reordering.`);
  } else {
    parts.push(isKO
      ? `- 보존 ${preserve}: 정리/축약 모드. 원문 압축 허용.`
      : `- Preserve ${preserve}: Compression mode. Original text condensation allowed.`);
  }

  // Scale mode instructions
  if (scale < 100) {
    parts.push(isKO
      ? `- 확장 ${scale}: 정리/축약 모드. 원문 압축 허용.`
      : `- Scale ${scale}: Compression mode. Condensation allowed.`);
  } else if (scale === 100) {
    parts.push(isKO
      ? `- 확장 ${scale}: 원문 보존. 삭제 금지, 순서 변경 금지.`
      : `- Scale ${scale}: Preserve original. No deletion, no reordering.`);
  } else if (scale <= 115) {
    parts.push(isKO
      ? `- 확장 ${scale}: 경량 확장. 감정/행동/묘사 소폭 보강.`
      : `- Scale ${scale}: Light expansion. Minor reinforcement of emotion/action/description.`);
  } else if (scale <= 130) {
    parts.push(isKO
      ? `- 확장 ${scale}: 표준 확장. 장면 밀도 상승, 감정선 보강, 연결 강화.`
      : `- Scale ${scale}: Standard expansion. Increased scene density, emotional arc reinforcement, stronger transitions.`);
  } else {
    parts.push(isKO
      ? `- 확장 ${scale}: 고밀도 확장. 감각/내면/상황 디테일 대폭 보강. 새 사건 제한.`
      : `- Scale ${scale}: High-density expansion. Major reinforcement of sensory/inner/situational detail. Limit new events.`);
  }

  // PRISM-WRITE execution summary
  parts.push('');
  parts.push(`[PRISM-WRITE]`);
  if (isKO) {
    parts.push(`- 확장 시 새 사건보다 기존 장면의 밀도를 높여라`);
    parts.push(`- 추가 묘사는 캐릭터 행동, 감각 디테일, 환경 반응 순서로 우선`);
    parts.push(`- 원문 문장 사이에 삽입하되 흐름을 끊지 마라`);
  } else {
    parts.push(`- When expanding, increase density of existing scenes rather than adding new events`);
    parts.push(`- Prioritize: character action, sensory detail, environmental response`);
    parts.push(`- Insert between existing sentences without breaking flow`);
  }

  return '\n' + parts.join('\n');
}

// ============================================================
// PRISM-MODE — Content Rating Prompt Builder
// ============================================================

export function buildPrismModeBlock(config: StoryConfig, isKO: boolean): string {
  const mode = config.prismMode ?? 'OFF';
  if (mode === 'OFF') return '';

  if (mode === 'FREE') {
    return isKO
      ? '\n[PRISM-MODE: FREE]\n- 기본 콘텐츠 가이드라인만 따르세요.'
      : '\n[PRISM-MODE: FREE]\n- Follow your default content guidelines only.';
  }

  const parts: string[] = [];
  parts.push(`\n[PRISM-MODE: ${mode}]`);

  if (mode === 'ALL') {
    if (isKO) {
      parts.push('- 성적 콘텐츠 금지.');
      parts.push('- 최소한의 폭력만 허용 (충격만, 피 묘사 금지).');
      parts.push('- 비속어 금지.');
    } else {
      parts.push('- No sexual content.');
      parts.push('- Minimal violence (impacts only, no blood).');
      parts.push('- No profanity.');
    }
  } else if (mode === 'T15') {
    if (isKO) {
      parts.push('- 로맨스는 키스/긴장감까지 허용.');
      parts.push('- 중간 수준 폭력 허용 (상처, 피).');
      parts.push('- 가벼운 비속어 허용.');
    } else {
      parts.push('- Romance up to kissing/tension.');
      parts.push('- Moderate violence (wounds, blood).');
      parts.push('- Mild profanity.');
    }
  } else if (mode === 'M18') {
    if (isKO) {
      parts.push('- 노골적인 로맨스 허용.');
      parts.push('- 그래픽 폭력 허용.');
      parts.push('- 강한 비속어 허용.');
    } else {
      parts.push('- Explicit romance allowed.');
      parts.push('- Graphic violence allowed.');
      parts.push('- Strong profanity allowed.');
    }
  } else if (mode === 'CUSTOM') {
    const custom = config.prismCustom ?? { sexual: 0, violence: 0, profanity: 0 };
    const preset = PRISM_MODE_PRESETS;
    // Generate rules based on slider values
    const sexLabels = isKO
      ? ['성적 콘텐츠 금지', '가벼운 암시만', '키스/긴장감까지', '짙은 로맨스', '노골적 허용', '제한 없음']
      : ['No sexual content', 'Light implication only', 'Up to kissing/tension', 'Heavy romance', 'Explicit allowed', 'No limits'];
    const violLabels = isKO
      ? ['폭력 금지', '충격만, 피 금지', '상처/피 허용', '그래픽 폭력', '극한 폭력', '제한 없음']
      : ['No violence', 'Impacts only, no blood', 'Wounds/blood allowed', 'Graphic violence', 'Extreme violence', 'No limits'];
    const profLabels = isKO
      ? ['비속어 금지', '매우 가벼운 비속어', '가벼운 비속어', '일반 비속어', '강한 비속어', '제한 없음']
      : ['No profanity', 'Very mild profanity', 'Mild profanity', 'Standard profanity', 'Strong profanity', 'No limits'];

    // Suppress unused variable warning — preset is referenced for type correctness
    void preset;

    parts.push(`- ${isKO ? '성적 수위' : 'Sexual'} [${custom.sexual}/5]: ${sexLabels[custom.sexual]}`);
    parts.push(`- ${isKO ? '폭력 수위' : 'Violence'} [${custom.violence}/5]: ${violLabels[custom.violence]}`);
    parts.push(`- ${isKO ? '비속어 수위' : 'Profanity'} [${custom.profanity}/5]: ${profLabels[custom.profanity]}`);
  }

  return parts.join('\n');
}

// ============================================================
// Language Pack — Writing Rules Prompt Builder
// ============================================================

