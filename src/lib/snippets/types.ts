// ============================================================
// snippets/types.ts — 자주 쓰는 묘사 패턴 단축키 시스템.
//
// 코드 IDE 의 snippets (예: VS Code "for" → for loop) 대응.
// 소설용 카테고리:
//   - description: 풍경/외형 묘사
//   - dialogue:    대화 클리셰
//   - transition:  씬 전환
//   - action:      액션 시퀀스
//   - emotion:     감정 묘사
//
// 트리거:
//   - 본문에서 prefix 입력 + Tab → expand
//   - 또는 Snippet Palette (Ctrl+Shift+S) 에서 검색
// ============================================================

export type SnippetCategory = 'description' | 'dialogue' | 'transition' | 'action' | 'emotion';

export interface Snippet {
  id: string;
  /** 단축 prefix (예: 'desc-night') */
  prefix: string;
  /** 표시 이름 */
  name: { ko: string; en: string; ja?: string; zh?: string };
  category: SnippetCategory;
  /**
   * 본문 — `${1:placeholder}` 형식 placeholder 지원
   * Tab 으로 placeholder 간 이동 (Phase 2)
   */
  body: string;
  /** 사용자 정의 / 빌트인 */
  scope: 'builtin' | 'user';
}
