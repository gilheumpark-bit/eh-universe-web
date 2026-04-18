/** 초기 화면 4탭 — 소설 스튜디오 원고 번역과 분리된 전문 번역 워크스페이스 구역 */
export const WORKSPACE_TAB_STORAGE_KEY = 'eh_translator_workspace_tab';
export type WorkspaceTab = 'translate' | 'chapters' | 'context' | 'network';
export const WORKSPACE_TABS: { id: WorkspaceTab; ko: string; en: string }[] = [
  { id: 'translate', ko: '번역', en: 'Translate' },
  { id: 'chapters', ko: '챕터', en: 'Chapters' },
  { id: 'context', ko: '맥락', en: 'Context' },
  { id: 'network', ko: '네트워크', en: 'Network' },
];

export const PROJECT_LIBRARY_KEY = 'eh_translator_project_library';
export const MAX_LOCAL_PROJECTS = 18;
export const REFERENCE_PROJECT_LIMIT = 4;
export const REFERENCE_CHAPTER_LIMIT = 3;
export const REFERENCE_TEXT_LIMIT = 12000;
export const STORY_BIBLE_LIMIT = 12000;

export const LANGUAGES = [
  { code: 'ja', label: '日本語 (JAPANESE)' },
  { code: 'ko', label: '한국어 (KOREAN)' },
  { code: 'en', label: 'ENGLISH' },
  { code: 'zh', label: 'CHINESE' },
] as const;

export const PROVIDERS = [
  { id: 'openai', label: 'GPT-5.4 (OAI)', role: 'Ensemble Base' },
  { id: 'claude', label: 'Claude Sonnet 4.6 (ANT)', role: 'Creative Refinement' },
  { id: 'gemini', label: 'Gemini 2.5-Pro (GOOG)', role: 'Context Analyst' },
  { id: 'deepseek', label: 'DEEPSEEK (DS)', role: 'Fast Draft' },
] as const;

/** 번역 워크스페이스 배경 — 스튜디오 색상 테마(기본/밝은/베이지)와 동일 3종 */
export type TranslatorBackgroundMode = 'default' | 'bright' | 'beige';

export const BACKGROUND_MODES = [
  { id: 'default' as const, label: 'DEFAULT', note: '딥 포커스 — 집중형 컨텍스트' },
  { id: 'bright' as const, label: 'BRIGHT', note: '화이트 글래스 — 문서 작업 최적화' },
  { id: 'beige' as const, label: 'BEIGE', note: '웜 페이퍼 — 장시간 독서 톤' },
] as const;

/** 레거시 nebula/glacial 및 알 수 없는 값 → 3종으로 정규화 */
export function normalizeTranslatorBackgroundMode(raw: unknown): TranslatorBackgroundMode {
  if (raw === 'default' || raw === 'bright' || raw === 'beige') return raw;
  if (raw === 'nebula') return 'default';
  if (raw === 'glacial') return 'bright';
  return 'default';
}

/** Rough token estimate for UI (chars / 4) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
