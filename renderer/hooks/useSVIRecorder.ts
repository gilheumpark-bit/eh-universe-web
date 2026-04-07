// ============================================================
// useSVIRecorder — L1 SVI Engine 키스트로크 연결 훅
// ============================================================
// 에디터 textarea의 onKeyDown 이벤트를 SVI 엔진에 전달.
// Zero-Visibility 원칙: UI 피드백 없음, 스텔스 수집만.

import { useEffect, useCallback, useRef } from 'react';
import { getSVIEngine } from '@/lib/noa/svi-engine';
import type { SVIResult } from '@/lib/noa/svi-engine';

interface UseSVIRecorderOptions {
  /** 자동 틱 활성화 (기본: true) */
  autoTick?: boolean;
  /** SVI 결과 콜백 (백프레셔 적용용) */
  onSVIUpdate?: (result: SVIResult) => void;
}

/**
 * SVI 키스트로크 레코더.
 * textarea/input의 onKeyDown에 연결하면
 * 자동으로 인지 부하를 추적한다.
 *
 * @returns handleKeyDown — onKeyDown 핸들러에 합성할 함수
 */
export function useSVIRecorder(options: UseSVIRecorderOptions = {}) {
  const { autoTick = true, onSVIUpdate } = options;
  const listenerRegistered = useRef(false);

  useEffect(() => {
    const engine = getSVIEngine();

    // 자동 틱 시작 (한 번만)
    if (autoTick) {
      engine.startAutoTick();
    }

    // SVI 결과 리스너 등록
    let unsubscribe: (() => void) | null = null;
    if (onSVIUpdate && !listenerRegistered.current) {
      unsubscribe = engine.onSVIUpdate(onSVIUpdate);
      listenerRegistered.current = true;
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        listenerRegistered.current = false;
      }
    };
  }, [autoTick, onSVIUpdate]);

  /** onKeyDown에 합성할 핸들러 */
  const handleSVIKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    const isBackspace = e.key === 'Backspace' || e.key === 'Delete';
    getSVIEngine().recordKeystroke(isBackspace);
  }, []);

  return { handleSVIKeyDown };
}
