/** 번역·현지화 작업실 구역 — 공개 표면은 Studio 9단계 흐름과 같은 용어를 쓴다. */
export const WORKSPACE_TAB_STORAGE_KEY = 'eh_translator_workspace_tab';
export type WorkspaceTab = 'translate' | 'chapters' | 'context';
export const WORKSPACE_TABS: { id: WorkspaceTab; ko: string; en: string }[] = [
  { id: 'translate', ko: '번역·현지화', en: 'Translate' },
  { id: 'chapters', ko: '회차', en: 'Chapters' },
  { id: 'context', ko: '참조 컨텍스트', en: 'Context' },
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
  { id: 'openai', label: '정밀 번역 방식', role: '구조·의미 기준' },
  { id: 'claude', label: '문체 다듬기 엔진', role: '문장 리듬 기준' },
  { id: 'gemini', label: '맥락 점검 엔진', role: '설정·용어 기준' },
  { id: 'deepseek', label: '쾌속 초안 엔진', role: '초벌 속도 기준' },
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
