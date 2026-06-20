// ============================================================
// ime-guard — R11 IME 침묵 규칙 가드
// ============================================================

import { isIMEComposing, __resetIMEGuardForTest } from '../ime-guard';

describe('ime-guard — R11 IME 침묵', () => {
  beforeEach(() => {
    __resetIMEGuardForTest();
  });

  test('초기 상태는 false', () => {
    expect(isIMEComposing()).toBe(false);
  });

  test('compositionstart 이벤트 후 true', () => {
    // 첫 호출로 리스너 바인딩
    isIMEComposing();
    window.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(isIMEComposing()).toBe(true);
  });

  test('compositionend 이벤트 후 false 복귀', () => {
    isIMEComposing();
    window.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(isIMEComposing()).toBe(true);
    window.dispatchEvent(new CompositionEvent('compositionend'));
    expect(isIMEComposing()).toBe(false);
  });

  test('리스너 바인딩은 idempotent — 여러 번 호출해도 1회만', () => {
    // 호출 여러 번
    isIMEComposing();
    isIMEComposing();
    isIMEComposing();
    // 정상 동작 확인
    window.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(isIMEComposing()).toBe(true);
    window.dispatchEvent(new CompositionEvent('compositionend'));
    expect(isIMEComposing()).toBe(false);
  });

  test('중첩 composition — 마지막 end 가 상태 결정', () => {
    isIMEComposing();
    // 브라우저는 compositionstart 를 중첩 발행하지 않지만 방어적으로 테스트
    window.dispatchEvent(new CompositionEvent('compositionstart'));
    window.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(isIMEComposing()).toBe(true);
    window.dispatchEvent(new CompositionEvent('compositionend'));
    expect(isIMEComposing()).toBe(false);
  });
});
