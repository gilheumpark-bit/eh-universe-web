// ============================================================
// PART 1 — Module Header
// ============================================================
//
// novel-ide-settings/store.ts — Novel IDE 마스터 토글 store.
//
// 사상: "우리는 선생이 아니다."
//   - 시스템 본질 (색인·검증 가능 상태) → 기본 ON
//   - 사용자에게 의견·평가·강제하는 것 → 끄기 1 클릭
//   - localStorage 저장 — 작가 선호 영구 보존
//
// 토글 종류:
//   - symbolDecorationVisible       본문 underline 표시 (시각 영향)
//   - symbolHoverEnabled            mouseover quick info
//   - longArcAutoTrigger            10화마다 자동 검증 (background)
//   - readerSimAutoRun              저장 후 자동 시뮬 (Phase 2 — 현재 X)
//   - antiSycophancyAlerts          severity 3 알림 (차단 X)
//   - formatOnSaveAutoApply         저장 시 자동 정렬 (작가 의도 영역)
//   - bpGutterVisible               BP 거터 표시 (BP 사용 시만 의미)
// ============================================================

const STORAGE_KEY = 'loreguard_novel_ide_settings_v1';

export interface NovelIDESettings {
  /** 본문 underline 표시 — 본질 ON, 시각 끄기 가능 */
  symbolDecorationVisible: boolean;
  /** Symbol mouseover quick info */
  symbolHoverEnabled: boolean;
  /** Long-Arc 10화마다 자동 검증 — 본질 ON (background, 작가에게 알림 X) */
  longArcAutoTrigger: boolean;
  /** Reader Sim 저장 후 자동 — Phase 2 backlog. 현재 항상 false */
  readerSimAutoRun: boolean;
  /** Anti-sycophancy severity 3 알림 표시 — 정보 only, 차단 X */
  antiSycophancyAlerts: boolean;
  /** Format on Save 자동 적용 — 작가 의도 침해 가능 → 기본 OFF */
  formatOnSaveAutoApply: boolean;
  /** BP 거터 표시 — BP 사용 시만 의미. 본질 ON */
  bpGutterVisible: boolean;
  /** [L1 — 2026-05-08] AI 채팅·생성 시 작품 누적 상태 prompt 자동 주입. 본질 ON */
  storyContextAware: boolean;
  /** [L2 — 2026-05-08] 직전 N turn 작가 의도 누적. 본질 ON */
  intentMemoryAware: boolean;
  /** [L3 — 2026-05-08] AI 작업 결과 자동 검증 (Completion Gap). 본질 ON */
  completionGapDetect: boolean;
  /** [L4 — 2026-05-08] 위계·범위·카테고리 누적 + 충돌 감지. 본질 ON */
  metaContextTrack: boolean;
}

export const DEFAULT_SETTINGS: NovelIDESettings = {
  // [본질 ON — 시스템 기능, 끄기 1 클릭 가능]
  symbolDecorationVisible: true,
  symbolHoverEnabled: true,
  longArcAutoTrigger: true,
  bpGutterVisible: true,
  antiSycophancyAlerts: true,
  // [L1~L4 — 2026-05-08] AI 맥락 이탈 방어 풀스택 — 본질 ON
  storyContextAware: true,
  intentMemoryAware: true,
  completionGapDetect: true,
  metaContextTrack: true,
  // [기본 OFF — 사용자 의도 영역]
  formatOnSaveAutoApply: false,
  // [Phase 2 backlog]
  readerSimAutoRun: false,
};

// ============================================================
// PART 2 — load / save
// ============================================================

export function loadSettings(): NovelIDESettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NovelIDESettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: NovelIDESettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // 변경 알림 — 다른 컴포넌트가 listen
    window.dispatchEvent(new CustomEvent('noa:novel-ide-settings-changed', { detail: settings }));
    return true;
  } catch {
    return false;
  }
}

export function updateSetting<K extends keyof NovelIDESettings>(
  key: K,
  value: NovelIDESettings[K],
): NovelIDESettings {
  const current = loadSettings();
  const next = { ...current, [key]: value };
  saveSettings(next);
  return next;
}
