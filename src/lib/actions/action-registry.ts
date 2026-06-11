// ============================================================
// action-registry — 영역별 + 글로벌 액션 카탈로그 (SharedSurgery-1)
// 단일 진입 (Ctrl+P / Ctrl+K / Cmd+Shift+K) 팔레트에 노출될 액션을 영역별로 격리해 등록.
// useCmdPalette / useGlobalSearchPalette 는 이 registry 를 source 로 사용.
// React/DOM 의존 0 — 순수 타입·헬퍼. UI hook 은 별도 파일.
// ============================================================

import type { AgentLanguage } from '@/lib/ai/writing-agent-registry';

// ============================================================
// PART 1 — Types
// ============================================================

/** 5 영역 + global. global 은 어디서든 노출 (예: Codex Cmd+Shift+K) */
export type ActionArea =
  | 'studio'              // Novel Studio (/studio)
  | 'code-studio'         // Code Studio (/code-studio)
  | 'translation-studio'  // Translation Studio (/translation-studio)
  | 'network'             // Network (/network)
  | 'codex'               // Codex (/codex)
  | 'global';             // 모든 영역에 노출

/** 액션 카테고리 — 팔레트 그룹핑 + 필터 */
export type ActionCategory =
  | 'navigation'   // 탭 전환 / 페이지 이동
  | 'ai'           // AI 생성·리라이트·자동완성
  | 'edit'         // 편집·저장·실행
  | 'view'         // 보기·레이아웃·테마
  | 'data'         // 가져오기·내보내기·동기화
  | 'help'         // 도움말·튜토리얼
  | 'system';      // 설정·디버그

/** i18n 라벨 — 4언어. 미지정 키는 label 폴백. */
export interface ActionI18n {
  ko?: string;
  en?: string;
  ja?: string;
  zh?: string;
}

/** 단일 액션 정의. action 자체는 등록 시점에 주입 (런타임 context 의존). */
export interface ActionDef {
  /** 고유 ID. 영역 prefix 권장 (예: "studio:tab-world", "global:codex-open") */
  id: string;
  /** 폴백 라벨 (영문 권장). i18n 우선. */
  label: string;
  i18n?: ActionI18n;
  area: ActionArea;
  category: ActionCategory;
  /** 단축키 힌트 (표시용 — 실제 바인딩은 KeyboardRegistry에서) */
  shortcut?: string;
  /** 검색 가산점 키워드 (영문·한국어 모두) */
  keywords?: string[];
  /** 위험 액션 표시 (예: delete) — UI에서 빨간색 처리 */
  destructive?: boolean;
  /** false 면 팔레트에서 숨김 (조건부 노출) */
  enabled?: boolean;
}

/** 등록 시점 — action 함수와 결합된 형태 */
export interface RegisteredAction extends ActionDef {
  action: () => void | Promise<void>;
}

// ============================================================
// PART 2 — Catalog (read-only definitions, no actions yet)
// ============================================================

/**
 * 액션 카탈로그 — 각 영역에서 사용 가능한 액션 정의.
 * 실제 action 함수는 런타임에 useStudioActions() 등에서 주입.
 *
 * 신규 액션 추가 시 여기에 정의 → 영역별 hook 에서 action 바인딩.
 */
