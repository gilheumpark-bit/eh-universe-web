"use client";

// ============================================================
// useCreativeEventLogger — Studio 과정기록 hook
// ============================================================
//
// StudioShell 에 단 1줄 mount. 5 mark 헬퍼 반환.
// automaticEnabled=false 일 때는 명시 동의 전 기록을 남기지 않는다.
//
// 사상 정합:
//   - 5차 §2 "사용자는 편의를 산다, 장부는 뒤에서 자동 쌓인다"
//   - 13차 §6 자동 발급·전송 5중 자동화의 첫 단계
// ============================================================

import { useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import {
  recordCreativeEvent,
  recordSource,
  computeSha256Hex,
  type CreativeOriginType,
  type CreativeDecisionContext,
  type CreativeDecisionDelta,
  type CreativeStage,
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
    /** [s82-stage-coverage] 창작 단계 태그 (additive·optional — 구 caller 무회귀) */
    stage?: CreativeStage;
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
    /** [s82-stage-coverage] 창작 단계 태그 (additive·optional) */
    stage?: CreativeStage;
  }) => Promise<string | null>;

  /** AI 제안 작가 채택 (AI_SUGGESTION + accept event) */
  logAcceptAI: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    episodeId?: number;
    beforeContent?: string;
    afterContent: string;
    provider?: string;
    model?: string;
    decisionContext?: CreativeEventLogger.DecisionInput;
    /** [s82-stage-coverage] 창작 단계 태그 (additive·optional) */
    stage?: CreativeStage;
  }) => Promise<string | null>;

  /** 노아 제안 미채택 (AI_SUGGESTION + reject event) */
  logRejectAI: (params: {
    targetType: CreativeEventLogger.TargetType;
    targetId: string;
    episodeId?: number;
    provider?: string;
    model?: string;
    decisionContext?: CreativeEventLogger.DecisionInput;
    /** [s82-stage-coverage] 창작 단계 태그 (additive·optional) */
    stage?: CreativeStage;
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

  export interface DecisionAlternativeInput {
    id?: string;
    label?: string;
    content?: string;
    contentHash?: string;
    preview?: string;
    charCount?: number;
    score?: number;
    sourceId?: string;
  }

  export interface DecisionInput {
    selectedAlternativeId?: string;
    selectedLabel?: string;
    selectedContent?: string;
    reason?: string;
    alternatives?: DecisionAlternativeInput[];
    discardedAlternativeIds?: string[];
    revisionNote?: string;
    delta?: CreativeDecisionDelta;
  }
}

const DECISION_PREVIEW_LIMIT = 120;

function clipDecisionText(text: string | undefined): string | undefined {
  const trimmed = text?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.length > DECISION_PREVIEW_LIMIT
    ? `${trimmed.slice(0, DECISION_PREVIEW_LIMIT).trimEnd()}...`
    : trimmed;
}

function computeDecisionDelta(beforeContent: string | undefined, afterContent: string | undefined): CreativeDecisionDelta | undefined {
  if (beforeContent === undefined || afterContent === undefined) return undefined;
  const beforeChars = beforeContent.length;
  const afterChars = afterContent.length;
  const diff = afterChars - beforeChars;
  return {
    beforeChars,
    afterChars,
    insertedChars: diff > 0 ? diff : 0,
    removedChars: diff < 0 ? Math.abs(diff) : 0,
    editedChars: Math.abs(diff),
  };
}

async function normalizeDecisionAlternative(
  input: CreativeEventLogger.DecisionAlternativeInput,
  fallbackId: string,
): Promise<NonNullable<CreativeDecisionContext['alternatives']>[number]> {
  const content = input.content;
  const contentHash = input.contentHash ?? (content ? await computeSha256Hex(content) : undefined);
  return {
    id: input.id ?? fallbackId,
    ...(input.label ? { label: input.label } : {}),
    ...(contentHash ? { contentHash } : {}),
    ...(clipDecisionText(input.preview ?? content) ? { preview: clipDecisionText(input.preview ?? content) } : {}),
    ...(typeof input.charCount === 'number' ? { charCount: input.charCount } : content ? { charCount: content.length } : {}),
    ...(typeof input.score === 'number' ? { score: input.score } : {}),
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
  };
}

async function buildDecisionContext(
  action: CreativeDecisionContext['action'],
  input: CreativeEventLogger.DecisionInput | undefined,
  fallback: {
    targetId: string;
    beforeContent?: string;
    afterContent?: string;
    defaultReason: string;
  },
): Promise<CreativeDecisionContext> {
  const selectedAlternativeId = input?.selectedAlternativeId ?? `${fallback.targetId}:selected`;
  const alternativesInput = input?.alternatives ?? (
    input?.selectedContent
      ? [{ id: selectedAlternativeId, label: input.selectedLabel, content: input.selectedContent }]
      : []
  );
  const alternatives = await Promise.all(
    alternativesInput.map((alternative, index) => normalizeDecisionAlternative(alternative, `${fallback.targetId}:option-${index + 1}`)),
  );
  const delta = input?.delta ?? computeDecisionDelta(fallback.beforeContent, fallback.afterContent);
  return {
    action,
    selectedAlternativeId,
    reason: input?.reason?.trim() || fallback.defaultReason,
    ...(alternatives.length > 0 ? { alternatives } : {}),
    ...(input?.discardedAlternativeIds?.length ? { discardedAlternativeIds: input.discardedAlternativeIds } : {}),
    ...(input?.revisionNote?.trim() ? { revisionNote: input.revisionNote.trim() } : {}),
    ...(delta ? { delta } : {}),
  };
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
  automaticEnabled = true,
): CreativeEventLogger {
  // [C] projectId null 시 no-op 반환
  const noOp = useCallback(async () => null, []);

  const logHumanEdit = useCallback<CreativeEventLogger['logHumanEdit']>(
    async ({ targetType, targetId, episodeId, beforeContent, afterContent, note, stage }) => {
      if (!projectId || !automaticEnabled) return null;
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
          stage,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logHumanEdit failed', err);
        return null;
      }
    },
    [projectId, automaticEnabled],
  );

  const logAIDraft = useCallback<CreativeEventLogger['logAIDraft']>(
    async ({ targetType, targetId, episodeId, afterContent, provider, model, promptLabel, stage }) => {
      if (!projectId || !automaticEnabled) return null;
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
          stage,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logAIDraft failed', err);
        return null;
      }
    },
    [projectId, automaticEnabled],
  );

  const logAcceptAI = useCallback<CreativeEventLogger['logAcceptAI']>(
    async ({ targetType, targetId, episodeId, beforeContent, afterContent, provider, model, decisionContext: decisionInput, stage }) => {
      if (!projectId || !automaticEnabled) return null;
      try {
        const beforeHash = beforeContent ? await computeSha256Hex(beforeContent) : null;
        const afterHash = await computeSha256Hex(afterContent);
        const decisionContext = await buildDecisionContext('accepted', decisionInput, {
          targetId,
          beforeContent,
          afterContent,
          defaultReason: '작가가 노아 제안을 검토한 뒤 채택함',
        });
        const id = await recordCreativeEvent({
          projectId,
          episodeId,
          targetType,
          targetId,
          eventType: 'accept',
          actorType: 'human',
          actorId: 'author',
          originType: 'AI_SUGGESTION',
          beforeHash,
          afterHash,
          note: `Accepted Noa suggestion (${provider || 'unknown'}/${model || 'unknown'})`,
          decisionContext,
          stage,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logAcceptAI failed', err);
        return null;
      }
    },
    [projectId, automaticEnabled],
  );

  const logRejectAI = useCallback<CreativeEventLogger['logRejectAI']>(
    async ({ targetType, targetId, episodeId, provider, model, decisionContext: decisionInput, stage }) => {
      if (!projectId || !automaticEnabled) return null;
      try {
        const decisionContext = await buildDecisionContext('rejected', decisionInput, {
          targetId,
          defaultReason: '작가가 노아 제안을 검토한 뒤 미채택함',
        });
        const id = await recordCreativeEvent({
          projectId,
          episodeId,
          targetType,
          targetId,
          eventType: 'reject',
          actorType: 'human',
          actorId: 'author',
          originType: 'AI_SUGGESTION',
          beforeHash: null,
          afterHash: null,
          note: `Rejected Noa suggestion (${provider || 'unknown'}/${model || 'unknown'})`,
          decisionContext,
          stage,
        });
        return id;
      } catch (err) {
        logger.warn('useCreativeEventLogger', 'logRejectAI failed', err);
        return null;
      }
    },
    [projectId, automaticEnabled],
  );

  const logExternalImport = useCallback<CreativeEventLogger['logExternalImport']>(
    async ({ targetType, targetId, label, content, fileName, url, licenseNote }) => {
      if (!projectId || !automaticEnabled) return null;
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
    [projectId, automaticEnabled],
  );

  const logTemplateSeed = useCallback<CreativeEventLogger['logTemplateSeed']>(
    async ({ targetType, targetId, afterContent, templateName }) => {
      if (!projectId || !automaticEnabled) return null;
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
    [projectId, automaticEnabled],
  );

  // [R-01 fix — 2026-05-12] 이전엔 매 render 새 inline object 반환 → caller 가 deps 에 두면
  // 매번 ref churn 으로 effect 재실행 무한루프. useMemo 로 안정화.
  // projectId null 시 noOp 객체, 있으면 5 callback 객체. callbacks 자체는 useCallback([projectId])
  // 라 stable 이므로 dep churn 없음.
  return useMemo<CreativeEventLogger>(() => {
    if (!projectId || !automaticEnabled) {
      return {
        logHumanEdit: noOp,
        logAIDraft: noOp,
        logAcceptAI: noOp,
        logRejectAI: noOp,
        logExternalImport: noOp,
        logTemplateSeed: noOp,
      };
    }
    return {
      logHumanEdit,
      logAIDraft,
      logAcceptAI,
      logRejectAI,
      logExternalImport,
      logTemplateSeed,
    };
  }, [projectId, automaticEnabled, noOp, logHumanEdit, logAIDraft, logAcceptAI, logRejectAI, logExternalImport, logTemplateSeed]);
}
