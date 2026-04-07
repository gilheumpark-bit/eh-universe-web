// ============================================================
// Web Share API — 모바일/데스크톱 공유
// ============================================================
// 번역 결과, 원고, 검증 리포트를 OS 공유 시트로 전송

/** Web Share 지원 여부 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/** 파일 공유 지원 여부 */
export function canShareFiles(): boolean {
  return canShare() && !!navigator.canShare;
}

/** 텍스트 공유 */
export async function shareText(title: string, text: string, url?: string): Promise<boolean> {
  if (!canShare()) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (err) {
    // AbortError = 사용자가 취소
    if (err instanceof Error && err.name === 'AbortError') return false;
    return false;
  }
}

/** 파일 공유 */
export async function shareFile(fileName: string, content: string, mimeType: string = 'text/plain'): Promise<boolean> {
  if (!canShareFiles()) return false;
  try {
    const file = new File([content], fileName, { type: mimeType });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file] });
    return true;
  } catch {
    return false;
  }
}

// ── 스튜디오별 편의 함수 ──

/** 번역 결과 공유 */
export function shareTranslation(text: string, sourceLang: string, targetLang: string): Promise<boolean> {
  return shareText(
    `Translation (${sourceLang}→${targetLang})`,
    text.slice(0, 4000),
  );
}

/** 검증 리포트 공유 */
export function shareVerifyReport(report: string): Promise<boolean> {
  return shareText('Code Verification Report', report.slice(0, 4000));
}

/** 원고 파일 공유 */
export function shareManuscript(title: string, content: string, format: 'txt' | 'md' = 'txt'): Promise<boolean> {
  return shareFile(
    `${title}.${format}`,
    content,
    format === 'md' ? 'text/markdown' : 'text/plain',
  );
}
