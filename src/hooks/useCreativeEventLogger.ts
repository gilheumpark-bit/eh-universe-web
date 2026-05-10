"use client";

// ============================================================
// useCreativeEventLogger — Studio 자동 누적 hook
// ============================================================
//
// StudioShell 에 단 1줄 mount. 5 mark 헬퍼 반환.
// 작가 의식 0 — hook 의 헬퍼만 호출하면 IndexedDB 자동 기록.
//
// 사상 정합:
//   - 5차 §2 "사용자는 편의를 산다, 장부는 뒤에서 자동 쌓인다"
//   - 13차 §6 자동 발급·전송 5중 자동화의 첫 단계
// ============================================================

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  recordCreativeEvent,
  recordSource,
  computeSha256Hex,
  type CreativeOriginType,
} from '@/lib/creative-process';

// ============================================================
// PART 1 — 헬퍼 시그니처
// ============================================================

export interface CreativeEventLogger {
  /** 작가 직접 수정 (HUMAN_REVISION) */
  logHumanEdit: (params: {
    targetType: 'manuscript' | 'world' | 'character' | 'scene' | 'glossary' | 'metadata' | 'other';
    targetId: string;
    episodeId?: number;
    beforeContent?: string;
    afterContent: string;
    note?: string;
  }) => Promise<string | null>;

  /** AI 초안 생성 (AI_DRAFT) */
  logAIDraft: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    episodeId?: number;
    afterContent: string;
    provider?: string;
    model?: string;
    promptLabel?: string;
  }) => Promise<string | null>;

  /** AI 제안 작가 채택 (AI_SUGGESTION + accept event) */
  logAcceptAI: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    episodeId?: number;
    afterContent: string;
    provider?: string;
    model?: string;
  }) => Promise<string | null>;

  /** 외부 텍스트 편입 (EXTERNAL_IMPORT + import event) */
  logExternalImport: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    label: string;
    content: string;
    fileName?: string;
    url?: string;
    licenseNote?: string;
  }) => Promise<string | null>;

  /** 템플릿·프리셋 시드 적용 (TEMPLATE_SEED) */
  logTemplateSeed: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    afterContent: string;
    templateName?: string;
  }) => Promise<string | null>;
}

// 네임스페이스 트릭으로 TargetType alias
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CreativeEventLogger {
  export type TargetType =
    | 'manuscript'
    | 'world'
    | 'character'
    | 'scene'
    | 'glossary'
    | 'metadata'
    | 'other';
}

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * Studio 자동 누적 hook.
 *
 * @param projectId 현재 프로젝트 (null 시 모든 헬퍼 no-op)
 * @returns 5 mark 헬퍼 (모두 useCallback wrap)
 *
 * 사용 예 (StudioShell 1줄):
 *   const logger = useCreativeEventLogger(currentProject?.id ?? null);
 *
 * 그 후 자식 컴포넌트가 logger.logHumanEdit({...}) 호출.
 */
export function useCreativeEventLogger(
  projectId: string | null,
): CreativeEventLogger {
  // [C] projectId null 시 no-op 반환
  const noOp = useCallback(async () => null, []);

  const logHumanEdit = useCallback<CreativeEventLogger['logHumanEdit']>(
    async ({ targetType, targetId, episodeId, beforeContent, afterContent, note }) => {
      if (!projectId) return null;
      try {
        const beforeHash = beforeContent ? await computeSha256Hex(beforeContent) : null;
        const afterHash = await computeSha256Hex(afterContent);
        const id = await recordCreativeEvent({
          projectId,
          episodeId,
          targetType,
          targetId,
          eventType: beforeContent ? 'edit' : 'create',
          actorType: 'human',
          actorId: 'author',
          originType: beforeContent ? 'HUMAN_REVISION' : 'HUMAN_DRAFT',
          beforeHash,
          afterHash,
          note,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logHumanEdit failed', err);
        return null;
      }
    },
    [projectId],
  );

  const logAIDraft = useCallback<CreativeEventLogger['logAIDraft']>(
    async ({ targetType, targetId, episodeId, afterContent, provider, model, promptLabel }) => {
      if (!projectId) return null;
      try {
        const afterHash = await computeSha256Hex(afterContent);
        // SourceRecord 함께 기록 (AI 출력 출처)
        const sourceId = await recordSource({
          projectId,
          sourceType: 'ai_output',
          label: promptLabel || `AI draft for ${targetType}/${targetId}`,
          contentHash: afterHash,
          provider,
          model,
          visibility: 'private',
        });
        const id = await recordCreativeEvent({
          projectId,
          episodeId,
          targetType,
          targetId,
          eventType: 'create',
          actorType: 'ai',
          actorId: provider || 'unknown',
          originType: 'AI_DRAFT',
          beforeHash: null,
          afterHash,
          sourceId,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logAIDraft failed', err);
        return null;
      }
    },
    [projectId],
  );

  const logAcceptAI = useCallback<CreativeEventLogger['logAcceptAI']>(
    async ({ targetType, targetId, episodeId, afterContent, provider, model }) => {
      if (!projectId) return null;
      try {
        const afterHash = await computeSha256Hex(afterContent);
        const id = await recordCreativeEvent({
          projectId,
          episodeId,
          targetType,
          targetId,
          eventType: 'accept',
          actorType: 'human',
          actorId: 'author',
          originType: 'AI_SUGGESTION',
          beforeHash: null,
          afterHash,
          note: `Accepted AI suggestion (${provider || 'unknown'}/${model || 'unknown'})`,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logAcceptAI failed', err);
        return null;
      }
    },
    [projectId],
  );

  const logExternalImport = useCallback<CreativeEventLogger['logExternalImport']>(
    async ({ targetType, targetId, label, content, fileName, url, licenseNote }) => {
      if (!projectId) return null;
      try {
        const contentHash = await computeSha256Hex(content);
        const sourceId = await recordSource({
          projectId,
          sourceType: 'external_doc',
          label,
          contentHash,
          fileName,
          url,
          licenseNote,
          visibility: 'private',
        });
        const id = await recordCreativeEvent({
          projectId,
          targetType,
          targetId,
          eventType: 'import',
          actorType: 'human',
          actorId: 'author',
          originType: 'EXTERNAL_IMPORT',
          beforeHash: null,
          afterHash: contentHash,
          sourceId,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logExternalImport failed', err);
        return null;
      }
    },
    [projectId],
  );

  const logTemplateSeed = useCallback<CreativeEventLogger['logTemplateSeed']>(
    async ({ targetType, targetId, afterContent, templateName }) => {
      if (!projectId) return null;
      try {
        const afterHash = await computeSha256Hex(afterContent);
        const id = await recordCreativeEvent({
          projectId,
          targetType,
          targetId,
          eventType: 'create',
          actorType: 'system',
          actorId: 'template',
          originType: 'TEMPLATE_SEED' satisfies CreativeOriginType,
          beforeHash: null,
          afterHash,
          note: templateName ? `Template: ${templateName}` : undefined,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logTemplateSeed failed', err);
        return null;
      }
    },
    [projectId],
  );

  // projectId null 시 모두 no-op
  if (!projectId) {
    return {
      logHumanEdit: noOp,
      logAIDraft: noOp,
      logAcceptAI: noOp,
      logExternalImport: noOp,
      logTemplateSeed: noOp,
    };
  }

  return {
    logHumanEdit,
    logAIDraft,
    logAcceptAI,
    logExternalImport,
    logTemplateSeed,
  };
}
