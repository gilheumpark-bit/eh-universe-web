// ============================================================
// PART 1 — IME Composition Guard (Global, module-level)
// ============================================================
//
// 한글·일본어·중국어 IME 조합 중(compositionstart~end) 자동저장·
// 자동제안·자동분석 훅이 끼어들면 불완전 자소가 처리되어 글자 깨짐.
// 모듈 레벨에서 window composition 이벤트를 한 번만 구독하고,
// plain 함수로 조회할 수 있게 해 setTimeout/async 콜백에서도 사용 가능.
//
// 설계 근거 (R11 — IME 침묵 규칙):
//  - 조합 중 Tab 키는 "제안 수락"이 아니라 "조합 확정"이어야 작가 기대와 맞음.
//  - 자동 완성 요청을 조합 중에 보내면 서버에 자소 단편만 전달되어 의미 깨짐.
//  - 모듈 레벨인 이유: React hook이면 컴포넌트 내부에서만 쓸 수 있으나,
//    useInlineCompletion 의 debounce setTimeout 콜백 타이밍에도 체크 필요.
// ============================================================

let _isComposing = false;
let _listenersBound = false;

function bindListenersOnce(): void {
  if (_listenersBound) return;
  if (typeof window === 'undefined') return; // [C] SSR 가드
  window.addEventListener('compositionstart', () => { _isComposing = true; }, true);
  window.addEventListener('compositionend', () => { _isComposing = false; }, true);
  _listenersBound = true;
}

/**
 * 현재 IME 조합 중 여부.
 * - 첫 호출 시 window 리스너 1회 바인딩 (idempotent).
 * - 훅이 아니라 plain 함수 — async/setTimeout 콜백에서도 사용 가능.
 * - SSR (window 없음) 환경에선 항상 false.
 */
export function isIMEComposing(): boolean {
  bindListenersOnce();
  return _isComposing;
}

/** 테스트 전용 — 모듈 상태 리셋 (jest beforeEach 에서 사용). */
export function __resetIMEGuardForTest(): void {
  _isComposing = false;
  _listenersBound = false;
}

// IDENTITY_SEAL: ime-guard | role=IME composition 중 자동훅 침묵 | inputs=window events | outputs=boolean
