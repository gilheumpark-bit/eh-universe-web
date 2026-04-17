// ============================================================
// Platform Adapter Types — 플랫폼별 내보내기 규격 정의
// ============================================================

export type PlatformId = 'novelpia' | 'munpia' | 'kakaopage' | 'joara';

export interface EpisodeInput {
  episode: number;
  title?: string;
  content: string;
}

export interface PlatformExportOptions {
  /** 회차 제목을 본문 첫 줄에 포함할지 */
  includeTitle?: boolean;
  /** 회차 번호 prefix 추가 (e.g. "1화. ") */
  includeChapterNumber?: boolean;
}

export interface PlatformMeta {
  title?: string;
  tags?: string[];
  description?: string;
  author?: string;
}

export interface ValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  /** 필드별 상세 (UI에서 배지 표시용) */
  detail: {
    title?: { length: number; limit: number; ok: boolean };
    tags?: { count: number; limit: number; ok: boolean };
    description?: { length: number; limit?: number; ok: boolean };
  };
}

export interface PlatformConstraints {
  titleMaxLength: number;
  tagMaxCount: number;
  tagMaxLength?: number;
  descriptionMaxLength?: number;
  /** HTML 태그 허용 여부 (false면 toText에서 제거) */
  allowHtml: boolean;
  /** 본문 내 연속 빈 줄 최대 개수 */
  maxConsecutiveBlanks: number;
  /** 플랫폼 공식 가이드 URL (도움말용) */
  guideUrl?: string;
}

export interface PlatformAdapter {
  id: PlatformId;
  name: string;
  description: string;
  constraints: PlatformConstraints;
  /** 단일 회차 → 플랫폼 규격 TXT */
  toText(episode: EpisodeInput, opts?: PlatformExportOptions): string;
  /** 메타데이터 검증 */
  validateMeta(meta: PlatformMeta): ValidationResult;
  /** 원문을 회차 단위로 분할 (공백 2줄 이상 기준, 기본) */
  splitChapters(source: string): EpisodeInput[];
}