export const ACTION_CATALOG: Readonly<Record<string, ActionDef>> = Object.freeze({
  // ─── Studio (Novel) ─────────────────────────────────────────
  // [풀점검 priority 16 — 2026-06-08] Ctrl+K Studio Global Search 오버레이 (useStudioKeyboard onGlobalSearch).
  // Ctrl+P = Command Palette (이 파일 위쪽 'studio:cmd-palette'). Ctrl+K = 세션·아카이브 즉시 검색. 분리 유지.
  'studio:global-search':   { id: 'studio:global-search',   label: 'Global search',   i18n: { ko: '전역 검색', ja: 'グローバル検索', zh: '全局搜索' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+K', keywords: ['search', '검색', 'find'] },
  'studio:tab-world':       { id: 'studio:tab-world',       label: 'World tab',       i18n: { ko: '세계관 탭', ja: '世界観タブ', zh: '世界观' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+1' },
  'studio:tab-characters':  { id: 'studio:tab-characters',  label: 'Characters tab',  i18n: { ko: '캐릭터 탭', ja: 'キャラタブ', zh: '角色' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+2' },
  'studio:tab-rulebook':    { id: 'studio:tab-rulebook',    label: 'Rulebook tab',    i18n: { ko: '룰북 탭',  ja: 'ルール', zh: '规则书' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+3' },
  'studio:tab-writing':     { id: 'studio:tab-writing',     label: 'Writing tab',     i18n: { ko: '집필 탭',  ja: '執筆', zh: '写作' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+4' },
  'studio:tab-style':       { id: 'studio:tab-style',       label: 'Style tab',       i18n: { ko: '스타일 탭', ja: 'スタイル', zh: '风格' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+5' },
  'studio:tab-manuscript':  { id: 'studio:tab-manuscript',  label: 'Manuscript tab',  i18n: { ko: '원고 탭', ja: '原稿', zh: '稿件' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+6' },
  'studio:tab-history':     { id: 'studio:tab-history',     label: 'History tab',     i18n: { ko: '히스토리', ja: '履歴', zh: '历史' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+7' },
  'studio:tab-settings':    { id: 'studio:tab-settings',    label: 'Settings tab',    i18n: { ko: '설정 탭', ja: '設定', zh: '设置' }, area: 'studio', category: 'navigation', shortcut: 'Ctrl+8' },
  'studio:ai-generate':     { id: 'studio:ai-generate',     label: 'AI generate',     i18n: { ko: 'AI 생성', ja: 'AI生成', zh: 'AI 生成' }, area: 'studio', category: 'ai', keywords: ['draft', '초고'] },
  'studio:ai-refine':       { id: 'studio:ai-refine',       label: 'AI refine',       i18n: { ko: 'AI 다듬기', ja: 'AI推敲', zh: 'AI 润色' }, area: 'studio', category: 'ai', keywords: ['polish', '퇴고'] },
  // [Batch 3 rank 3 — 2026-06-07] worldgraph 인터랙티브 그래프 에디터 (WorldStudioView 마운트).
  'studio:world-fill':           { id: 'studio:world-fill',           label: 'Fill world fact (AI draft)', i18n: { ko: '세계관 fact 자동 채움', ja: '世界観 fact 自動入力', zh: '自动填充世界观 fact' }, area: 'studio', category: 'ai', keywords: ['worldfact', 'fill', 'graph', '세계관', '그래프'] },
  'studio:world-graph-validate': { id: 'studio:world-graph-validate', label: 'Validate world graph',       i18n: { ko: '세계관 그래프 검증', ja: '世界観グラフ検証', zh: '验证世界观图' }, area: 'studio', category: 'edit', keywords: ['validate', 'consistency', '검증', '정합'] },
  // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바 토글.
  'studio:toolbox-open':         { id: 'studio:toolbox-open',         label: 'Open Writer Toolbox (18 modules)', i18n: { ko: '작가 도구함 (18 모듈) 열기', ja: 'ライタールボックス', zh: '打开作家工具箱' }, area: 'studio', category: 'view', keywords: ['toolbox', 'sidebar', 'creative', '도구함', '사이드바', '품질', 'qa', 'foreshadow', 'persona'] },

  // ─── Code Studio ────────────────────────────────────────────
  // [Batch 1 rank 8 — 2026-06-07] Ctrl+K Quick Access 8버튼 그리드 (자주 쓰는 액션 2스텝 진입).
  // 기존 5 + 신규 3 (quick-open / toggle-terminal / new-file) = 8 액션.
  'code:run-pipeline':      { id: 'code:run-pipeline',      label: 'Run pipeline',    i18n: { ko: '파이프라인 실행', ja: 'パイプライン実行', zh: '运行流水线' }, area: 'code-studio', category: 'edit', shortcut: 'Ctrl+Enter' },
  'code:run-audit':         { id: 'code:run-audit',         label: 'Run audit',       i18n: { ko: '감사 실행', ja: '監査実行', zh: '审计运行' }, area: 'code-studio', category: 'edit' },
  'code:run-stress':        { id: 'code:run-stress',        label: 'Run stress test', i18n: { ko: '스트레스 실행', ja: 'ストレス実行', zh: '压力测试' }, area: 'code-studio', category: 'edit' },
  // [풀점검 priority 14 — 2026-06-08] shortcut hint 추가. 실제 등록은 CodeStudioShell 의 useKeyBinding 에서.
  'code:toggle-chat':       { id: 'code:toggle-chat',       label: 'Toggle chat',     i18n: { ko: '채팅 토글', ja: 'チャット切替', zh: '聊天切换' }, area: 'code-studio', category: 'view', shortcut: 'Ctrl+J' },
  'code:toggle-verify':     { id: 'code:toggle-verify',     label: 'Toggle verify panel', i18n: { ko: '검증 패널', ja: '検証パネル', zh: '验证面板' }, area: 'code-studio', category: 'view', shortcut: 'Ctrl+L' },
  'code:quick-open':        { id: 'code:quick-open',        label: 'Quick open file', i18n: { ko: '빠른 파일 열기', ja: 'クイックオープン', zh: '快速打开文件' }, area: 'code-studio', category: 'navigation', shortcut: 'Ctrl+P', keywords: ['file', 'open', '파일'] },
  'code:toggle-terminal':   { id: 'code:toggle-terminal',   label: 'Toggle terminal', i18n: { ko: '터미널 토글', ja: 'ターミナル切替', zh: '切换终端' }, area: 'code-studio', category: 'view', shortcut: 'Ctrl+`', keywords: ['console', '콘솔', '터미널'] },
  'code:new-file':          { id: 'code:new-file',          label: 'New file',        i18n: { ko: '새 파일', ja: '新規ファイル', zh: '新建文件' }, area: 'code-studio', category: 'edit', shortcut: 'Ctrl+N', keywords: ['create', 'new', '생성'] },
  // [Batch 4 rank 12 — 2026-06-07] work-receipt 결정 저널 (AuditInvoice). fix 승인/거절 이력 영속 표시.
  'code:open-receipt-journal': { id: 'code:open-receipt-journal', label: 'Open receipt journal', i18n: { ko: '결정 저널 열기', ja: '決定ジャーナル', zh: '打开决定日志' }, area: 'code-studio', category: 'view', keywords: ['receipt', 'journal', 'audit', '영수증', '저널', '감사', '결정'] },

  // ─── Translation Studio ─────────────────────────────────────
  'translate:run-stage':    { id: 'translate:run-stage',    label: 'Run translation stage', i18n: { ko: '번역 단계 실행', ja: '翻訳ステージ', zh: '翻译阶段' }, area: 'translation-studio', category: 'edit' },
  'translate:swap-track':   { id: 'translate:swap-track',   label: 'Swap faithful/market track', i18n: { ko: '트랙 전환', ja: 'トラック切替', zh: '切换路径' }, area: 'translation-studio', category: 'edit' },
  // [Batch 1 rank 4 — 2026-06-07] 12 패널 (6 좌 + 6 우) — Cmd+K 팔레트 진입.
  // Left panels — panel-registry.ts LEFT_PANELS 와 1:1 매핑.
  'translate:open-explorer':  { id: 'translate:open-explorer',  label: 'Open Explorer (left)',   i18n: { ko: '프로젝트 (Explorer) 열기', ja: 'エクスプローラー', zh: '打开资源管理器' }, area: 'translation-studio', category: 'navigation', keywords: ['files', 'chapter', '파일', '챕터'] },
  'translate:open-glossary':  { id: 'translate:open-glossary',  label: 'Open Glossary (left)',   i18n: { ko: '용어집 (Glossary) 열기', ja: '用語集', zh: '打开术语表' }, area: 'translation-studio', category: 'navigation', keywords: ['terms', '용어'] },
  'translate:open-history':   { id: 'translate:open-history',   label: 'Open History (left)',    i18n: { ko: '번역 기록 (History) 열기', ja: '翻訳履歴', zh: '打开翻译历史' }, area: 'translation-studio', category: 'navigation', keywords: ['log', '기록'] },
  'translate:open-multilang': { id: 'translate:open-multilang', label: 'Open Multi-lang batch (left)', i18n: { ko: '다국어 배치 번역 열기', ja: '多言語バッチ', zh: '多语言批量' }, area: 'translation-studio', category: 'navigation', keywords: ['batch', '배치'] },
  'translate:open-backup':    { id: 'translate:open-backup',    label: 'Open Save & backup (left)', i18n: { ko: '저장 · 백업 · 보내기 열기', ja: '保存・バックアップ', zh: '保存与备份' }, area: 'translation-studio', category: 'data', keywords: ['save', 'export', '저장', '백업', '내보내기'] },
  'translate:open-settings':  { id: 'translate:open-settings',  label: 'Open Settings (left)',   i18n: { ko: '설정 (Settings) 열기', ja: '設定', zh: '设置' }, area: 'translation-studio', category: 'system' },
  // Right panels — panel-registry.ts RIGHT_PANELS 와 1:1 매핑.
  'translate:open-actions':   { id: 'translate:open-actions',   label: 'Open Translate actions (right)', i18n: { ko: '번역 실행 패널 열기', ja: '翻訳実行', zh: '翻译执行' }, area: 'translation-studio', category: 'edit', keywords: ['run', 'translate', '실행', '번역'] },
  'translate:open-chat':      { id: 'translate:open-chat',      label: 'Open NOA Copilot (right)', i18n: { ko: 'NOA 코파일럿 열기', ja: 'NOA コパイロット', zh: 'NOA 副驾驶' }, area: 'translation-studio', category: 'ai', keywords: ['copilot', '코파일럿', 'ai'] },
  'translate:open-audit':     { id: 'translate:open-audit',     label: 'Open Quality Audit (right)', i18n: { ko: '품질 검증 패널 열기', ja: '品質監査', zh: '质量审计' }, area: 'translation-studio', category: 'view', keywords: ['audit', 'quality', '검증', '품질'] },
  'translate:open-reference': { id: 'translate:open-reference', label: 'Open References (right)', i18n: { ko: '참고자료 패널 열기', ja: '参考資料', zh: '参考资料' }, area: 'translation-studio', category: 'view', keywords: ['ref', '참고'] },
  'translate:open-adoption':  { id: 'translate:open-adoption',  label: 'Open Segment Adoption (right)', i18n: { ko: '세그먼트 채택 패널 열기', ja: 'セグメント採択', zh: '段落采纳' }, area: 'translation-studio', category: 'edit', keywords: ['adopt', 'segment', '채택'] },
  'translate:open-signoff':   { id: 'translate:open-signoff',   label: 'Open Author Sign-off (right)', i18n: { ko: '작가 sign-off 패널 열기', ja: '作家サインオフ', zh: '作者签字' }, area: 'translation-studio', category: 'edit', keywords: ['signoff', 'author', '서명', '승인'] },

  // ─── Codex (Global accessible) ──────────────────────────────
  'global:codex-open':      { id: 'global:codex-open',      label: 'Open Codex',     i18n: { ko: '코덱스 열기', ja: 'コーデックス', zh: '打开编码' }, area: 'global', category: 'navigation', shortcut: 'Cmd+Shift+K', keywords: ['encyclopedia', 'lore', '백과', '용어'] },
  'codex:add-character':    { id: 'codex:add-character',    label: 'Add character',  i18n: { ko: '캐릭터 추가', ja: 'キャラ追加', zh: '添加角色' }, area: 'codex', category: 'edit' },
  'codex:add-item':         { id: 'codex:add-item',         label: 'Add item',       i18n: { ko: '아이템 추가', ja: 'アイテム追加', zh: '添加物品' }, area: 'codex', category: 'edit' },
  'codex:switch-domain':    { id: 'codex:switch-domain',    label: 'Switch domain',  i18n: { ko: '도메인 변경', ja: 'ドメイン変更', zh: '切换领域' }, area: 'codex', category: 'system' },

  // ─── Network ────────────────────────────────────────────────
  'network:new-post':       { id: 'network:new-post',       label: 'New post',       i18n: { ko: '새 글 작성', ja: '新規投稿', zh: '新建帖子' }, area: 'network', category: 'edit' },
  'network:search-agent':   { id: 'network:search-agent',   label: 'Agent search',   i18n: { ko: '에이전트 검색', ja: 'エージェント検索', zh: '智能搜索' }, area: 'network', category: 'navigation', shortcut: 'Ctrl+K' },

  // ─── Global ─────────────────────────────────────────────────
  'global:open-settings':   { id: 'global:open-settings',   label: 'Open settings',  i18n: { ko: '설정 열기', ja: '設定', zh: '设置' }, area: 'global', category: 'system' },
  'global:toggle-zen':      { id: 'global:toggle-zen',      label: 'Toggle Zen mode', i18n: { ko: '젠 모드', ja: 'ゼンモード', zh: '禅模式' }, area: 'global', category: 'view' },
  // [P20 루프2 — 2026-06-08] 단축키 도움말 — 영역별 4-way 키 표준 발견성 강화.
  'global:shortcuts-help':  { id: 'global:shortcuts-help',  label: 'Keyboard shortcuts help', i18n: { ko: '단축키 도움말', ja: 'ショートカット一覧', zh: '快捷键帮助' }, area: 'global', category: 'help', shortcut: 'Ctrl+/', keywords: ['shortcut', 'help', '단축키', '도움말'] },
});

// ============================================================
// PART 3 — Helpers
// ============================================================

/** 언어별 라벨 해석. i18n 우선, 폴백 label. */
export function resolveLabel(def: ActionDef, lang: AgentLanguage | 'en'): string {
  if (def.i18n) {
    const v = def.i18n[lang as keyof ActionI18n];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return def.label;
}

/**
 * 영역 필터 — 현재 영역 + global 액션만 노출.
 * @param area 현재 활성 영역
 * @param includeGlobal global 액션 포함 여부 (기본 true)
 */
export function filterByArea(area: ActionArea, includeGlobal = true): ActionDef[] {
  return Object.values(ACTION_CATALOG).filter(
    (d) => d.area === area || (includeGlobal && d.area === 'global'),
  );
}

/** 카테고리별 그룹 (UI 그룹핑용) */
export function groupByCategory(
  defs: ReadonlyArray<ActionDef>,
): Record<ActionCategory, ActionDef[]> {
  const out: Record<ActionCategory, ActionDef[]> = {
    navigation: [], ai: [], edit: [], view: [], data: [], help: [], system: [],
  };
  for (const d of defs) out[d.category].push(d);
  return out;
}

// [P10 루프2 — 2026-06-08] 런타임 binder 는 action-binder.ts 로 분리.
// 하위 호환 — 기존 caller 가 action-registry 에서 import 하던 함수 유지.
export { getActionDef, bindAction, bindActions } from './action-binder';

// ============================================================
// PART 4 — i18n consistency audit (P18)
// ============================================================

/**
 * [P18 루프2 — 2026-06-08] ACTION_CATALOG i18n 완전성 감사.
 * 각 액션이 4 언어 (ko/en/ja/zh) 모두 정의됐는지 검사. 누락 액션 ID 목록 반환.
 *
 * @param required  필수 언어 목록 (기본 4 언어 전부)
 * @returns 누락 항목: { actionId, missingLangs }
 */
export function auditActionI18n(
  required: ReadonlyArray<keyof ActionI18n> = ['ko', 'en', 'ja', 'zh'],
): Array<{ id: string; missingLangs: string[] }> {
  const out: Array<{ id: string; missingLangs: string[] }> = [];
  for (const def of Object.values(ACTION_CATALOG)) {
    const missing: string[] = [];
    for (const lang of required) {
      // en 은 label 폴백으로 간주.
      if (lang === 'en') {
        const v = def.i18n?.en;
        const labelOk = def.label && def.label.trim().length > 0;
        if (!v && !labelOk) missing.push('en');
        continue;
      }
      const v = def.i18n?.[lang];
      if (!v || !v.trim()) missing.push(String(lang));
    }
    if (missing.length > 0) {
      out.push({ id: def.id, missingLangs: missing });
    }
  }
  return out;
}
