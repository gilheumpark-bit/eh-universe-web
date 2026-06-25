"use client";

// ============================================================
// useSceneShare — 장면 공유 링크 생성 + config 영속 훅
// ============================================================
// createShareLink(scene-share.ts) 호출 후 토큰을 StoryConfig.sharedScenePreviews에 저장.
// 연출탭 대시보드의 SceneFeedbackViewer가 이 토큰으로 loadFeedbacks를 조회한다.

import { useCallback } from "react";
import type { StoryConfig } from "@/lib/studio-types";
import type { ParsedScene, VoiceMapping } from "@/engine/scene-parser";

interface UseSceneShareOpts {
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  currentSessionId: string | null;
}

export interface SharedScenePreview {
  token: string;
  title: string;
  episode: number;
  createdAt: number;
  expiresAt: number;
  feedbackEnabled: boolean;
}

export function useSceneShare({ config, updateCurrentSession, currentSessionId }: UseSceneShareOpts) {
  const createPreview = useCallback(async (
    scenes: ParsedScene[],
    voiceMappings: VoiceMapping[],
    opts?: {
      feedbackEnabled?: boolean;
      password?: string;
      expiryDays?: 1 | 7 | 30 | 365;
      authorName?: string;
    },
  ): Promise<string | null> => {
    if (!currentSessionId) return null;

    const { createShareLink } = await import("@/lib/scene-share");
    const expiryDays = opts?.expiryDays ?? 7;
    const now = Date.now();

    const token = await createShareLink({
      title: config.title || "Untitled",
      scenes,
      voiceMappings,
      expiryDays,
      feedbackEnabled: opts?.feedbackEnabled ?? true,
      password: opts?.password,
      authorName: opts?.authorName,
    });

    const preview: SharedScenePreview = {
      token,
      title: config.title || "Untitled",
      episode: config.episode ?? 1,
      createdAt: now,
      expiresAt: now + expiryDays * 24 * 3600_000,
      feedbackEnabled: opts?.feedbackEnabled ?? true,
    };

    updateCurrentSession({
      config: {
        ...config,
        sharedScenePreviews: [...(config.sharedScenePreviews ?? []), preview],
      },
    });

    return token;
  }, [config, currentSessionId, updateCurrentSession]);

  return {
    createPreview,
    previews: (config.sharedScenePreviews ?? []) as SharedScenePreview[],
  };
}
