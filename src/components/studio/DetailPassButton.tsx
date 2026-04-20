"use client";

// ============================================================
// DetailPassButton — Task 4 Phase 3 — Draft → Detail 확장 트리거
// ============================================================
//
// Standalone 버튼 — 작가가 "AI 살 붙이기"를 명시적으로 요청할 때만 호출.
// FEATURE_DRAFT_DETAIL_V2 플래그가 'shadow' 또는 'on' 일 때만 렌더.
// default 'off' 이므로 현 배포에서는 완전 비가시.
//
// 호출 흐름:
//   1) Draft pass (기존 경로) 로 4,000자 초안이 이미 에디터에 있음.
//   2) 작가가 이 버튼 클릭 → runDetailPass() 호출.
//   3) 성공 시 onExpanded(result.expandedText) 전달 — 부모가 프리뷰 모달 등 판단.
//   4) 본 버튼은 에디터 본문을 직접 변경하지 않음 (상위 결정).
//
// [C] 상위가 draftText 를 미전달해도 버튼은 렌더되지만 클릭 disabled 처리.
// [C] AbortController 는 컴포넌트 내부에서 관리 — unmount 시 자동 abort.
// [G] useCallback 으로 핸들러 재생성 방지 (자식에 넘길 때 유용).
// [K] 상태는 4가지: idle / running / done / error.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { runDetailPass, type DetailPassResult } from '@/engine/detail-pass';
import { isDraftDetailActive } from '@/lib/feature-flags';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Props & status type
// ============================================================

export interface DetailPassButtonProps {
  /** Draft pass 산출 본문 — 비어있으면 버튼 disabled */
  draftText: string;
  /** 현재 프로젝트 컨텍스트 */
  config?: StoryConfig;
  /** 언어 — 버튼 라벨 + 프롬프트 언어 결정 */
  language: AppLanguage;
  /** 외부 disabled 제어 (e.g. 저장 중) */
  disabled?: boolean;
  /** 성공 시 확장 본문 전달 — 부모가 프리뷰/적용 결정 */
  onExpanded: (expandedText: string, meta: DetailPassResult) => void;
  /** 에러 발생 시 메시지 전달 (선택) */
  onError?: (message: string) => void;
  /** DGX userId (선택) */
  userId?: string;
  /** BYOK 키 (선택) */
  apiKey?: string;
}

type Status = 'idle' | 'running' | 'done' | 'error';

// ============================================================
// PART 2 — Labels (4-lang)
// ============================================================

const LABEL_IDLE = {
  ko: 'AI 살 붙이기',
  en: 'AI Detail Pass',
  ja: 'AI 肉付け',
  zh: 'AI 细节扩写',
};

const LABEL_RUNNING = {
  ko: '확장 중…',
  en: 'Expanding…',
  ja: '拡張中…',
  zh: '扩写中…',
};

const LABEL_DONE = {
  ko: '확장 완료',
  en: 'Expanded',
  ja: '拡張完了',
  zh: '扩写完成',
};

const LABEL_ERROR = {
  ko: '실패 — 다시 시도',
  en: 'Failed — retry',
  ja: '失敗 — 再試行',
  zh: '失败 — 重试',
};

const ARIA_BUSY_HINT = {
  ko: 'AI가 초안을 확장 중입니다',
  en: 'AI is expanding the draft',
  ja: 'AIが下書きを拡張中です',
  zh: 'AI正在扩写初稿',
};

// ============================================================
// PART 3 — Component
// ============================================================

const DetailPassButton: React.FC<DetailPassButtonProps> = ({
  draftText,
  config,
  language,
  disabled,
  onExpanded,
  onError,
  userId,
  apiKey,
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // 플래그 확인 — 'shadow' 또는 'on' 에서만 렌더.
  // [C] SSR 에서도 안전: isDraftDetailActive() 내부에 window 가드 존재.
  const [visible, setVisible] = useState<boolean>(() => isDraftDetailActive());

  // 플래그는 Settings 에서 바뀔 수 있으므로 커스텀 이벤트 구독.
  useEffect(() => {
    const handler = () => setVisible(isDraftDetailActive());
    window.addEventListener('noa:feature-flag-changed', handler);
    // localStorage 변경 (다른 탭) 대응
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('noa:feature-flag-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Unmount 시 진행 중인 요청 abort.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (!draftText.trim() || !config) return;
    if (status === 'running') return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('running');
    setErrorMsg('');

    try {
      const result = await runDetailPass({
        draftText,
        config,
        language,
        signal: ctrl.signal,
        userId,
        apiKey,
      });
      setStatus('done');
      onExpanded(result.expandedText, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      logger.warn('DetailPassButton', 'runDetailPass failed', message);
      setErrorMsg(message);
      setStatus('error');
      onError?.(message);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [draftText, config, language, status, onExpanded, onError, userId, apiKey]);

  if (!visible) return null;

  const running = status === 'running';
  const done = status === 'done';
  const errored = status === 'error';
  const noInput = !draftText.trim() || !config;
  const isDisabled = Boolean(disabled) || running || noInput;

  const icon = running ? (
    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
  ) : errored ? (
    <AlertCircle className="w-4 h-4" aria-hidden="true" />
  ) : done ? (
    <Check className="w-4 h-4" aria-hidden="true" />
  ) : (
    <Sparkles className="w-4 h-4" aria-hidden="true" />
  );

  const label = running
    ? L4(language, LABEL_RUNNING)
    : errored
      ? L4(language, LABEL_ERROR)
      : done
        ? L4(language, LABEL_DONE)
        : L4(language, LABEL_IDLE);

  return (
    <button
      type="button"
      role="button"
      aria-label={L4(language, LABEL_IDLE)}
      aria-busy={running}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={handleClick}
      data-testid="detail-pass-button"
      data-status={status}
      title={running ? L4(language, ARIA_BUSY_HINT) : errorMsg || L4(language, LABEL_IDLE)}
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent-blue',
        'border border-border',
        errored
          ? 'bg-accent-red/10 text-accent-red border-accent-red/40'
          : done
            ? 'bg-accent-green/10 text-accent-green border-accent-green/40'
            : running
              ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/40'
              : 'bg-bg-secondary text-text-primary hover:bg-accent-blue/10 hover:text-accent-blue',
        isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default DetailPassButton;

// IDENTITY_SEAL: DetailPassButton | role=Draft→Detail 트리거 | inputs=draftText,config,language | outputs=onExpanded(text,meta)
