// ============================================================
// Multi-Language Batch — 다국어 동시 번역
// ============================================================
// EN+JA+ZH 동시 배치. 각 언어별 진행 상태 추적.

export type TargetLanguage = 'EN' | 'JA' | 'ZH';

export interface MultiLangBatchConfig {
  targets: TargetLanguage[];
  /** 병렬 실행 여부 (true: 3개 언어 동시, false: 순차) */
  parallel: boolean;
}

export interface MultiLangProgress {
  language: TargetLanguage;
  status: 'pending' | 'translating' | 'done' | 'error';
  progress: number; // 0-100
  episodesDone: number;
  episodesTotal: number;
  error?: string;
}

export interface MultiLangResult {
  language: TargetLanguage;
  success: boolean;
  episodesTranslated: number;
  avgScore: number;
}

/** 다국어 배치 진행 상태 초기화 */
export function initMultiLangProgress(targets: TargetLanguage[], totalEpisodes: number): MultiLangProgress[] {
  return targets.map(lang => ({
    language: lang,
    status: 'pending',
    progress: 0,
    episodesDone: 0,
    episodesTotal: totalEpisodes,
  }));
}

/** 특정 언어의 진행 상태 업데이트 */
export function updateLangProgress(
  progresses: MultiLangProgress[],
  lang: TargetLanguage,
  update: Partial<MultiLangProgress>,
): MultiLangProgress[] {
  return progresses.map(p =>
    p.language === lang ? { ...p, ...update } : p,
  );
}

/** 전체 진행률 계산 */
export function overallProgress(progresses: MultiLangProgress[]): number {
  if (progresses.length === 0) return 0;
  return Math.round(progresses.reduce((a, p) => a + p.progress, 0) / progresses.length);
}

/** 모든 언어 완료 여부 */
export function allDone(progresses: MultiLangProgress[]): boolean {
  return progresses.every(p => p.status === 'done' || p.status === 'error');
}

/** 출판용 언어별 파일명 생성 */
export function getOutputFileName(baseName: string, lang: TargetLanguage, episode: number): string {
  return `${baseName}_EP${String(episode).padStart(3, '0')}_${lang}`;
}
