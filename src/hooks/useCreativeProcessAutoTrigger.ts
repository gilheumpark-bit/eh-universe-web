"use client";

// ============================================================
// useCreativeProcessAutoTrigger — Scene/Character/World 편집 자동 누적
// ============================================================
//
// useAutoVersionSnapshot 은 manuscripts/messages charDelta 추적 (300자 + 1분).
// 본 hook 은 그 외 영역 (characters / world / scenes / glossary) 의
// 의미 있는 변경 감지 → 별도 CreativeEvent 자동 누적.
//
// 격리:
//   - useOriginTracker (절대 금지 §1.3) 직접 X
//   - 새 hook + StudioShell mount 1줄
//   - dynamic import 로 creative-process 의존성 분리
//
// 사상 정합:
//   - 5차 §2 "사용자는 편의를 산다, 장부는 뒤에서 자동 쌓임"
//   - 13차 §6 5중 자동화 — 발급 자동의 누적 자료
// ============================================================

import { useEffect, useRef } from 'react';
import type { Project } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — 상수
// ============================================================

const COOLDOWN_MS = 60_000; // 1분 cooldown

interface SignatureSnapshot {
  charactersHash: string;
  worldHash: string;
  scenesHash: string;
}

// ============================================================
// PART 2 — Signature 계산
// ============================================================

/**
 * characters / world / scenes 영역의 signature 계산.
 * deep diff 가 아니라 JSON.stringify hash — 가벼움.
 */
function computeSignatures(projects: Project[]): SignatureSnapshot {
  let chars = '';
  let world = '';
  let scenes = '';
  for (const p of projects) {
    for (const s of p.sessions ?? []) {
      const c = s.config;
      if (!c) continue;
      try {
        // [C] dynamic field access — StoryConfig 일부 필드는 도메인별 다름 (any cast)
        const cfgAny = c as unknown as Record<string, unknown>;
        chars += JSON.stringify(c.characters ?? '') + '|';
        world += JSON.stringify({
          worldSimData: c.worldSimData ?? null,
          rulebook: cfgAny['rulebook'] ?? null,
          corePremise: c.corePremise ?? '',
        }) + '|';
        scenes += JSON.stringify(cfgAny['episodeSceneSheets'] ?? cfgAny['sceneDirection'] ?? '') + '|';
      } catch { /* JSON cycle guard */ }
    }
  }
  // [G] djb2 hash — Web Crypto 회피 (sync, 가벼움)
  return {
    charactersHash: djb2(chars),
    worldHash: djb2(world),
    scenesHash: djb2(scenes),
  };
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

// ============================================================
// PART 3 — Hook
// ============================================================

export interface UseCreativeProcessAutoTriggerOptions {
  /** 모든 프로젝트 (변경 감지 대상) */
  projects: Project[];
  /** 현재 활성 프로젝트 ID (trigger 대상 — null 시 no-op) */
  currentProjectId: string | null;
  /** 비활성화 토글 (테스트 등) */
  enabled?: boolean;
}

/**
 * Scene/Character/World 편집 자동 trigger.
 *
 * 작동:
 *   1. mount 시 base signature 기록
 *   2. projects 변경 시 signature 재계산
 *   3. 영역별 차이 발견 + cooldown 만료 시 → recordCreativeEvent
 *   4. cooldown 갱신
 */
export function useCreativeProcessAutoTrigger(
  opts: UseCreativeProcessAutoTriggerOptions,
): void {
  const enabled = opts.enabled ?? true;
  const lastSigRef = useRef<SignatureSnapshot | null>(null);
  const lastFireRef = useRef<Record<keyof SignatureSnapshot, number>>({
    charactersHash: 0,
    worldHash: 0,
    scenesHash: 0,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!opts.currentProjectId) return;

    const newSig = computeSignatures(opts.projects);

    // [C] 첫 mount: base 만 기록, fire X
    if (!lastSigRef.current) {
      lastSigRef.current = newSig;
      return;
    }

    const now = Date.now();
    const changes: Array<{ field: keyof SignatureSnapshot; targetType: 'character' | 'world' | 'scene' }> = [
      { field: 'charactersHash', targetType: 'character' },
      { field: 'worldHash', targetType: 'world' },
      { field: 'scenesHash', targetType: 'scene' },
    ];

    for (const { field, targetType } of changes) {
      if (newSig[field] !== lastSigRef.current[field]) {
        const elapsed = now - lastFireRef.current[field];
        if (elapsed >= COOLDOWN_MS) {
          // fire-and-forget — 본 흐름 차단 X
          (async () => {
            try {
              const cp = await import('@/lib/creative-process');
              await cp.recordCreativeEvent({
                projectId: opts.currentProjectId!,
                targetType,
                targetId: `auto-${targetType}-${now}`,
                eventType: 'edit',
                actorType: 'human',
                actorId: 'author',
                originType: 'HUMAN_REVISION',
                beforeHash: null,
                afterHash: null,
                note: `auto-detect ${targetType} signature change`,
              });
            } catch (err) {
              logger.warn('useCreativeProcessAutoTrigger', `${targetType} log failed`, err);
            }
          })();
          lastFireRef.current[field] = now;
        }
      }
    }

    lastSigRef.current = newSig;
  }, [enabled, opts.currentProjectId, opts.projects]);
}

// IDENTITY_SEAL: useCreativeProcessAutoTrigger | role=non-manuscript-edit-detect | inputs=projects+currentProjectId | outputs=creative-event-fire-and-forget
