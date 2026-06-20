// ============================================================
// PART 1 — Proactive Suggestions Engine
// ============================================================
// ShadowState + NOD + Scoring 기반 선제 경고 시스템
// Soft Logic 원칙: 조언만, 차단 없음, 작가가 무시 가능

import type {
  StoryConfig, ProactiveSuggestion, SuggestionConfig,
  SuggestionCategory, SuggestionPriority, SkillLevel, AppLanguage,
} from '@/lib/studio-types';

// ============================================================
// PART 2 — Default Config by Skill Level
// ============================================================

export function getDefaultSuggestionConfig(level: SkillLevel): SuggestionConfig {
  const allCategories: Record<SuggestionCategory, boolean> = {
    character_drift: true, world_inconsistency: true, tension_mismatch: true,
    thread_overdue: true, pacing_anomaly: true, emotion_flat: true,
    ai_tone_creep: true, hallucination_risk: true, foreshadow_urgent: true,
  };

  return {
    enabled: true,
    maxPerGeneration: level === 'beginner' ? 1 : 3,
    cooldownTurns: level === 'beginner' ? 10 : level === 'intermediate' ? 5 : 3,
    suppressAfterDismiss: 3,
    categories: level === 'beginner'
      ? { tension_mismatch: true, emotion_flat: true, ai_tone_creep: true }
      : allCategories,
  };
}

// IDENTITY_SEAL: PART-2 | role=default config | inputs=SkillLevel | outputs=SuggestionConfig

// ============================================================
// PART 3 — Suggestion Generator
// ============================================================

interface SuggestionContext {
  config: StoryConfig;
  currentEpisode: number;
  recentMetrics: Array<{ tension: number; pacing: number; immersion: number; eos: number; grade: string }>;
  characterNames: string[];
  characterLastAppearance: Record<string, number>;  // name → last episode
  language: AppLanguage;
}

function msg(ko: string, en: string, lang: AppLanguage): string {
  return lang === 'KO' ? ko : en;
}

