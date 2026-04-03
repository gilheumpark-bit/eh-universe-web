// ============================================================
// Embed Widgets — 외부 사이트에 삽입 가능한 위젯
// ============================================================
// 세계관 문서, 코드 플레이그라운드, 번역 비교 등을
// iframe으로 외부 사이트에 삽입. 웹에서만 가능.

export type EmbedType = 'world-doc' | 'code-playground' | 'translation-compare' | 'character-card';

export interface EmbedConfig {
  type: EmbedType;
  /** 대상 ID (문서 슬러그, 코드 ID 등) */
  id: string;
  /** 테마 */
  theme?: 'light' | 'dark';
  /** 크기 */
  width?: string;
  height?: string;
}

const EMBED_BASE = '/embed';

/** 임베드 URL 생성 */
export function getEmbedUrl(config: EmbedConfig): string {
  const params = new URLSearchParams();
  if (config.theme) params.set('theme', config.theme);
  const query = params.toString();
  return `${window.location.origin}${EMBED_BASE}/${config.type}/${config.id}${query ? `?${query}` : ''}`;
}

/** 임베드 HTML 코드 생성 (복사용) */
export function getEmbedHtml(config: EmbedConfig): string {
  const url = getEmbedUrl(config);
  const width = config.width || '100%';
  const height = config.height || '400px';
  return `<iframe src="${url}" width="${width}" height="${height}" style="border:1px solid #e0e0e0;border-radius:12px;" frameborder="0" allow="clipboard-write" loading="lazy"></iframe>`;
}

/** 임베드 마크다운 코드 생성 */
export function getEmbedMarkdown(config: EmbedConfig): string {
  const url = getEmbedUrl(config);
  return `[![${config.type}](${url})](${window.location.origin})`;
}

/** oEmbed JSON 응답 (외부 서비스 연동용) */
export function getOEmbedJson(config: EmbedConfig, title: string): object {
  const url = getEmbedUrl(config);
  return {
    version: '1.0',
    type: 'rich',
    provider_name: 'EH Universe',
    provider_url: window.location.origin,
    title,
    html: getEmbedHtml(config),
    width: parseInt(config.width || '600'),
    height: parseInt(config.height || '400'),
    thumbnail_url: `${window.location.origin}/images/hero-mina.jpg`,
  };
}

/** 임베드 HTML을 클립보드에 복사 */
export async function copyEmbedCode(config: EmbedConfig): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getEmbedHtml(config));
    return true;
  } catch {
    return false;
  }
}
