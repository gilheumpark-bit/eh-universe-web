// ============================================================
// PART 1 — Types
// ============================================================

import type { AppLanguage } from './studio-types';

export type ChangelogType = 'feature' | 'improvement' | 'fix' | 'security';
export type ChangelogScope =
  | 'studio'
  | 'translation'
  | 'code-studio'
  | 'network'
  | 'universe'
  | 'compliance'
  | 'platform';

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  type: ChangelogType;
  scope?: ChangelogScope;
  title: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
}

// ============================================================
// PART 2 — Changelog entries (newest first)
// ============================================================

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0-alpha.1',
    date: '2026-04-19',
    type: 'feature',
    scope: 'compliance',
    title: {
      KO: 'AI 사용 고지 + 19+ 콘텐츠 플래그 + 체인지로그',
      EN: 'AI Disclosure + 19+ Content Flag + Changelog',
      JP: 'AI使用開示 + 19+コンテンツフラグ + 変更履歴',
      CN: 'AI 使用声明 + 19+ 内容标记 + 更新日志',
    },
    description: {
      KO: '플랫폼 제출용 AI 사용 라벨이 Export 시 자동 삽입됩니다(opt-out 가능). 프로젝트별 연령 등급(전연령/12+/15+/19+)을 자가 선언할 수 있으며, 19+는 EPUB dc:audience + 파일명 prefix가 자동 적용됩니다.',
      EN: 'AI-use labels are now auto-inserted when exporting (opt-out available). Per-project content ratings (All / 12+ / 15+ / 19+) can be self-declared, and 19+ auto-applies EPUB dc:audience plus filename prefix.',
      JP: 'プラットフォーム提出用のAI使用ラベルがExport時に自動挿入されます(オプトアウト可)。プロジェクトごとの年齢区分(全年齢/12+/15+/19+)を自己申告でき、19+はEPUBのdc:audienceとファイル名プレフィックスが自動適用されます。',
      CN: '平台提交用的 AI 使用标签在导出时自动插入（可选关闭）。项目级内容分级（全年龄/12+/15+/19+）可自行声明，19+ 自动应用 EPUB dc:audience 与文件名前缀。',
    },
  },
  {
    version: '0.1.0-alpha.12',
    date: '2026-04-18',
    type: 'improvement',
    scope: 'platform',
    title: {
      KO: '작가 UX 전수 개선 — 접근성·세션·키보드·빈 상태',
      EN: 'Sweeping Author UX — Accessibility / Session / Keyboard / Empty States',
      JP: '作家UX一括改善 — アクセシビリティ・セッション・キーボード・空状態',
      CN: '作者 UX 全面优化 — 可访问性 / 会话 / 键盘 / 空状态',
    },
    description: {
      KO: '풀 에이전트 병렬 처리로 10건의 UX 개선을 일괄 반영했습니다. 작가 세션(포모도로/목표/휴식), 시각 편의, 키보드 단축키 재맵, 빈 상태 가이드, WCAG 2.1 AA 포커스 처리가 포함됩니다.',
      EN: '10 UX improvements landed via parallel full-agent processing: writer sessions (Pomodoro / daily goals / breaks), visual ergonomics, keyboard remaps, empty-state guides, and WCAG 2.1 AA focus handling.',
      JP: 'フルエージェント並列処理で10件のUX改善を一括反映。作家セッション(ポモドーロ/目標/休憩)、視覚的な使いやすさ、キーボード再マップ、空状態ガイド、WCAG 2.1 AAフォーカス対応を含みます。',
      CN: '通过全代理并行处理合入 10 项 UX 改进：作家会话（番茄钟/目标/休息）、视觉便利、键盘重映射、空状态引导、WCAG 2.1 AA 焦点处理。',
    },
  },
  {
    version: '0.1.0-alpha.11',
    date: '2026-04-17',
    type: 'improvement',
    scope: 'studio',
    title: {
      KO: 'DGX 듀얼 엔진 + SSE 직결 + GitHub PAT 가이드',
      EN: 'DGX Dual Engine + Direct SSE + GitHub PAT Guide',
      JP: 'DGXデュアルエンジン + SSE直結 + GitHub PATガイド',
      CN: 'DGX 双引擎 + SSE 直连 + GitHub PAT 指南',
    },
    description: {
      KO: 'Cloudflare Tunnel 관통에 성공해 Vercel Edge 프록시 없이 DGX 게이트웨이와 직접 SSE 스트리밍을 주고받습니다. GitHub PAT 설정을 30분에서 1분으로 단축한 친절 가이드가 Settings에 추가되었습니다.',
      EN: 'Cloudflare Tunnel traversal now delivers direct SSE streaming with the DGX gateway — no more Vercel Edge proxy. A friendly GitHub PAT guide cuts setup from 30 minutes to 1 minute.',
      JP: 'Cloudflare Tunnelの貫通に成功し、Vercel EdgeプロキシなしでDGXゲートウェイと直接SSEストリーミングが可能になりました。GitHub PAT設定を30分→1分に短縮する親切ガイドを追加。',
      CN: 'Cloudflare Tunnel 贯通成功，直连 DGX 网关的 SSE 流式传输，不再需要 Vercel Edge 代理。新增友好的 GitHub PAT 指南，将配置时间从 30 分钟缩短到 1 分钟。',
    },
  },
  {
    version: '0.1.0-alpha.10',
    date: '2026-04-17',
    type: 'feature',
    scope: 'studio',
    title: {
      KO: 'DGX 생성 단계 상태 Pill — 15초 무반응 체감 해소',
      EN: 'DGX Generation Stage Status Pill — 15s Silence Killed',
      JP: 'DGX生成ステージステータスPill — 15秒無反応の体感を解消',
      CN: 'DGX 生成阶段状态 Pill — 消除 15 秒无响应体感',
    },
    description: {
      KO: '첫 토큰까지의 대기 시간 동안 “연결중 / 프롬프트 준비 / 생성 시작”을 미세한 pill로 표시합니다. 15초 침묵처럼 느껴지던 체감이 해소되었습니다.',
      EN: 'A subtle status pill now shows "Connecting / Preparing prompt / Streaming" during the wait for the first token, eliminating the 15-second silence perception.',
      JP: '最初のトークンまでの待機時間中、「接続中 / プロンプト準備 / 生成開始」を小さなpillで表示。15秒無反応のように感じていた体感を解消しました。',
      CN: '在等待第一个 token 期间以小型 pill 显示"连接中 / 准备提示 / 开始生成"，消除了 15 秒沉默的体感。',
    },
  },
  {
    version: '0.1.0-alpha.9',
    date: '2026-04-16',
    type: 'improvement',
    scope: 'code-studio',
    title: {
      KO: 'Code Studio Loop 3 — 전수 진단 완료',
      EN: 'Code Studio Loop 3 — Full Audit Done',
      JP: 'Code Studio Loop 3 — 全面監査完了',
      CN: 'Code Studio Loop 3 — 全面审计完成',
    },
    description: {
      KO: '3루프 전수 진단을 마치며 useCodeStudioPanels 분해 + 이월 이슈 마무리가 이뤄졌습니다. 9-stage 파이프라인의 blocking 단계가 더 일관되게 동작합니다.',
      EN: 'Finished the 3-loop audit with a useCodeStudioPanels split and carry-over cleanup. Blocking stages in the 9-stage pipeline now behave more consistently.',
      JP: '3ループの全面監査を完了し、useCodeStudioPanelsの分解と積み残しの整理を実施。9ステージパイプラインのブロッキング段がより一貫して動作するようになりました。',
      CN: '完成 3 循环全面审计，拆分 useCodeStudioPanels 并处理遗留问题。9 阶段流水线的阻塞阶段现在行为更一致。',
    },
  },
  {
    version: '0.1.0-alpha.8',
    date: '2026-04-15',
    type: 'security',
    scope: 'platform',
    title: {
      KO: '정밀 보안 전수 검사 — P0 6건 + P1 13건 수리',
      EN: 'Fine-Grained Security Audit — P0 6 / P1 13 fixed',
      JP: '精密セキュリティ全数検査 — P0 6件 + P1 13件修正',
      CN: '精密安全全面检查 — 修复 P0 6 项 + P1 13 项',
    },
    description: {
      KO: 'proxy.ts 보안 헤더를 next.config.ts로 이동, PRO_LOCKED 하드코딩 제거(Firebase custom claims), sandbox nonce 검증 강화, webcontainer new Function 제거 등 P0 6건 + P1 13건을 수리했습니다.',
      EN: 'Moved proxy.ts security headers into next.config.ts, replaced hardcoded PRO_LOCKED with Firebase custom claims, hardened sandbox nonce validation, removed webcontainer new Function use — 6 P0 and 13 P1 fixed.',
      JP: 'proxy.tsのセキュリティヘッダーをnext.config.tsへ移動、PRO_LOCKEDハードコードを撤去(Firebase custom claims)、sandbox nonce検証を強化、webcontainer new Function削除など、P0 6件・P1 13件を修正。',
      CN: '将 proxy.ts 安全头迁至 next.config.ts，以 Firebase custom claims 取代硬编码的 PRO_LOCKED，加固 sandbox nonce 校验，移除 webcontainer 的 new Function — 修复 P0 6 项、P1 13 项。',
    },
  },
  {
    version: '0.1.0-alpha.7',
    date: '2026-04-14',
    type: 'feature',
    scope: 'translation',
    title: {
      KO: '번역 스튜디오 — Voice 1-클릭 재번역 + CJK 토큰화',
      EN: 'Translation Studio — 1-Click Voice Retry + CJK Tokenizer',
      JP: '翻訳スタジオ — Voice 1クリック再翻訳 + CJK トークン化',
      CN: '翻译工作室 — Voice 一键重译 + CJK 分词',
    },
    description: {
      KO: '캐릭터 Voice 규칙 위반 시 1-클릭으로 재번역합니다. Glossary UI 개편, CJK 토큰화 정확도 향상, 6축 채점 점수 950점 달성.',
      EN: 'One click re-translates when character Voice rules are violated. Revamped glossary UI, improved CJK tokenizer accuracy, 6-axis scoring reaches 950.',
      JP: 'キャラクターのVoiceルール違反時、1クリックで再翻訳。Glossary UI刷新、CJKトークン化精度向上、6軸スコアリングで950点達成。',
      CN: '角色 Voice 规则违规时可一键重译。重构术语表 UI、提升 CJK 分词精度，6 轴评分达 950 分。',
    },
  },
];

// ============================================================
// PART 3 — Helpers
// ============================================================

/** 가장 최신 버전 (배지 비교용) */
export function getLatestVersion(): string {
  return CHANGELOG[0]?.version ?? '';
}

/** localStorage 기준 — 사용자가 마지막으로 본 버전 이후 새 엔트리가 있는지 */
export function hasUnseenEntries(lastSeen: string | null): boolean {
  if (!lastSeen) return true;
  const latest = getLatestVersion();
  if (!latest) return false;
  return latest !== lastSeen;
}

/** AppLanguage로 안전 조회 — 누락 시 KO fallback */
export function pickLocalized(
  entry: ChangelogEntry,
  lang: AppLanguage,
  field: 'title' | 'description',
): string {
  const obj = entry[field];
  return obj?.[lang] ?? obj?.KO ?? '';
}