export function generateSuggestions(
  ctx: SuggestionContext,
  sgConfig: SuggestionConfig,
  previousSuggestions: ProactiveSuggestion[] = [],
): ProactiveSuggestion[] {
  if (!sgConfig.enabled) return [];

  const suggestions: ProactiveSuggestion[] = [];
  const now = Date.now();
  const ep = ctx.currentEpisode;
  const lang = ctx.language;

  // 쿨다운 체크 — 최근 N턴 내 같은 카테고리 억제
  const recentCategories = new Set(
    previousSuggestions
      .filter(s => !s.dismissed && s.episode >= ep - sgConfig.cooldownTurns)
      .map(s => s.category)
  );

  // dismiss 횟수 체크
  const dismissCounts: Record<string, number> = {};
  previousSuggestions.forEach(s => {
    if (s.dismissed) dismissCounts[s.category] = (dismissCounts[s.category] || 0) + 1;
  });

  // Cooldown filter: suppresses categories that fired recently or were dismissed too many times.
  // This is by design — prevents notification fatigue. Suppressed suggestions are silently dropped.
  const canSuggest = (cat: SuggestionCategory): boolean => {
    if (!sgConfig.categories[cat]) return false;
    if (recentCategories.has(cat)) return false; // cooldown: same category within N turns
    if ((dismissCounts[cat] || 0) >= sgConfig.suppressAfterDismiss) return false; // user dismissed N times
    return true;
  };

  const add = (cat: SuggestionCategory, pri: SuggestionPriority, message: string, hint: string) => {
    if (!canSuggest(cat)) return;
    suggestions.push({
      id: `sg-${cat}-${now}`,
      category: cat,
      priority: pri,
      message,
      actionHint: hint,
      episode: ep,
      dismissed: false,
      dismissCount: dismissCounts[cat] || 0,
    });
  };

  // --- Character Drift: 5화 이상 미등장 ---
  if (ctx.characterNames.length > 0) {
    for (const name of ctx.characterNames) {
      const lastEp = ctx.characterLastAppearance[name] ?? 0;
      if (ep - lastEp >= 5) {
        add('character_drift', 'warning',
          msg(`캐릭터 '${name}'이(가) ${ep - lastEp}화째 등장하지 않았습니다.`, `Character '${name}' hasn't appeared for ${ep - lastEp} episodes.`, lang),
          msg(`다음 장면에 등장시키거나, 다른 캐릭터의 대화에서 언급하세요.`, `Include them in the next scene or mention them in dialogue.`, lang),
        );
        break; // 한 명만
      }
    }
  }

  // --- Tension Mismatch: 목표 대비 30+ 편차 ---
  if (ctx.recentMetrics.length > 0) {
    const last = ctx.recentMetrics[ctx.recentMetrics.length - 1];
    const total = ctx.config.totalEpisodes ?? 25;
    // 간단 계산: 목표 긴장도 = episode/total 비율 기반
    const targetRatio = ep / total;
    const expectedTension = 30 + targetRatio * 50; // 30~80 범위
    const delta = Math.abs(last.tension - expectedTension);
    if (delta > 30) {
      add('tension_mismatch', 'warning',
        msg(`긴장도가 목표 대비 ${Math.round(delta)}% 벗어났습니다. (현재: ${last.tension}, 목표: ${Math.round(expectedTension)})`, `Tension is ${Math.round(delta)}% off target. (Current: ${last.tension}, Target: ${Math.round(expectedTension)})`, lang),
        msg(`갈등 요소를 추가하거나 위기감을 조절하세요.`, `Add conflict elements or adjust urgency.`, lang),
      );
    }
  }

  // --- Emotion Flat: EOS 30 미만 3연속 ---
  if (ctx.recentMetrics.length >= 3) {
    const lastThree = ctx.recentMetrics.slice(-3);
    if (lastThree.every(m => m.eos < 30)) {
      add('emotion_flat', 'critical',
        msg(`감정 밀도가 3화 연속 낮습니다. (EOS: ${lastThree.map(m => m.eos).join(', ')})`, `Emotion density has been low for 3 consecutive chapters. (EOS: ${lastThree.map(m => m.eos).join(', ')})`, lang),
        msg(`내면 독백, 감각 묘사, 감정 대화를 늘려보세요.`, `Add inner monologue, sensory details, and emotional dialogue.`, lang),
      );
    }
  }

  // --- Pacing Anomaly: 극단값 ---
  if (ctx.recentMetrics.length > 0) {
    const last = ctx.recentMetrics[ctx.recentMetrics.length - 1];
    if (last.pacing < 30) {
      add('pacing_anomaly', 'warning',
        msg(`페이싱이 매우 느립니다. (${last.pacing}/100)`, `Pacing is very slow. (${last.pacing}/100)`, lang),
        msg(`문장 길이에 변화를 주고, 짧은 대화를 섞어보세요.`, `Vary sentence length and mix in short dialogue.`, lang),
      );
    } else if (last.pacing > 90) {
      add('pacing_anomaly', 'info',
        msg(`페이싱이 매우 빠릅니다. (${last.pacing}/100) 독자가 숨 돌릴 여유가 필요할 수 있습니다.`, `Pacing is very fast. (${last.pacing}/100) Readers may need breathing room.`, lang),
        msg(`묘사 장면이나 내면 독백으로 호흡을 조절하세요.`, `Use description or inner monologue to control pacing.`, lang),
      );
    }
  }

  // --- AI Tone Creep: 최근 3화 평균 AI톤 ---
  // (AI톤은 현재 director findings에서 계산 — 여기서는 grade 기반 간접 추정)
  if (ctx.recentMetrics.length >= 3) {
    const lastThree = ctx.recentMetrics.slice(-3);
    const avgGradeNum = lastThree.reduce((sum, m) => {
      const gn: Record<string, number> = { 'S++': 100, 'S+': 95, 'S': 90, 'A+': 85, 'A': 80, 'B+': 75, 'B': 70, 'C+': 65, 'C': 60 };
      return sum + (gn[m.grade] ?? 60);
    }, 0) / 3;
    if (avgGradeNum < 65) {
      add('ai_tone_creep', 'warning',
        msg(`최근 3화 평균 등급이 C+입니다. AI 문투가 누적되었을 수 있습니다.`, `Average grade for last 3 chapters is C+. AI tone may be accumulating.`, lang),
        msg(`"요약하자면", "결론적으로" 같은 패턴을 확인하세요.`, `Check for patterns like "in summary", "in conclusion".`, lang),
      );
    }
  }

  // 우선순위 정렬 + 최대 개수 제한
  const priorityOrder: Record<SuggestionPriority, number> = { critical: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.slice(0, sgConfig.maxPerGeneration);
}

// IDENTITY_SEAL: PART-3 | role=suggestion generator | inputs=context,config | outputs=ProactiveSuggestion[]

// ============================================================
// PART 4 — Dismiss Handler
// ============================================================

export function dismissSuggestion(
  suggestions: ProactiveSuggestion[],
  id: string,
): ProactiveSuggestion[] {
  return suggestions.map(s =>
    s.id === id ? { ...s, dismissed: true, dismissCount: s.dismissCount + 1 } : s
  );
}

// IDENTITY_SEAL: PART-4 | role=dismiss handler | inputs=suggestions,id | outputs=updated suggestions

// ============================================================
// PART 5 — Suggestion Analytics
// ============================================================

export interface SuggestionAnalytics {
  totalGenerated: number;
  totalAccepted: number;
  totalDismissed: number;
  acceptanceRate: number;
  /** 카테고리별 채택률 */
  categoryRates: Record<string, { generated: number; dismissed: number; rate: number }>;
}

/** 제안 이력에서 채택/거부 통계 집계 */
export function aggregateSuggestionAnalytics(
  allSuggestions: ProactiveSuggestion[],
): SuggestionAnalytics {
  const totalGenerated = allSuggestions.length;
  const totalDismissed = allSuggestions.filter(s => s.dismissed).length;
  const totalAccepted = totalGenerated - totalDismissed;
  const acceptanceRate = totalGenerated > 0 ? totalAccepted / totalGenerated : 0;

  const categories: Record<string, { generated: number; dismissed: number }> = {};
  for (const s of allSuggestions) {
    const cat = s.category;
    if (!categories[cat]) categories[cat] = { generated: 0, dismissed: 0 };
    categories[cat].generated++;
    if (s.dismissed) categories[cat].dismissed++;
  }

  const categoryRates: SuggestionAnalytics['categoryRates'] = {};
  for (const [cat, data] of Object.entries(categories)) {
    const accepted = data.generated - data.dismissed;
    categoryRates[cat] = {
      generated: data.generated,
      dismissed: data.dismissed,
      rate: data.generated > 0 ? accepted / data.generated : 0,
    };
  }

  return { totalGenerated, totalAccepted, totalDismissed, acceptanceRate, categoryRates };
}

// IDENTITY_SEAL: PART-5 | role=analytics | inputs=suggestions[] | outputs=SuggestionAnalytics
