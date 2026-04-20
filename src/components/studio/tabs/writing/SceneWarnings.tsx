"use client";

// ============================================================
// PART 1 — SceneWarnings: 씬시트 인라인 경고 배너 + 이벤트 수신기
// ============================================================
//
// 역할:
//   - SceneTimeline / SceneSheet가 window.dispatchEvent(
//     new CustomEvent('noa:scene-warnings', { detail: warnings })) 를
//     발송하면 에디터 상단에 즉시 배너 렌더.
//   - 우측 패널 닫힘 상태에서도 경고를 놓치지 않는 안전망.
//   - 최상위 ≤2건 표시, 나머지는 "... 외 N건" 요약.
//
// [C] detail 항목 타입 방어: severity 화이트리스트·message 문자열 가드.
// [K] 하위 SceneWarning 타입/훅/뷰를 단일 파일로 묶어 import 1회로 끝냄.
// ============================================================

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 2 — 타입
// ============================================================

export interface SceneWarning {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  sceneId?: string;
}

// ============================================================
// PART 3 — 이벤트 훅 (외부 사용 가능)
// ============================================================

export function useSceneWarnings(): SceneWarning[] {
  const [sceneWarnings, setSceneWarnings] = useState<SceneWarning[]>([]);

  useEffect(() => {
    const onWarnings = (e: Event) => {
      const custom = e as CustomEvent<unknown>;
      const detail = custom.detail;
      if (!Array.isArray(detail)) {
        setSceneWarnings([]);
        return;
      }
      // [C] detail 항목 타입 방어: message 필드 없거나 비문자열이면 스킵.
      const safe: SceneWarning[] = detail
        .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
        .map((w): SceneWarning => {
          const sev: SceneWarning['severity'] =
            w.severity === 'critical' ? 'critical' :
            w.severity === 'info' ? 'info' : 'warning';
          return {
            severity: sev,
            message: typeof w.message === 'string' ? w.message : '',
            sceneId: typeof w.sceneId === 'string' ? w.sceneId : undefined,
          };
        })
        .filter(w => w.message.length > 0);
      setSceneWarnings(safe);
    };
    window.addEventListener('noa:scene-warnings', onWarnings as EventListener);
    return () => window.removeEventListener('noa:scene-warnings', onWarnings as EventListener);
  }, []);

  return sceneWarnings;
}

// ============================================================
// PART 4 — 배너 뷰
// ============================================================

export interface SceneWarningsBannerProps {
  language: AppLanguage;
  warnings: SceneWarning[];
}

export function SceneWarningsBanner({ language, warnings }: SceneWarningsBannerProps): React.ReactElement | null {
  if (warnings.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 px-3 py-2 bg-amber-500/10 border-l-4 border-amber-500 rounded-r"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium text-text-primary">
          {L4(language, {
            ko: `씬시트 경고 ${warnings.length}건`,
            en: `${warnings.length} Scene Warning${warnings.length === 1 ? '' : 's'}`,
            ja: `シーン警告 ${warnings.length}件`,
            zh: `场景警告 ${warnings.length} 条`,
          })}
        </span>
      </div>
      <ul className="mt-1 text-xs text-text-secondary space-y-0.5">
        {warnings.slice(0, 2).map((w, i) => (
          <li key={`${w.sceneId ?? 'global'}-${i}`} className="truncate">• {w.message}</li>
        ))}
        {warnings.length > 2 && (
          <li className="text-text-tertiary italic">
            {L4(language, {
              ko: `... 외 ${warnings.length - 2}건`,
              en: `... and ${warnings.length - 2} more`,
              ja: `... 他 ${warnings.length - 2}件`,
              zh: `... 其余 ${warnings.length - 2} 条`,
            })}
          </li>
        )}
      </ul>
    </div>
  );
}

export default SceneWarningsBanner;
