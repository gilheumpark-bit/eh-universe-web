// ============================================================
// Episode Auto-Summarizer
// 에피소드 저장 시 백그라운드 요약 생성 (qwen 범용 모델)
// ============================================================

import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { streamChat, getApiKey, getActiveProvider, hasDgxService } from '@/lib/ai-providers';
import { getModelForRole } from '@/lib/dgx-models';
import { logger } from '@/lib/logger';

const SUMMARY_PROMPT_KO = `당신은 웹소설 편집자입니다. 아래 에피소드 원문을 읽고, 핵심 사건과 감정 변화를 2~3문장(150자 이내)으로 요약하세요. 캐릭터 이름과 장소를 반드시 포함하세요. 다른 설명 없이 요약만 출력하세요.`;
const SUMMARY_PROMPT_EN = `You are a novel editor. Read the episode below and summarize the key events and emotional changes in 2-3 sentences (max 150 chars). Include character names and locations. Output only the summary.`;

/**
 * 에피소드 원고를 AI로 요약.
 * 실패 시 null 반환 — 호출부에서 fallback(첫 2줄) 처리.
 */
export async function generateEpisodeSummary(
  content: string,
  language: AppLanguage = 'KO',
): Promise<string | null> {
  if (!content || content.length < 100) return null;
  if (!getApiKey(getActiveProvider()) && !hasDgxService()) return null;

  const isKO = language === 'KO';
  const truncated = content.slice(0, 2000); // 토큰 절약: 앞 2000자만

  try {
    let summary = '';
    await streamChat({
      systemInstruction: isKO ? SUMMARY_PROMPT_KO : SUMMARY_PROMPT_EN,
      messages: [{ role: 'user', content: truncated }],
      temperature: 0.3, // 요약은 낮은 온도로 정확하게
      onChunk: (chunk) => { summary += chunk; },
      model: hasDgxService() ? getModelForRole('general') : undefined,
    });

    // 150자 제한 + 정리
    const cleaned = summary.replace(/^["']|["']$/g, '').trim().slice(0, 150);
    return cleaned || null;
  } catch (err) {
    logger.warn('EpisodeSummarizer', 'Summary generation failed:', err instanceof Error ? err.message : '');
    return null;
  }
}
