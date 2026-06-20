// ============================================================
// PART 1 — Episode Auto-Summarizer
// 에피소드 저장 시 백그라운드 요약 생성 (qwen 범용 모델)
// 2-Level: compact(150자) + detailed(500자) for Hybrid Context
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';
import { streamChat, getApiKey, getActiveProvider, hasDgxService } from '@/lib/ai-providers';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { logger } from '@/lib/logger';

// IDENTITY_SEAL: PART-1 | role=module header | inputs=none | outputs=none

// ============================================================
// PART 2 — Compact Summary (Tier A: 150자)
// ============================================================

const SUMMARY_PROMPT_KO = `당신은 웹소설 편집자입니다. 아래 에피소드 원문을 읽고, 핵심 사건과 감정 변화를 2~3문장(150자 이내)으로 요약하세요. 캐릭터 이름과 장소를 반드시 포함하세요. 다른 설명 없이 요약만 출력하세요.`;
const SUMMARY_PROMPT_EN = `You are a novel editor. Read the episode below and summarize the key events and emotional changes in 2-3 sentences (max 150 chars). Include character names and locations. Output only the summary.`;

/**
 * 에피소드 원고를 AI로 요약 (compact — Tier A용).
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
      model: hasDgxService() ? VLLM_MODEL_ID : undefined,
    });

    // 150자 제한 + 정리
    const cleaned = summary.replace(/^["']|["']$/g, '').trim().slice(0, 150);
    return cleaned || null;
  } catch (err) {
    logger.warn('EpisodeSummarizer', 'Summary generation failed:', err instanceof Error ? err.message : '');
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=compact summary | inputs=content,language | outputs=string|null (150자)

// ============================================================
// PART 3 — Detailed Summary (Tier B: 500자)
// 캐릭터 감정, 핵심 결정, 장면 전환을 포함하는 상세 요약
// ============================================================

const DETAILED_SUMMARY_PROMPT_KO = `당신은 웹소설 편집자입니다. 아래 에피소드 원문을 읽고, 5~8문장(500자 이내)으로 상세하게 요약하세요.
반드시 포함할 요소:
- 캐릭터의 감정 변화
- 핵심 결정과 선택
- 장면 전환 흐름
캐릭터 이름과 장소를 반드시 포함하세요. 다른 설명 없이 요약만 출력하세요.`;

const DETAILED_SUMMARY_PROMPT_EN = `You are a novel editor. Read the episode below and write a detailed summary in 5-8 sentences (max 500 chars).
Must include:
- Character emotional changes
- Key decisions and choices
- Scene transition flow
Include character names and locations. Output only the summary.`;

/**
 * 에피소드 원고를 AI로 상세 요약 (detailed — Tier B(N-2)용).
 * compact summary보다 3배 길고, 감정/결정/장면전환 포함.
 * 실패 시 null 반환 — 호출부에서 compact summary → 첫 500자 fallback 체인.
 */
export async function generateDetailedSummary(
  content: string,
  language: AppLanguage = 'KO',
): Promise<string | null> {
  if (!content || content.length < 100) return null;
  if (!getApiKey(getActiveProvider()) && !hasDgxService()) return null;

  const isKO = language === 'KO';
  const truncated = content.slice(0, 3000); // 상세 요약은 더 많은 원문 필요

  try {
    let summary = '';
    await streamChat({
      systemInstruction: isKO ? DETAILED_SUMMARY_PROMPT_KO : DETAILED_SUMMARY_PROMPT_EN,
      messages: [{ role: 'user', content: truncated }],
      temperature: 0.3, // 요약은 낮은 온도로 정확하게
      onChunk: (chunk) => { summary += chunk; },
      model: hasDgxService() ? VLLM_MODEL_ID : undefined,
    });

    // 500자 제한 + 정리
    const cleaned = summary.replace(/^["']|["']$/g, '').trim().slice(0, 500);
    return cleaned || null;
  } catch (err) {
    logger.warn('EpisodeSummarizer', 'Detailed summary generation failed:', err instanceof Error ? err.message : '');
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=detailed summary | inputs=content,language | outputs=string|null (500자)
