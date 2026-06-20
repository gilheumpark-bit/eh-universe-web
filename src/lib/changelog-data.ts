// ============================================================
// PART 1 — Types
// ============================================================

import type { AppLanguage } from './studio-types';

export type ChangelogType = 'feature' | 'improvement' | 'fix' | 'security';
export type ChangelogScope =
  | 'studio'
  | 'translation'
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
    version: '0.3.0-alpha.2',
    date: '2026-05-10',
    type: 'security',
    scope: 'platform',
    title: {
      KO: '알파 출시 감사 — 데이터 무결성·노아 가드 강화',
      EN: 'Alpha Audit — Data Integrity + Noa Guard Hardening',
      JP: 'アルファ監査 — データ整合性・Noa ガード強化',
      CN: '阿尔法审计 — 数据完整性 + Noa 防护强化',
    },
    description: {
      KO: '알파 직전 종합 감사 — 12/17 MUST 처리. ① ATTESTATION 디스클레이머 강도 (v1.0.0 → v1.1.0, ko/ja 사법 절차 증거 부정 명시) ② 연결 키 sign-out 시 prefix 기반 전체 삭제 ③ creative-process append-only 검증 ④ localStorage/IndexedDB quota 모니터 ⑤ PRISM 거절 친화 메시지 4언어 ⑥ detail-pass false positive 보강 (한국 성씨 200대 + 일반 명사 stoplist + 조사·호칭 trim) ⑦ dual-pipeline 부분 실패 4언어 표기 ⑧ check:user-exposure grep (외부 status / 마이그레이션 마커 / 개발자 용어) ⑨ production console.log 제거 ⑩ token-meter critical 시 contextBlock 절삭 (11 단계 우선순위) ⑪ FirstVisitOnboarding 4번째 슬라이드 (증명 시스템). 단위 테스트 26 신규 + 회귀 0건. type-check 0 errors. 격리 §1 8 파일 0byte.',
      EN: 'Comprehensive pre-alpha audit — 12/17 MUST processed. ① ATTESTATION disclaimer strengthened (v1.0.0 → v1.1.0, ko/ja explicitly negate judicial evidence) ② connection-key prefix-based wipe on sign-out ③ creative-process append-only audit ④ localStorage/IndexedDB quota monitor ⑤ PRISM rejection-friendly message in 4 langs ⑥ detail-pass false positive guard (200+ Korean surnames + common-noun stoplist + particle/honorific trim) ⑦ dual-pipeline partial failure labeled in 4 langs ⑧ check:user-exposure grep (external status / migration markers / dev terms) ⑨ production console.log stripped ⑩ token-meter trims contextBlocks at critical (11-tier priority) ⑪ FirstVisitOnboarding 4th slide (verification system). 26 new unit tests + zero regression. type-check 0 errors. Isolation §1: 8 files unchanged at byte-level.',
      JP: 'アルファ直前の総合監査 — 12/17 MUST 処理。① ATTESTATION 免責文の強度補強 (v1.0.0 → v1.1.0、ko/ja で司法手続証拠否定を明記) ② 接続キー sign-out 時 prefix 一括削除 ③ creative-process append-only 検証 ④ localStorage/IndexedDB quota 監視 ⑤ PRISM 拒否時のユーザー親和メッセージ 4言語 ⑥ detail-pass false positive 補強 ⑦ dual-pipeline 部分失敗の 4言語表記 ⑧ check:user-exposure grep ⑨ production console.log 削除 ⑩ token-meter critical 時に contextBlock 絞り込み ⑪ FirstVisitOnboarding 4 枚目スライド追加。単体テスト 26 新規 + 回帰 0 件。',
      CN: 'Alpha 前夕综合审计 — 处理 12/17 MUST。① ATTESTATION 免责声明强度增强 (v1.0.0 → v1.1.0, ko/ja 明确否定司法程序证据) ② 连接密钥退出时基于前缀的全量删除 ③ creative-process 仅追加策略审计 ④ localStorage/IndexedDB quota 监控 ⑤ PRISM 拒绝时友好提示 4 语言 ⑥ detail-pass 假阳性强化 ⑦ dual-pipeline 部分失败的 4 语言标记 ⑧ check:user-exposure grep ⑨ production console.log 剥离 ⑩ token-meter critical 时收缩 contextBlock ⑪ FirstVisitOnboarding 第 4 张幻灯片。新增单元测试 26 + 回归 0。',
    },
  },
  {
    version: '0.3.0-alpha.1',
    date: '2026-05-08',
    type: 'feature',
    scope: 'translation',
    title: {
      KO: 'Cross-border Novel IDE — 듀얼 출력 시스템 (Source-faithful + Market-ready)',
      EN: 'Cross-border Novel IDE — Dual Output (Source-faithful + Market-ready)',
      JP: 'Cross-border Novel IDE — デュアル出力 (Source-faithful + Market-ready)',
      CN: 'Cross-border Novel IDE — 双重输出（Source-faithful + Market-ready）',
    },
    description: {
      KO: '시장 분석 4차 본질 반영 — Translation Studio가 매 번역마다 두 결과를 동시 생성. **Source-faithful Translation** (작가 의도·고유명사·복선·문체 보존) + **Market-ready Localization** (대사 리듬·호칭·장르 문법·시장 감각). Stage 1~3 공유 + Stage 4~5 병렬 (비용 1.4x). 신설 21 모듈: dual-pipeline / honorifics / chapter-splitter / korean-genre-matrix / segment-adoption / author-signoff / ncg-nct / process-record-hooks / docx-export / schema-migration / studio-bridge / command-spec / TripleEditor / SegmentAdoptionPanel / SignoffPanel / KoreanGenrePicker + LSP 3 endpoint (translate-quality / glossary-validate / honorific-check). Studio 인체공학 — useSessionSnapshot / LastTaskCard / useCmdPalette. 1원칙(원문 잘라먹기 방지) faithful 엄격 / market 완화 차등 적용. 알파 비공개 강화 — robots.txt + meta noindex를 현행 공개 표면 전체에 적용.',
      EN: 'Implements market analysis v4 essential — Translation Studio now produces two results per translation. **Source-faithful Translation** (preserves author intent, names, foreshadowing, voice) + **Market-ready Localization** (dialogue rhythm, honorifics, genre fit, market feel). Stage 1~3 shared + Stage 4~5 parallel (1.4x cost). 21 new modules: dual-pipeline / honorifics / chapter-splitter / korean-genre-matrix / segment-adoption / author-signoff / ncg-nct / process-record-hooks / docx-export / schema-migration / studio-bridge / command-spec / TripleEditor / SegmentAdoptionPanel / SignoffPanel / KoreanGenrePicker + 3 LSP endpoints (translate-quality / glossary-validate / honorific-check). Studio ergonomics — useSessionSnapshot / LastTaskCard / useCmdPalette. Rule #1 (no source truncation) applied differentially: faithful strict / market relaxed. Alpha non-public hardening — robots.txt + meta noindex across current public surfaces.',
      JP: '市場分析 4 次本質を実装 — Translation Studio が翻訳ごとに 2 つの結果を同時生成。**Source-faithful Translation** (作家意図・固有名詞・複線・文体保存) + **Market-ready Localization** (台詞リズム・呼称・ジャンル文法・市場感覚)。Stage 1~3 共有 + Stage 4~5 並列 (コスト 1.4x)。新設 21 モジュール、LSP 3 エンドポイント、Studio エルゴノミクス。Rule #1 (原文切り捨て防止) faithful 厳格 / market 緩和。現行公開面に robots.txt + meta noindex を適用。',
      CN: '实现市场分析 4 次本质 — Translation Studio 每次翻译同时生成两个结果。**Source-faithful Translation**（保留作者意图、专有名词、伏笔、文风）+ **Market-ready Localization**（对话节奏、称呼、类型语法、市场感觉）。Stage 1~3 共享 + Stage 4~5 并行（成本 1.4x）。新增 21 模块，3 LSP 端点，Studio 人体工学。Rule #1（防止原文截断）faithful 严格 / market 宽松。robots.txt + meta noindex 已应用到当前公开表面。',
    },
  },
  {
    version: '0.2.0-alpha.7',
    date: '2026-04-21',
    type: 'improvement',
    scope: 'platform',
    title: {
      KO: '라이브 프리뷰 접근성 마감 — 토큰·랜드마크·터치타겟·4언어 메타',
      EN: 'Live Preview A11y Polish — Tokens / Landmarks / Touch Targets / 4-lang Meta',
      JP: 'ライブプレビュー アクセシビリティ仕上げ — トークン・ランドマーク・タッチターゲット・4言語メタ',
      CN: '实时预览无障碍收尾 — 令牌 / 地标 / 触摸目标 / 4 语言元数据',
    },
    description: {
      KO: 'axe 감사로 잡은 P1 전건 + Lighthouse 5페이지 감사 모든 실패 수리로 **5페이지 A11y 100/100** 달성. 라이트/다크 accent 토큰을 WCAG 4.5:1 기준으로 0.3단계 재밸런싱(amber #8a6a20→#6f5318, dark #b8955c→#caa572 등), UnifiedSettingsContext JS 인라인 오버라이드와 globals.css를 단일 소스로 동기화. 페이지별 <main>/<article>/<h1> 랜드마크 36곳 정돈(nested main 제거). MobileStudioView 섹션 헤딩을 h3→h2로 승격(heading-order WCAG 1.3.1). Header 로고·언어토글·이전 보관 아이콘·MobileDesktopOnlyGate 버튼의 WCAG 2.5.3(Label in Name) 위반 5건 수리 — aria-hidden으로 장식 요소 분리 + aria-label에 가시 텍스트 포함. 모바일 8항목 + 데스크톱 4항목 네비 min-h 44px 통일로 WCAG 2.1 AAA 터치타겟 달성. privacy/terms/copyright/ai-disclosure 4페이지에 generateMetadata 다국어(KO/EN/JP/CN) 추가. universeStats 숫자에 tabular-nums 적용. realtime-collab 사용자 색상 6종을 다크 토큰 시리즈에 맞춰 재지정.',
      EN: 'Fixed every P1 from the axe audit plus all failing audits in a 5-page Lighthouse sweep — **5 pages now A11y 100/100**. Rebalanced light/dark accent tokens by 0.3 step to meet WCAG 4.5:1 (amber #8a6a20→#6f5318, dark #b8955c→#caa572, etc.) and synced the UnifiedSettingsContext JS inline override with globals.css as a single source. Cleaned per-page <main>/<article>/<h1> landmarks across 36 files (removed nested main). Promoted MobileStudioView section headings h3→h2 (heading-order WCAG 1.3.1). Fixed 5 WCAG 2.5.3 (Label in Name) violations on Header logo / language toggle / previous-record icon / MobileDesktopOnlyGate button — decorative parts marked aria-hidden and aria-labels now contain visible text. Unified 8 mobile + 4 desktop nav items to min-h 44px for WCAG 2.1 AAA touch targets. Added 4-language generateMetadata (KO/EN/JP/CN) to privacy/terms/copyright/ai-disclosure. Applied tabular-nums to universeStats counters. Recolored 6 realtime-collab user swatches to match the dark token series.',
      JP: 'axe監査のP1全件 + Lighthouse 5ページ監査の失敗を全て修正し**5ページ A11y 100/100**を達成。ライト/ダーク accent トークンをWCAG 4.5:1基準で0.3段階リバランス(amber #8a6a20→#6f5318、ダーク #b8955c→#caa572 等)、UnifiedSettingsContext JSインラインオーバーライドと globals.css を単一ソースに同期。ページ別 <main>/<article>/<h1> ランドマーク36箇所を整理(nested main 除去)。MobileStudioView セクション見出しを h3→h2 に昇格(heading-order WCAG 1.3.1)。Header ロゴ・言語トグル・旧保管アイコン・MobileDesktopOnlyGate ボタンの WCAG 2.5.3(Label in Name)違反5件を修正 — 装飾部を aria-hidden で分離し aria-label に可視テキストを含める。モバイル8項目+デスクトップ4項目のナビ min-h を 44px に統一し WCAG 2.1 AAA タッチターゲットを達成。privacy/terms/copyright/ai-disclosure の4ページに generateMetadata の4言語(KO/EN/JP/CN)を追加。universeStats の数値に tabular-nums を適用。realtime-collab のユーザーカラー6色をダークトークンシリーズに合わせて再設定。',
      CN: '修复 axe 审计的 P1 全件 + Lighthouse 5 页审计的所有失败，达成**5 页 A11y 100/100**。按 WCAG 4.5:1 标准以 0.3 步长重新平衡浅/暗 accent 令牌（amber #8a6a20→#6f5318、暗色 #b8955c→#caa572 等），将 UnifiedSettingsContext 的 JS 内联覆盖与 globals.css 同步为单一来源。整理 36 个文件的 <main>/<article>/<h1> 地标（移除嵌套 main）。将 MobileStudioView 区域标题从 h3→h2 提升（heading-order WCAG 1.3.1）。修复 Header 徽标 / 语言切换 / 旧保管图标 / MobileDesktopOnlyGate 按钮的 WCAG 2.5.3（Label in Name）违规 5 处 — 装饰元素添加 aria-hidden，aria-label 包含可见文本。将移动端 8 项 + 桌面端 4 项导航 min-h 统一为 44px，达成 WCAG 2.1 AAA 触摸目标。为 privacy/terms/copyright/ai-disclosure 4 个页面添加 generateMetadata 4 语言（KO/EN/JP/CN）。在 universeStats 数字上应用 tabular-nums。根据暗色令牌系列重设 realtime-collab 6 个用户色。',
    },
  },
  {
    version: '0.2.0-alpha.6',
    date: '2026-04-19',
    type: 'improvement',
    scope: 'studio',
    title: {
      KO: 'NOA 인격 통일 + 연령 등급 각국화 + UX S등급(951/1000)',
      EN: 'NOA Persona Unification + Age Rating Localization + UX Grade S',
      JP: 'NOA人格統一 + 年齢区分各国化 + UX Sランク',
      CN: 'NOA 人格统一 + 年龄分级本地化 + UX S 级',
    },
    description: {
      KO: 'UI 전면에서 추상적 "AI" 용어를 "NOA"(인격화 조력자)로 통일(51+건, 외부 공급자/브랜드명은 AI 유지). 연령 등급을 방심위·ESRB·CERO 등 각국 표준 용어로 번역하고 "기록됨" 배지로 면피 증거를 가시화. prismMode와 ContentRating을 단일 소스로 통합하여 Export 자동 동기화. 업계 표준 6프레임워크(Nielsen/WCAG/Web Vitals/Readability/IA/Mobile) 감사 782→951점(+169) S등급 진입. Progressive Disclosure 완성 + 시맨틱 토큰 704건 치환 + 철학 원본 문서(manifesto.md) 추가.',
      EN: 'Unified the abstract "AI" label across the UI to "NOA" (persona-based companion, 51+ changes; external providers and brand names keep AI). Localized age ratings to each country standard (KCSC / ESRB / CERO) and added "Recorded" badges for accountability evidence. Integrated prismMode and ContentRating as a single source for auto-sync on Export. UX audit rose 782→951 (+169) to Grade S across 6 industry frameworks (Nielsen/WCAG/Web Vitals/Readability/IA/Mobile). Progressive Disclosure completed + 704 semantic token replacements + philosophy manifesto added.',
      JP: 'UIの抽象的な「AI」表記を「NOA」(人格化コンパニオン)に統一(51+件、外部プロバイダー/ブランド名はAI維持)。年齢区分を方審委/ESRB/CEROなど各国標準用語へ現地化し、「記録済」バッジで免責証拠を可視化。prismModeとContentRatingを単一ソース化してエクスポート自動同期。業界標準6フレームワーク監査 782→951(+169) Sランク到達。プログレッシブディスクロージャー完成+セマンティックトークン704件置換+哲学マニフェスト追加。',
      CN: 'UI 层面将抽象 "AI" 统一为 "NOA"(人格化伙伴,51+ 处;外部供应商/品牌名保留 AI)。年龄分级本地化为各国标准用语(方审委 / ESRB / CERO),添加"已记录"徽章实现免责证据可视化。整合 prismMode 与 ContentRating 为单一源,导出自动同步。业界标准 6 框架审计 782→951(+169) 进入 S 级。完成渐进披露+替换 704 处语义令牌+新增哲学宣言。',
    },
  },
  {
    version: '0.2.0-alpha.5',
    date: '2026-04-19',
    type: 'security',
    scope: 'platform',
    title: {
      KO: '전수 보안 감사 — P0 6건 + P1 13건 수리',
      EN: 'Full Security Audit — 6 P0 + 13 P1 fixed',
      JP: '全数セキュリティ監査 — P0 6件 + P1 13件修正',
      CN: '全面安全审计 — 修复 P0 6 件 + P1 13 件',
    },
    description: {
      KO: 'XSS, iframe sandbox 탈출, CLI shell injection 3건, API 인증 누락 2건, AI 출력 shell 직주입 등 실제 공격 벡터를 전수 수리했습니다. HMAC fallback / ulimit 등 거짓 보안도 정직한 경고로 교체했습니다.',
      EN: 'Fixed real attack vectors end-to-end: XSS, iframe sandbox escape, 3 CLI shell injections, 2 unauthenticated API routes, and AI-output shell injection. Fake-security paths (HMAC fallback, ulimit) replaced with honest warnings.',
      JP: 'XSS、iframe sandbox脱出、CLI shell injection 3件、API認証欠落 2件、AI出力からのshell直注入など実際の攻撃ベクトルを一括修正。HMAC fallback / ulimit などの「偽セキュリティ」も正直な警告に置換。',
      CN: '修复 XSS、iframe sandbox 逃逸、CLI shell 注入 3 件、API 认证缺失 2 件、AI 输出 shell 直注入等实际攻击载体。HMAC fallback / ulimit 等"假安全"也替换为如实告警。',
    },
  },
  {
    version: '0.2.0-alpha.4',
    date: '2026-04-19',
    type: 'feature',
    scope: 'platform',
    title: {
      KO: 'Progressive Disclosure — 역할 기반 UI + Settings 4탭',
      EN: 'Progressive Disclosure — Role-Based UI + Settings 4-Tab',
      JP: 'プログレッシブディスクロージャー — 役割ベースUI + Settings 4タブ',
      CN: '渐进披露 — 基于角色的 UI + Settings 4 标签',
    },
    description: {
      KO: 'Welcome 4번째 슬라이드에서 소설가/번역가/출판사/둘러보기 4역할을 선택합니다. Writing 탭 기본은 수동+AI FAB로 단순화되고, 5모드는 고급 토글 시 노출됩니다. Settings는 Easy/Writing/Advanced/Developer 4탭으로 분리되었고, Translation 탭에는 30초 샘플 데모가 추가되었습니다.',
      EN: 'A 4th Welcome slide picks role: Writer / Translator / Publisher / Explorer. Writing tab default is now manual + AI FAB; the 5-mode advanced view is opt-in. Settings split into Easy / Writing / Advanced / Developer (4 tabs). Translation tab gets a 30-second sample demo.',
      JP: 'Welcomeの4枚目で小説家/翻訳家/出版社/おまかせの4役割を選択。Writingタブは既定で手動+AI FABに簡略化、5モードは詳細トグルで表示。Settingsは Easy / Writing / Advanced / Developer の4タブに分離、Translation には30秒サンプルデモを追加。',
      CN: 'Welcome 第 4 张选择角色（小说家 / 译者 / 出版社 / 浏览）。Writing 标签默认改为手动 + AI FAB，5 种模式仅在高级开关下显示。Settings 拆分为 Easy / Writing / Advanced / Developer 4 标签；Translation 新增 30 秒样本演示。',
    },
  },
  {
    version: '0.2.0-alpha.3',
    date: '2026-04-19',
    type: 'feature',
    scope: 'platform',
    title: {
      KO: '인프라 5축 — 대체 전환 / 백업 / 법적 / SEO / 노아 사용 라벨',
      EN: 'Infrastructure 5-Axis — Failover / Backup / Legal / SEO / Noa-Use Label',
      JP: 'インフラ5軸 — 代替切替 / Backup / 法的 / SEO / Noa使用ラベル',
      CN: '基础设施 5 轴 — 备用切换 / Backup / 法律 / SEO / Noa 使用标签',
    },
    description: {
      KO: 'DGX Spark 단일 장애점 대응(연결 키 대체 전환), 원고 전체 JSON/ZIP 백업+롤백, 법적 문서 4페이지(Terms/Privacy/Copyright/AI Disclosure), Dynamic OG + sitemap 17 URL + 모델 크롤러 9종 차단, EPUB/DOCX 노아 사용 라벨이 한 번에 들어왔습니다.',
      EN: 'Five infra axes shipped at once: DGX-to-connection-key failover, full manuscript JSON/ZIP backup with rollback, 4 legal pages (Terms / Privacy / Copyright / AI Disclosure), dynamic OG + sitemap (17 URLs) + 9 model crawlers blocked, and Noa-use labels in EPUB/DOCX.',
      JP: 'インフラ5軸を一括投入: DGX→接続キー代替切替、原稿全体のJSON/ZIPバックアップ+ロールバック、法的文書4ページ(Terms/Privacy/Copyright/AI Disclosure)、Dynamic OG + sitemap 17 URL + モデルクローラー9種ブロック、EPUB/DOCXへのNoa使用ラベル。',
      CN: '一次性投入基础设施 5 轴：DGX→连接密钥备用切换、稿件整体 JSON/ZIP 备份与回滚、4 个法律页（Terms/Privacy/Copyright/AI Disclosure）、Dynamic OG + sitemap 17 个 URL + 屏蔽 9 种模型爬虫、EPUB/DOCX Noa 使用标签。',
    },
  },
  {
    version: '0.2.0-alpha.2',
    date: '2026-04-19',
    type: 'improvement',
    scope: 'platform',
    title: {
      KO: '3루프 정밀 진단 — 850+ 파일 / 200+ 수리',
      EN: '3-Loop Full Audit — 850+ files / 200+ fixes',
      JP: '3ループ精密監査 — 850+ファイル / 200+修正',
      CN: '3 循环精密审计 — 850+ 文件 / 200+ 修复',
    },
    description: {
      KO: '"효율 금지, 파일 1개당 Read 강제" 원칙으로 3루프(790/15/25 파일)를 돌려 200+ 이슈를 수리했습니다. saga-transaction 노아 이중 호출, suggest.ts 침묵 참조 오류, Tailwind 무효 z-class, 구 패널 훅 분해 등이 포함됩니다.',
      EN: 'Ran 3 loops (790 / 15 / 25 files) under a "no shortcuts, full Read per file" rule and fixed 200+ issues. Includes the saga-transaction Noa double-call, a swallowed suggest.ts reference error, invalid Tailwind z-classes, and legacy panel hook cleanup.',
      JP: '"効率禁止・1ファイル1 Read"を厳守し3ループ(790/15/25ファイル)で200+件を修正。saga-transactionのNoa二重呼び出し、suggest.tsの参照エラー、Tailwindの無効z-class、旧パネルhook整理などを含みます。',
      CN: '以"禁止效率、每个文件强制 Read"为原则跑完 3 循环（790/15/25 文件），修复 200+ 问题。包含 saga-transaction Noa 双调用、suggest.ts 参考错误、Tailwind 无效 z-class、旧面板 hook 清理等。',
    },
  },
  {
    version: '0.2.0-alpha.1',
    date: '2026-04-19',
    type: 'feature',
    scope: 'compliance',
    title: {
      KO: '노아 사용 고지 + 19+ 콘텐츠 플래그 + 체인지로그',
      EN: 'Noa-Use Disclosure + 19+ Content Flag + Changelog',
      JP: 'Noa使用開示 + 19+コンテンツフラグ + 変更履歴',
      CN: 'Noa 使用声明 + 19+ 内容标记 + 更新日志',
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
