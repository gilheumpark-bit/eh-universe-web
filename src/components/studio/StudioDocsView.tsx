"use client";

import { useState, useEffect } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { createT } from "@/lib/i18n";
import { logger } from "@/lib/logger";

// ============================================================
// PART 1 — Types & language normalization
// ============================================================

interface Props {
  lang: string;
}

interface DocSection {
  id: string;
  title: string;
  content: string;
}

// Supported language codes — AppLanguage-derived. Normalizes uppercase/lowercase
// and common aliases (ja→JP, zh→CN) before fallback to KO.
const SUPPORTED_LANGS: readonly AppLanguage[] = ['KO', 'EN', 'JP', 'CN'] as const;
const LANG_ALIASES: Record<string, AppLanguage> = {
  ko: 'KO', en: 'EN', jp: 'JP', cn: 'CN',
  ja: 'JP', zh: 'CN',
};

function normalizeLang(input: string): AppLanguage {
  if (!input || typeof input !== 'string') return 'KO';
  const upper = input.toUpperCase();
  if ((SUPPORTED_LANGS as readonly string[]).includes(upper)) return upper as AppLanguage;
  const lower = input.toLowerCase();
  if (LANG_ALIASES[lower]) return LANG_ALIASES[lower];
  logger.warn('StudioDocsView', `Unknown language "${input}", falling back to KO`);
  return 'KO';
}

// ============================================================
// PART 2 — Core sections (KO)
// ============================================================

const KO_SECTIONS: DocSection[] = [
  { id: "start", title: "1. 시작하기", content: "접속: https://ehsu.app\n\nBYOK (Bring Your Own Key) — 무료\n7개 프로바이더: Gemini(무료 추천) / OpenAI / Claude / Groq(무료) / Mistral / Ollama(로컬) / LM Studio(로컬)\nAPI 키 모달에서 '키 발급' 링크로 바로 가입 가능\nAPI 키는 AES-GCM v4로 암호화 저장\n\n시작 방법 3가지:\n1. 쾌속 시작: 장르+한 줄 프롬프트 → 세계관+캐릭터+첫 장면 자동 생성 (API 키 필요)\n2. 직접 설정: 세계관 → 캐릭터 → 연출 → 집필 순서로 하나씩\n3. 데모 체험: 미리 만들어진 소설로 전체 기능 탐색\n\n저장: 자동 저장(500ms) + IndexedDB 10분 백업 + Google Drive 동기화\nFirestore 클라우드 동기화 (CLOUD_SYNC 플래그 활성화 시)" },
  { id: "world", title: "2. 세계관", content: "세계관 탭에서 문명/세력/관계를 설계합니다.\n장르 프리셋 60개 (회귀/빙의/헌터/무협/로맨스판타지 등 한국 웹소설 특화)\n텐션 커브 차트 (회차별 긴장도 시각화)\n총 회차 최대 500화\n플랫폼 프리셋: 문피아 / 노벨피아 / 카카오 / 시리즈\n\nPRISM-MODE 콘텐츠 등급: OFF / FREE / ALL / T15 / M18\n세계관 시뮬레이터: 문명 관계 시각화 + EH 엔진 9단계 적용률" },
  { id: "character", title: "3. 캐릭터", content: "캐릭터 생성: 이름, 역할, 특성, 서사 잠재력(DNA) 입력\n\n3-Tier 서사 프레임워크 (생성 폼에서 직접 입력 가능):\n- 욕망: 이 캐릭터가 원하는 것\n- 결핍: 부족하거나 잃은 것\n- 갈등: 이야기 속 충돌\n\n추가 필드: 성격, 말투, 대사 예시, 변화 방향, 가치관, 강점, 약점, 배경\n캐릭터 관계도 시각화\nNOA 자동 생성 (배역별 분류: 주인공/악당/조력자/기타)" },
  { id: "rulebook", title: "4. 연출 (Direction)", content: "4개 카드 대시보드:\n1. 이야기 구조: 플롯, 텐션 곡선, 분량 배분\n2. 장면 연출: 고구마(답답)·사이다(통쾌), 훅, 클리프, 전환\n3. 캐릭터·감정: 감정선, 대사 톤, 캐논 규칙\n4. 복선·메모: 떡밥 관리, 작가 메모장\n\n씬시트: 장면별 등장인물, 톤, 핵심 대사, 감정 포인트 설계\n카드 클릭 → 해당 편집기 진입\n집필 탭 분할뷰에서 실시간 연출 조정 가능" },
  { id: "writing", title: "5. 집필", content: "5가지 모드 (API 키 없으면 2개만 표시):\n- 집필 (기본): 직접 타이핑. Ctrl+Shift+R로 인라인 리라이트\n- NOA 생성: 프롬프트 입력 → NOA가 장면 생성\n- 3단계: 구조 → 초안 → 다듬기\n- 다듬기: 약한 문단(점수 50 미만) 자동 개선\n- 엔진: 파라미터 직접 제어\n\n실시간 품질 분석 (NOD 게이지):\n- 문단별 0~100점 (show/tell, 반복어, 문장 다양성, 밀도, 대사 비율)\n\n연속성 검사:\n- 캐릭터 이름 오타, 특성 모순, 시간대/장르 모순 실시간 감지\n\n인라인 리라이트:\n- 텍스트 선택 → 리라이트/확장/축소/톤변경\n- 문맥 인식 (장르+캐릭터+주변 ±200자 자동 주입)\n\nUndo 스택: 50단계 (리라이트 전용)\n버전 히스토리: 300자+ 변경 시 자동 스냅샷 + diff 뷰\n참조 패널: 왼쪽 사이드에서 인물/세계관 참조하며 집필" },
  { id: "style", title: "6. 문체", content: "문체 탭 → 독에서 '문체' 클릭\n4가지 DNA: 하드SF / 웹소설 / 문학 / 멀티장르\n5개 슬라이더: 문장길이 / 감정밀도 / 묘사방식 / 서술시점 / 어휘수준\n문체 실험실: 스타일 프리셋 적용 후 미리보기" },
  { id: "manuscript", title: "7. 원고", content: "3가지 모드:\n① 편집: 장면 타임라인 + 씬 재배치\n② 라디오: 캐릭터 음성으로 원고 낭독\n③ 비주얼 노벨: 전체 장면 렌더링\n\n내보내기: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\n번역: 내장 번역 패널 (소설 전용 6축 채점)\n네트워크 공유: EH Network에 원고 게시\n작가 대시보드: 감정 아크 차트 + 피로도 감지" },
  { id: "engine", title: "8. 엔진", content: "ANS 10.0 (Adaptive Narrative System)\n품질 검사: 6차원 평가 (등급/감독점수/EOS/텐션/자연스러움/레드태그)\n자동 재생성: 3회 시도 + Retry-After 헤더 연동\n토큰 버짓: 시스템 프롬프트 30% 초과 시 경고\n캐릭터 20명 초과 시 절삭 경고\n\n60개 장르 프리셋: 회귀/빙의/헌터/무협 등\n고구마/사이다 구조화 → 프롬프트 자동 주입\n창의성 기본값 0.9" },
  { id: "keyboard", title: "9. 단축키", content: "Ctrl+Shift+R: 선택 텍스트 인라인 리라이트\nCtrl+Z: Undo (인라인 리라이트 전용 50단계)\nCtrl+Y / Ctrl+Shift+Z: Redo\n\n집필 모드에서 Zen 모드: textarea 포커스 시 UI 자동 숨김\nESC: 모달/팝업 닫기" },
  { id: "local", title: "10. 로컬 엔진", content: "Ollama / LM Studio 지원\nlocalhost에서 /api/local-proxy로 자동 프록시\n\n설정:\n1. LM Studio: 실행 → 모델 다운 → Local Server → Start → URL: http://localhost:1234\n2. Ollama: ollama pull gemma2 → ollama serve → URL: http://localhost:11434\n\nDGX Spark 등 로컬 GPU: Gemma 4 26B/4B, EXAONE 32B 사용 가능\n\n주의: Vercel(ehsu.app) 배포 환경에서는 로컬 엔진 불가. localhost만 가능." },
  { id: "save", title: "11. 저장·동기화", content: "자동 저장: 500ms 디바운스 → localStorage\nIndexedDB 백업: 10분 간격 버전 백업 (최대 5개)\nbeforeunload 비상 저장: 페이지 닫을 때 동기 저장\nGoogle Drive 동기화: 수동 트리거 (2시간 리마인더)\nFirestore 클라우드: CLOUD_SYNC 플래그 활성 시 3초 디바운스 자동 동기화\n\n내보내기: EPUB 3.0 / DOCX / TXT / JSON 등 7종\n불러오기: JSON 프로젝트 파일 임포트" },
  { id: "security", title: "12. 보안", content: "API 키: AES-GCM v4 암호화 (브라우저)\nCSP + HSTS + X-Frame-Options (next.config.ts headers)\nCSRF: Origin + x-real-ip 검증\nRate Limiting: IP당 30요청/분\n자동 재시도: 3회 지터 백오프 + Retry-After\nARI 자동 전환: 노아 엔진 장애 시 대체 엔진으로 전환" },
];

// ============================================================
// PART 3 — Core sections (EN)
// ============================================================

const EN_SECTIONS: DocSection[] = [
  { id: "start", title: "1. Getting Started", content: "Access: https://ehsu.app\n\nBYOK (Bring Your Own Key) — Free\n7 providers: Gemini(free, recommended) / OpenAI / Claude / Groq(free) / Mistral / Ollama(local) / LM Studio(local)\n'Get Key' link in API modal for instant signup\nAPI keys encrypted with AES-GCM v4\n\n3 ways to start:\n1. Quick Start: Genre + one-line prompt → auto-generate world+characters+scene\n2. Manual Setup: World → Characters → Rulebook → Writing step by step\n3. Try Demo: Explore all features with a pre-built story\n\nAuto-save: 500ms debounce + IndexedDB 10min backup + Google Drive sync\nFirestore cloud sync available (CLOUD_SYNC flag)" },
  { id: "world", title: "2. World", content: "Design civilizations, factions, and relationships.\n60 genre presets (regression, hunter, wuxia, romance-fantasy, etc.)\nTension curve chart (per-episode visualization)\nUp to 500 episodes\nPlatform presets: Munpia / Novelpia / KakaoPage / Series\n\nPRISM-MODE content rating: OFF / FREE / ALL / T15 / M18\nWorld Simulator: Civilization relationship visualization + EH Engine 9-level rates" },
  { id: "character", title: "3. Characters", content: "Create characters: name, role, traits, narrative potential (DNA)\n\n3-Tier Story Framework (directly in creation form):\n- Desire: What the character wants\n- Deficiency: What they lack or lost\n- Conflict: The core struggle\n\nAdditional: personality, speech style, dialogue example, change arc, values, strength, weakness, backstory\nCharacter relationship graph\nNOA auto-generation (hero/villain/ally/extra)" },
  { id: "rulebook", title: "4. Rulebook", content: "4-card dashboard:\n1. Story Structure: Plot, tension curve, pacing\n2. Scene Direction: Goguma(tension) / Cider(release), hooks, cliffs, transitions\n3. Character & Emotion: Emotion arc, dialogue tone, canon rules\n4. Foreshadow & Notes: Plot thread tracking, writer memos\n\nClick card → enter editor\nStudio Suggest: Auto-fill 9 fields at once" },
  { id: "writing", title: "5. Writing", content: "5 modes (only 2 shown without API key):\n- Write (default): Type directly. Ctrl+Shift+R for inline rewrite\n- Generate: Enter prompt → NOA generates scenes\n- 3-Step: Structure → Draft → Polish\n- Refine: Auto-improve weak paragraphs (score <50)\n- Engine: Direct parameter control\n\nReal-time quality analysis (NOD gauge):\n- Per-paragraph 0~100 score (show/tell, repetition, variety, density, dialogue)\n\nContinuity check:\n- Character name typos, trait conflicts, time/genre contradictions\n\nInline rewrite:\n- Select text → Rewrite/Expand/Compress/Tone\n- Context-aware (genre + characters + surrounding ±200 chars)\n\nUndo: 50 levels (rewrite-specific)\nVersion history: Auto-snapshot at 300+ char changes + diff view\nReference panel: Side panel for character/world reference while writing" },
  { id: "style", title: "6. Style", content: "Style tab in dock\n4 DNA types: Hard SF / Web Novel / Literary / Multi-Genre\n5 sliders: Sentence length / Emotion density / Description / POV / Vocabulary\nStyle lab: Preview after applying presets" },
  { id: "manuscript", title: "7. Manuscript", content: "3 modes:\n① Edit: Scene timeline + reorder\n② Radio: Character voice narration\n③ Visual Novel: Full scene rendering\n\nExport: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\nTranslation: Built-in translation panel (6-axis scoring)\nNetwork share: Publish to EH Network\nAuthor dashboard: Emotion arc chart + fatigue detection" },
  { id: "engine", title: "8. Engine", content: "ANS 10.0 (Adaptive Narrative System)\nQuality check: 6-dimension evaluation (grade/director/EOS/tension/naturalness/red-tag)\nAuto-retry: 3 attempts + jittered backoff + Retry-After header\nToken budget: Warns when system prompt exceeds 30%\nCharacter truncation warning at 20+\n\n60 genre presets\nGoguma/Cider structurization → auto-injected into prompts\nCreativity default 0.9" },
  { id: "keyboard", title: "9. Shortcuts", content: "Ctrl+Shift+R: Inline rewrite selected text\nCtrl+Z: Undo (50-level rewrite stack)\nCtrl+Y / Ctrl+Shift+Z: Redo\n\nZen mode: UI auto-hides when textarea focused\nESC: Close modals/popups" },
  { id: "local", title: "10. Local Engine", content: "Ollama / LM Studio supported\nAuto-proxied via /api/local-proxy on localhost\n\nSetup:\n1. LM Studio: Launch → Download model → Local Server → Start → URL: http://localhost:1234\n2. Ollama: ollama pull gemma2 → ollama serve → URL: http://localhost:11434\n\nLocal GPU (DGX Spark): Gemma 4 26B/4B, EXAONE 32B supported\n\nNote: Local engine unavailable on Vercel (ehsu.app). Localhost only." },
  { id: "save", title: "11. Save & Sync", content: "Auto-save: 500ms debounce → localStorage\nIndexedDB backup: Every 10 minutes (up to 5 versions)\nbeforeunload emergency save\nGoogle Drive sync: Manual trigger (2-hour reminder)\nFirestore cloud: CLOUD_SYNC flag for auto 3s debounced sync\n\nExport: EPUB 3.0 / DOCX / TXT / JSON + 3 more formats\nImport: JSON project file import" },
  { id: "security", title: "12. Security", content: "API keys: AES-GCM v4 encryption (browser)\nCSP + HSTS + X-Frame-Options (next.config.ts headers)\nCSRF: Origin + x-real-ip validation\nRate Limiting: 30 req/min per IP\nRetry: 3 attempts + jittered backoff + Retry-After\nARI circuit breaker: Auto-failover on provider outage" },
];

// ============================================================
// PART 4 — Core sections (JP)
// ============================================================

const JP_SECTIONS: DocSection[] = [
  { id: "start", title: "1. はじめに", content: "アクセス: https://ehsu.app\n\nBYOK — 無料\n7つのプロバイダー: Gemini(無料推奨) / OpenAI / Claude / Groq(無料) / Mistral / Ollama / LM Studio\nAPIモーダルから「キー発行」リンクで即時登録可能\n\n3つの開始方法:\n1. クイックスタート: ジャンル+一行プロンプト → 世界観+キャラ+初シーン自動生成\n2. 手動設定: 世界観 → キャラクター → 設定集 → 執筆\n3. デモ体験: サンプル作品で全機能を体験\n\n自動保存: 500ms + IndexedDB 10分バックアップ + Google Drive同期" },
  { id: "world", title: "2. 世界観", content: "60ジャンルプリセット\nテンションカーブチャート\n最大500話\nPRISM-MODE: OFF / FREE / ALL / T15 / M18\n世界観シミュレーター: 文明関係可視化 + EHエンジン9段階" },
  { id: "character", title: "3. キャラクター", content: "3階層物語フレームワーク（作成フォームから直接入力）:\n- 欲望: キャラクターが求めるもの\n- 欠乏: 不足しているもの\n- 葛藤: 物語の核心的な対立\n\nキャラクター関係図の可視化\nNOA自動生成（主人公/悪役/協力者/その他）" },
  { id: "rulebook", title: "4. 設定集", content: "4カードダッシュボード:\n1. 物語構造 2. 演出 3. キャラ・感情 4. 伏線・メモ\nカードクリック → エディタ\nスタジオ提案: 9フィールド同時自動生成" },
  { id: "writing", title: "5. 執筆", content: "5モード: 執筆 / NOA生成 / 3段階 / リファイン / エンジン\nリアルタイム品質分析（NODゲージ）\n連続性チェック: 名前の誤字・特性矛盾・時間帯/ジャンル矛盾\nインラインリライト: Ctrl+Shift+R\nUndo 50段階 / バージョンdiff" },
  { id: "style", title: "6. 文体", content: "4種DNA / 5スライダー / スタイルプリセット\n文体実験室" },
  { id: "manuscript", title: "7. 原稿", content: "3モード: ①編集 ②ラジオ ③ビジュアルノベル\nエクスポート: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\n翻訳パネル内蔵（6軸採点）" },
  { id: "engine", title: "8. エンジン", content: "ANS 10.0\n品質ゲート: 6次元評価\nリトライ: 3回ジッターバックオフ + Retry-After\n60ジャンルプリセット" },
  { id: "keyboard", title: "9. ショートカット", content: "Ctrl+Shift+R: インラインリライト\nCtrl+Z: Undo (50段階)\nCtrl+Y: Redo\nZenモード: テキストエリアフォーカスでUI自動非表示" },
  { id: "local", title: "10. ローカルエンジン", content: "Ollama / LM Studio対応\nローカルGPU: Gemma 4 26B/4B, EXAONE 32B対応\n\n⚠️ Vercel環境ではローカルエンジン不可" },
  { id: "save", title: "11. 保存・同期", content: "自動保存 500ms + IndexedDB 10分バックアップ\nGoogle Drive同期\nFirestoreクラウド（CLOUD_SYNC）" },
  { id: "security", title: "12. セキュリティ", content: "AES-GCM v4暗号化\nCSP + HSTS + X-Frame-Options\nCSRF防御 / レートリミット: IP毎30リクエスト/分" },
];

// ============================================================
// PART 5 — Core sections (CN)
// ============================================================

const CN_SECTIONS: DocSection[] = [
  { id: "start", title: "1. 入门", content: "访问: https://ehsu.app\n\nBYOK — 免费\n7个提供商: Gemini(免费推荐) / OpenAI / Claude / Groq(免费) / Mistral / Ollama / LM Studio\nAPI模态框中\"获取密钥\"链接可直接注册\n\n3种开始方式:\n1. 快速开始: 类型+一行提示 → 自动生成世界观+角色+首场景\n2. 手动设置: 世界观 → 角色 → 设定集 → 写作\n3. 演示体验: 用示例作品探索全部功能\n\n自动保存: 500ms + IndexedDB 10分钟备份 + Google Drive同步" },
  { id: "world", title: "2. 世界观", content: "60种类型预设\n张力曲线图\n最多500集\nPRISM-MODE: OFF / FREE / ALL / T15 / M18\n世界观模拟器: 文明关系可视化 + EH引擎9级" },
  { id: "character", title: "3. 角色", content: "3层叙事框架（创建表单中直接输入）:\n- 欲望: 角色想要的\n- 缺陷: 缺少或失去的\n- 冲突: 故事中的核心对抗\n\n角色关系图可视化\nNOA自动生成（主角/反派/助手/其他）" },
  { id: "rulebook", title: "4. 设定集", content: "4张卡片仪表板:\n1. 故事结构 2. 场景导演 3. 角色·情感 4. 伏笔·备注\n点击卡片 → 进入编辑器\n工作室建议: 9个字段同时自动填充" },
  { id: "writing", title: "5. 写作", content: "5种模式: 写作 / NOA生成 / 3步 / 润色 / 引擎\n实时质量分析（NOD仪表）\n连续性检查: 名字错别字·特性矛盾·时间/类型矛盾\n行内重写: Ctrl+Shift+R\nUndo 50级 / 版本diff" },
  { id: "style", title: "6. 文体", content: "4种DNA / 5个滑块 / 风格预设\n文体实验室" },
  { id: "manuscript", title: "7. 稿件", content: "3种模式: ①编辑 ②广播剧 ③视觉小说\n导出: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\n内置翻译面板（6轴评分）" },
  { id: "engine", title: "8. 引擎", content: "ANS 10.0\n质量门: 6维评估\n重试: 3次抖动退避 + Retry-After\n60种类型预设" },
  { id: "keyboard", title: "9. 快捷键", content: "Ctrl+Shift+R: 行内重写\nCtrl+Z: 撤销 (50级)\nCtrl+Y: 重做\nZen模式: 文本区域聚焦时UI自动隐藏" },
  { id: "local", title: "10. 本地AI", content: "Ollama / LM Studio支持\n本地GPU: Gemma 4 26B/4B, EXAONE 32B支持\n\n⚠️ Vercel环境下本地AI不可用" },
  { id: "save", title: "11. 保存·同步", content: "自动保存 500ms + IndexedDB 10分钟备份\nGoogle Drive同步\nFirestore云端（CLOUD_SYNC）" },
  { id: "security", title: "12. 安全", content: "AES-GCM v4加密\nCSP + HSTS + X-Frame-Options\nCSRF防御 / 速率限制: 每IP 30请求/分钟" },
];

// ============================================================
// PART 6 — Polish sections (KO) — 13~19: 새로 추가된 7개 기능
// ============================================================

const KO_POLISH: DocSection[] = [
  { id: "search", title: "13. 전역 검색 팔레트 (Ctrl+K)", content: "캐릭터·에피소드·세계관·본문·명령을 한 곳에서 검색·실행.\n\n단축키:\n- Ctrl+K / Cmd+K — 팔레트 열기\n- ↑ ↓ — 결과 이동\n- Enter — 선택 항목 실행\n- Tab — 카테고리 필터 순환\n- Escape — 닫기\n\n6개 카테고리:\n- All: 전체 검색\n- Character: 캐릭터 이름·특성·역할\n- Episode: 에피소드 제목\n- World: 세계관 19개 필드\n- Text: 원고 본문 전체 (스니펫 하이라이트)\n- Action: 12개 명령 실행 (새 에피소드·내보내기·번역 등)\n\n사용 팁:\n- 2자 이상 입력 시 본문 검색 활성\n- Action 검색은 쿼리 없이 전체 노출\n- 결과는 카테고리별 그룹핑되어 한눈에 파악 가능\n- 최근 사용 명령이 상단 우선 노출" },
  { id: "outline", title: "14. 아웃라인 패널 (씬 구조 트리)", content: "원고를 씬·메시지 단위 트리로 조망하는 우측 패널.\n\n여는 방법:\n- 독(Dock) 상단의 '아웃라인' 버튼 클릭\n- 모바일에서는 상태바 아이콘으로 토글\n\n주요 기능:\n- 씬 클릭 → 에디터가 해당 위치로 스크롤\n- 씬 제목 인라인 편집 (더블클릭)\n- 드래그 앤 드롭으로 씬 순서 변경\n\n3-way 필터:\n- both: 씬 + AI 생성 메시지 모두 표시\n- scenes: 사용자 작성 씬만\n- messages: AI 생성 로그만\n\n인라인 검색:\n- 패널 상단 검색창으로 씬 제목 즉시 필터링\n- 2자 이상 입력 시 하이라이트 적용\n\n사용 팁:\n- 긴 원고 (50씬+)는 필터를 'scenes'로 두면 탐색 속도 개선\n- 씬 우클릭 메뉴로 삭제·복제·이동 가능" },
  { id: "breadcrumbs", title: "15. 경로 표시 (Breadcrumbs)", content: "현재 작업 위치를 상단에 명확히 표시.\n\n구조:\nProject > Episode > Scene > [단락]\n\n각 항목 클릭 동작:\n- Project — 대시보드로 복귀\n- Episode — 에피소드 탐색기 열기\n- Scene — 아웃라인 패널에서 해당 씬 하이라이트\n- [단락] — 에디터 내 해당 단락 스크롤\n\n모바일 축약 패턴:\n- 너비가 부족하면 중간 항목을 '...'로 축약\n- 축약 '...' 탭 시 드롭다운으로 전체 경로 노출\n- 최상위와 현재 위치는 항상 노출 유지\n\n접근성:\n- 키보드 ←/→로 항목 간 포커스 이동\n- 각 항목에 aria-current 속성 부여\n\n사용 팁:\n- 긴 제목은 마우스 호버로 전체 제목 툴팁 노출\n- 변경 경로가 있는 경우 점(dot) 인디케이터 표시" },
  { id: "rename", title: "16. 일괄 이름 변경 (Ctrl+Shift+H)", content: "캐릭터/용어/고유명사를 원고 전체에서 안전하게 교체.\n\n여는 방법:\n- Ctrl+Shift+H (Cmd+Shift+H) — 일괄 변경 모달\n- 독의 'Rename' 버튼\n\n범위 3종:\n- session: 현재 열린 에피소드만\n- project: 프로젝트 내 모든 에피소드\n- all: 모든 프로젝트 (주의: 과감한 변경)\n\nPreview → Apply 플로우:\n1. 찾을 단어·바꿀 단어 입력\n2. Preview 클릭 → 매칭된 N개 위치 목록 표시\n3. 개별 체크박스로 특정 위치 제외 가능\n4. Apply 클릭 → 선택된 위치에만 적용\n\nUndo 백업 경로:\n- 변경 전 원본은 IndexedDB의 rename-backup 버킷에 자동 저장\n- 최근 10개 변경 세션 유지\n- 설정 > 백업에서 수동 복원 가능\n\n옵션:\n- 특수문자 매칭: 정규식 특수문자 자동 이스케이프\n- 대소문자 구분: 영문 대소문자 매칭 제어\n- 전체 단어: 부분 매칭 방지 (예: '김' 검색 시 '김민수'는 매칭 안 함)\n\n사용 팁:\n- 영문 이름 교체 시 '대소문자 구분' 켜기 권장\n- 2자 미만 단어는 Preview 필수 (오매치 방지)" },
  { id: "minimap", title: "17. 에디터 미니맵", content: "원고 전체를 에디터 우측에 축소 렌더링하여 빠른 탐색 제공.\n\n토글 방법:\n- 상태바의 '미니맵' 버튼 클릭\n- 설정 > 에디터 > 미니맵 표시 체크\n\n품질 색상 해석:\n- green: 품질 점수 70점 이상 문단 (견고)\n- amber: 40~70점 (개선 여지)\n- red: 40점 미만 (리라이트 권장)\n- gray: 미분석 문단\n\n네비게이션:\n- 드래그: 미니맵의 뷰포트 박스를 끌어 스크롤\n- 클릭: 해당 위치로 즉시 점프\n- 키보드: Alt+↑/↓로 문단 단위 이동\n\n현재 뷰포트:\n- 투명 하이라이트 박스로 현재 화면 영역 표시\n- 드래그로 박스를 이동해 스크롤 동기화\n\n모바일 숨김 안내:\n- 화면 폭 < 1024px에서는 자동 숨김\n- 모바일은 아웃라인 패널이 대체 네비게이션 역할\n\n사용 팁:\n- 긴 원고(2만 자+) 탐색에 특히 유용\n- 빨간 영역이 군집된 구간을 집중 리라이트 타겟으로 삼으면 효율 상승" },
  { id: "profiler", title: "18. 작품 분석 (Work Profiler)", content: "프로젝트 단위 품질·페이싱 통계를 4개 탭으로 시각화.\n\n접근 경로:\n- 독 > History 탭 > BarChart3 아이콘 버튼\n- 단축 경로: Ctrl+K에서 'profiler' 검색\n\n4개 섹션:\n1. 긴장도(Tension): 에피소드별 텐션 곡선. 과도한 고구마/사이다 구간 감지\n2. 품질(Quality): 문단 평균 점수 히스토그램. 상위/하위 10% 분포\n3. 히트맵(Heatmap): 요일·시간대별 집필량. 작업 리듬 파악\n4. 씬밀도(Scene Density): 에피소드당 씬 수 + 평균 길이. 페이싱 밸런스\n\n기간 필터:\n- all: 전체 기간\n- last10: 최근 10개 에피소드\n- last30: 최근 30일\n\nCSV 내보내기:\n- 각 섹션 우측 상단 '내보내기' 버튼\n- 데이터를 엑셀·Google Sheets에서 재분석 가능\n- 파일명: profiler-{section}-{YYYYMMDD}.csv\n\n사용 팁:\n- 연재 초반 10화 긴장도 패턴이 성공 지표\n- 품질 히스토그램의 좌측 꼬리가 두꺼우면 리파인 필요\n- 히트맵은 장기 연재의 번아웃 감지에 유용" },
  { id: "marketplace", title: "19. 플러그인 마켓플레이스 (Beta)", content: "스튜디오 기능을 확장하는 플러그인 저장소.\n\n접근 경로:\n- 설정 > 플러그인 탭\n- Ctrl+K > 'marketplace' 검색\n\n3개 번들 플러그인:\n1. Genre Pack Korean: 한국 웹소설 10개 장르 추가 프리셋\n2. Canon Guard: 설정 모순 실시간 알림 (캐릭터 눈동자 색 등)\n3. Export+: EPUB 폰트 임베딩·ePub3.2 지원 강화\n\n권한 모델:\n- read:project — 프로젝트 데이터 조회만\n- write:episode — 에피소드 수정 권한\n- network:external — 외부 API 호출 (사용자 명시 승인 필수)\n- storage:indexeddb — 로컬 저장소 접근\n\n설치 플로우:\n1. 플러그인 카드 클릭 → 권한 요청 목록 확인\n2. '설치' 버튼 → 권한별 승인 다이얼로그\n3. 모든 권한 승인 시 즉시 활성화\n\n외부 플러그인 Coming Soon:\n- v1.5에서 서드파티 제출 공개 예정\n- 현재는 번들 플러그인 3종만 설치 가능\n- 서드파티는 코드 샌드박스(iframe)에서 격리 실행 예정\n\n사용 팁:\n- Canon Guard는 장편 연재의 설정 관리에 필수적\n- 플러그인 비활성은 설정 토글로 즉시 반영\n- 충돌 발견 시 'Safe Mode'로 모든 플러그인 일시 정지" },
];

// ============================================================
// PART 7 — Polish sections (EN)
// ============================================================

const EN_POLISH: DocSection[] = [
  { id: "search", title: "13. Global Search Palette (Ctrl+K)", content: "Search and execute across characters, episodes, world, text, and commands in one place.\n\nShortcuts:\n- Ctrl+K / Cmd+K — Open palette\n- ↑ ↓ — Navigate results\n- Enter — Run selected item\n- Tab — Cycle category filter\n- Escape — Close\n\n6 categories:\n- All: Search everything\n- Character: Names, traits, roles\n- Episode: Episode titles\n- World: 19 world-building fields\n- Text: Full manuscript body (with snippet highlighting)\n- Action: 12 commands (new episode, export, translate, etc.)\n\nTips:\n- Text search activates at 2+ characters\n- Action search shows all items even without a query\n- Results are grouped by category for quick scanning\n- Recently used commands surface at the top" },
  { id: "outline", title: "14. Outline Panel (Scene Tree)", content: "A right-side panel that shows the manuscript as a scene/message tree.\n\nHow to open:\n- Click 'Outline' on the dock\n- Toggle via the status bar icon on mobile\n\nKey features:\n- Click a scene → editor scrolls to that position\n- Double-click title to rename inline\n- Drag and drop to reorder scenes\n\n3-way filter:\n- both: Scenes + AI-generated messages\n- scenes: User-written scenes only\n- messages: AI generation logs only\n\nInline search:\n- Search box at the top filters scene titles instantly\n- Highlight applied at 2+ characters\n\nTips:\n- For long manuscripts (50+ scenes), set filter to 'scenes' for faster navigation\n- Right-click a scene for delete/duplicate/move actions" },
  { id: "breadcrumbs", title: "15. Breadcrumbs", content: "Clearly displays your current location at the top.\n\nStructure:\nProject > Episode > Scene > [Paragraph]\n\nClick behavior:\n- Project — Return to dashboard\n- Episode — Open episode explorer\n- Scene — Highlight the scene in outline panel\n- [Paragraph] — Scroll to that paragraph in editor\n\nMobile truncation:\n- Middle items collapse to '...' when width is limited\n- Tap '...' to reveal full path as dropdown\n- Root and current item always visible\n\nAccessibility:\n- Arrow keys (←/→) move focus between items\n- aria-current attribute on each item\n\nTips:\n- Hover over a long title for a full tooltip\n- Dot indicator appears when the path has pending changes" },
  { id: "rename", title: "16. Bulk Rename (Ctrl+Shift+H)", content: "Safely replace character names, terms, and proper nouns across the manuscript.\n\nHow to open:\n- Ctrl+Shift+H (Cmd+Shift+H) — Bulk rename modal\n- 'Rename' button on the dock\n\n3 scopes:\n- session: Currently open episode only\n- project: All episodes in this project\n- all: All projects (warning: aggressive)\n\nPreview → Apply flow:\n1. Enter find and replace terms\n2. Click Preview → see N matched locations\n3. Uncheck specific matches to exclude them\n4. Click Apply → replace only selected matches\n\nUndo backup path:\n- Original text auto-saved to IndexedDB rename-backup bucket\n- Keeps the last 10 rename sessions\n- Manual restore available at Settings > Backup\n\nOptions:\n- Special chars: Auto-escapes regex metacharacters\n- Case sensitive: Controls letter case matching (English)\n- Whole word: Prevents partial matches (e.g., 'cat' won't match 'concatenate')\n\nTips:\n- Enable 'case sensitive' when replacing English names\n- Always Preview for terms under 2 characters (avoids mismatches)" },
  { id: "minimap", title: "17. Editor Minimap", content: "A scaled-down rendering of the full manuscript at the right edge of the editor.\n\nHow to toggle:\n- Click 'Minimap' on the status bar\n- Settings > Editor > Show Minimap\n\nQuality color meaning:\n- green: Paragraphs with quality score 70+ (solid)\n- amber: 40~70 (room to improve)\n- red: Below 40 (rewrite recommended)\n- gray: Unanalyzed paragraph\n\nNavigation:\n- Drag: Move the viewport box to scroll\n- Click: Jump to that position instantly\n- Keyboard: Alt+↑/↓ for paragraph-step move\n\nCurrent viewport:\n- A translucent highlight box shows the visible region\n- Drag the box to sync scroll\n\nMobile visibility:\n- Auto-hidden at widths < 1024px\n- The outline panel serves as alternate navigation on mobile\n\nTips:\n- Especially useful for long manuscripts (20k+ chars)\n- Target clusters of red bars first for maximum quality lift" },
  { id: "profiler", title: "18. Work Profiler", content: "Visualize project-level quality and pacing stats across 4 tabs.\n\nHow to access:\n- Dock > History tab > BarChart3 icon button\n- Quick path: Ctrl+K and search 'profiler'\n\n4 sections:\n1. Tension: Per-episode tension curve. Detects excessive buildup/release\n2. Quality: Paragraph score histogram. Top/bottom 10% distribution\n3. Heatmap: Writing volume by day/hour. Reveals your rhythm\n4. Scene Density: Scenes per episode + average length. Pacing balance\n\nDate filter:\n- all: Entire history\n- last10: Last 10 episodes\n- last30: Last 30 days\n\nCSV export:\n- 'Export' button at top-right of each section\n- Re-analyze data in Excel or Google Sheets\n- Filename: profiler-{section}-{YYYYMMDD}.csv\n\nTips:\n- First 10-episode tension pattern often predicts success\n- A heavy left tail in quality histogram signals need for refining\n- Heatmap helps detect burnout during long serializations" },
  { id: "marketplace", title: "19. Plugin Marketplace (Beta)", content: "Extensions to expand studio capabilities.\n\nHow to access:\n- Settings > Plugins tab\n- Ctrl+K and search 'marketplace'\n\n3 bundled plugins:\n1. Genre Pack Korean: 10 Korean web-novel genre presets\n2. Canon Guard: Real-time contradiction alerts (e.g., character eye color)\n3. Export+: EPUB font embedding + enhanced ePub3.2 support\n\nPermission model:\n- read:project — Read project data only\n- write:episode — Modify episodes\n- network:external — Call external APIs (explicit user approval required)\n- storage:indexeddb — Access local storage\n\nInstall flow:\n1. Click plugin card → review permission requests\n2. Click 'Install' → per-permission approval dialog\n3. Activates immediately when all permissions are approved\n\nThird-party plugins Coming Soon:\n- v1.5 will open third-party submissions\n- Only the 3 bundled plugins are installable today\n- Third-party plugins will run in an iframe code sandbox for isolation\n\nTips:\n- Canon Guard is essential for long-running series with complex lore\n- Plugin toggles reflect immediately\n- 'Safe Mode' halts all plugins at once if conflicts arise" },
];

// ============================================================
// PART 8 — Polish sections (JP)
// ============================================================

const JP_POLISH: DocSection[] = [
  { id: "search", title: "13. グローバル検索パレット (Ctrl+K)", content: "キャラクター・エピソード・世界観・本文・コマンドを一箇所から検索・実行できます。\n\nショートカット:\n- Ctrl+K / Cmd+K — パレットを開く\n- ↑ ↓ — 結果を移動\n- Enter — 選択項目を実行\n- Tab — カテゴリフィルタを切り替え\n- Escape — 閉じる\n\n6つのカテゴリ:\n- All: 全体検索\n- Character: キャラクター名・特性・役割\n- Episode: エピソードタイトル\n- World: 世界観19フィールド\n- Text: 原稿本文全体（スニペットハイライト付き）\n- Action: 12個のコマンド実行（新規エピソード・エクスポート・翻訳など）\n\n使い方のヒント:\n- 2文字以上入力で本文検索が有効になります\n- Actionはクエリなしでも全項目が表示されます\n- 結果はカテゴリ別にグループ化されて一目で把握できます\n- 最近使ったコマンドが上位に表示されます" },
  { id: "outline", title: "14. アウトラインパネル（シーン構造ツリー）", content: "原稿をシーン・メッセージ単位のツリーとして一望できる右側パネルです。\n\n開き方:\n- ドック上部の「アウトライン」ボタンをクリック\n- モバイルではステータスバーのアイコンで切り替え\n\n主な機能:\n- シーンをクリック → エディタが該当位置へスクロール\n- タイトルをダブルクリックでインライン編集\n- ドラッグ＆ドロップでシーン順序を変更\n\n3種のフィルタ:\n- both: シーン + AI生成メッセージの両方\n- scenes: ユーザーが書いたシーンのみ\n- messages: AI生成ログのみ\n\nインライン検索:\n- パネル上部の検索ボックスでシーン名を即座にフィルタ\n- 2文字以上でハイライト表示\n\nヒント:\n- 長い原稿（50シーン以上）はフィルタを「scenes」にすると探索が速くなります\n- シーンの右クリックメニューから削除・複製・移動が可能です" },
  { id: "breadcrumbs", title: "15. パンくずリスト（経路表示）", content: "現在の作業位置を上部に明確に表示します。\n\n構造:\nProject > Episode > Scene > [段落]\n\n各項目のクリック動作:\n- Project — ダッシュボードに戻る\n- Episode — エピソードエクスプローラを開く\n- Scene — アウトラインパネルで該当シーンをハイライト\n- [段落] — エディタ内の該当段落へスクロール\n\nモバイルでの省略パターン:\n- 幅が不足する場合、中間項目が「...」で省略されます\n- 「...」をタップすると全経路がドロップダウンで表示されます\n- 最上位と現在位置は常に表示されます\n\nアクセシビリティ:\n- キーボード ←/→ で項目間のフォーカス移動\n- 各項目に aria-current 属性を付与\n\nヒント:\n- 長いタイトルはマウスオーバーで完全なタイトルがツールチップ表示されます\n- 未保存の変更がある場合はドットインジケータが表示されます" },
  { id: "rename", title: "16. 一括リネーム (Ctrl+Shift+H)", content: "キャラクター・用語・固有名詞を原稿全体で安全に置換します。\n\n開き方:\n- Ctrl+Shift+H（Cmd+Shift+H）— 一括リネームモーダル\n- ドックの「Rename」ボタン\n\n3種の範囲:\n- session: 現在開いているエピソードのみ\n- project: プロジェクト内の全エピソード\n- all: 全プロジェクト（注意: 大規模な変更）\n\nPreview → Apply フロー:\n1. 検索語と置換語を入力\n2. Preview をクリック → マッチしたN箇所のリストが表示\n3. 個別チェックボックスで特定の位置を除外可能\n4. Apply をクリック → 選択した位置のみ置換\n\nUndoバックアップ経路:\n- 変更前の原文は IndexedDB の rename-backup バケットに自動保存されます\n- 最新10セッションを保持\n- 設定 > バックアップ から手動復元可能\n\nオプション:\n- 特殊文字: 正規表現メタ文字を自動エスケープ\n- 大文字小文字区別: 英字の大小マッチング制御\n- 完全一致: 部分マッチを防止（例:「猫」検索で「猫耳」はマッチしない）\n\nヒント:\n- 英語名を置換する際は「大文字小文字区別」を有効にすることをお勧めします\n- 2文字未満の語は必ず Preview を確認してください（誤マッチ防止）" },
  { id: "minimap", title: "17. エディタミニマップ", content: "原稿全体をエディタ右端に縮小レンダリングし、素早い移動を可能にします。\n\n切り替え方法:\n- ステータスバーの「ミニマップ」ボタンをクリック\n- 設定 > エディタ > ミニマップ表示にチェック\n\n品質の色の意味:\n- green: 品質スコア 70点以上の段落（堅実）\n- amber: 40〜70点（改善の余地あり）\n- red: 40点未満（リライト推奨）\n- gray: 未分析の段落\n\nナビゲーション:\n- ドラッグ: ビューポートボックスを動かしてスクロール\n- クリック: 該当位置へ即座にジャンプ\n- キーボード: Alt+↑/↓ で段落単位の移動\n\n現在のビューポート:\n- 半透明のハイライトボックスが現在の表示領域を示します\n- ボックスをドラッグするとスクロールが同期します\n\nモバイルでの非表示:\n- 画面幅 < 1024px では自動的に非表示\n- モバイルではアウトラインパネルが代替ナビゲーションとして機能\n\nヒント:\n- 長い原稿（2万文字以上）の探索に特に便利です\n- 赤い領域が密集する区間を集中リライトの対象にすると効率的です" },
  { id: "profiler", title: "18. 作品分析 (Work Profiler)", content: "プロジェクト単位の品質・ペーシング統計を4タブで可視化します。\n\nアクセス経路:\n- ドック > History タブ > BarChart3 アイコンボタン\n- ショートカット: Ctrl+K で 'profiler' を検索\n\n4つのセクション:\n1. 緊張度 (Tension): エピソード別テンション曲線。過度な緊張/解放を検出\n2. 品質 (Quality): 段落平均スコアのヒストグラム。上位/下位10%の分布\n3. ヒートマップ (Heatmap): 曜日・時間帯別の執筆量。作業リズムを把握\n4. シーン密度 (Scene Density): エピソードあたりのシーン数 + 平均長。ペーシングバランス\n\n期間フィルタ:\n- all: 全期間\n- last10: 直近10エピソード\n- last30: 直近30日\n\nCSVエクスポート:\n- 各セクション右上の「エクスポート」ボタン\n- Excel や Google Sheets でデータを再分析可能\n- ファイル名: profiler-{section}-{YYYYMMDD}.csv\n\nヒント:\n- 連載序盤10話のテンションパターンが成功の指標になりやすいです\n- 品質ヒストグラムの左側の裾が厚いとリファインが必要です\n- ヒートマップは長期連載のバーンアウト検出に役立ちます" },
  { id: "marketplace", title: "19. プラグインマーケットプレイス (Beta)", content: "スタジオ機能を拡張するプラグインストアです。\n\nアクセス経路:\n- 設定 > プラグイン タブ\n- Ctrl+K で 'marketplace' を検索\n\n3つのバンドルプラグイン:\n1. Genre Pack Korean: 韓国ウェブ小説10ジャンルの追加プリセット\n2. Canon Guard: 設定矛盾のリアルタイム通知（キャラの瞳の色など）\n3. Export+: EPUBフォント埋め込み・ePub3.2対応強化\n\n権限モデル:\n- read:project — プロジェクトデータの読み取りのみ\n- write:episode — エピソードの変更権限\n- network:external — 外部API呼び出し（ユーザーの明示承認が必須）\n- storage:indexeddb — ローカルストレージへのアクセス\n\nインストールフロー:\n1. プラグインカードをクリック → 権限要求リストを確認\n2. 「インストール」ボタン → 権限ごとの承認ダイアログ\n3. 全権限の承認で即座に有効化\n\nサードパーティプラグイン Coming Soon:\n- v1.5 で外部開発者の提出を公開予定\n- 現在はバンドルプラグイン3種のみインストール可能\n- サードパーティはコードサンドボックス（iframe）で隔離実行予定\n\nヒント:\n- Canon Guard は複雑な設定を持つ長編連載に必須です\n- プラグインの有効/無効はトグル操作で即時反映されます\n- 衝突が発生した場合は「Safe Mode」で全プラグインを一時停止できます" },
];

// ============================================================
// PART 9 — Polish sections (CN)
// ============================================================

const CN_POLISH: DocSection[] = [
  { id: "search", title: "13. 全局搜索面板 (Ctrl+K)", content: "在一处搜索并执行角色·剧集·世界观·正文·命令。\n\n快捷键:\n- Ctrl+K / Cmd+K — 打开面板\n- ↑ ↓ — 结果移动\n- Enter — 执行所选项\n- Tab — 切换分类过滤\n- Escape — 关闭\n\n6个分类:\n- All: 全部搜索\n- Character: 角色名称·特性·身份\n- Episode: 剧集标题\n- World: 世界观19个字段\n- Text: 稿件正文全文（片段高亮）\n- Action: 12项命令（新建剧集·导出·翻译等）\n\n使用提示:\n- 输入2字以上启用正文搜索\n- Action搜索即使无查询也全部显示\n- 结果按分类分组便于快速浏览\n- 最近使用的命令优先显示在顶部" },
  { id: "outline", title: "14. 大纲面板（场景结构树）", content: "以场景·消息为单位将稿件显示为树形结构的右侧面板。\n\n打开方式:\n- 点击 Dock 顶部的「大纲」按钮\n- 移动端通过状态栏图标切换\n\n主要功能:\n- 点击场景 → 编辑器滚动至对应位置\n- 双击标题可内联重命名\n- 拖拽排序场景顺序\n\n3种过滤:\n- both: 场景 + AI生成消息\n- scenes: 仅用户所写场景\n- messages: 仅AI生成日志\n\n内联搜索:\n- 面板顶部搜索框即时过滤场景标题\n- 输入2字以上自动高亮\n\n提示:\n- 长稿件（50场景以上）将过滤设为 scenes 可加快浏览\n- 右键场景可删除·复制·移动" },
  { id: "breadcrumbs", title: "15. 路径显示（面包屑）", content: "在顶部清晰显示当前工作位置。\n\n结构:\nProject > Episode > Scene > [段落]\n\n点击行为:\n- Project — 返回仪表盘\n- Episode — 打开剧集浏览器\n- Scene — 在大纲面板高亮对应场景\n- [段落] — 在编辑器中滚动到该段\n\n移动端省略模式:\n- 宽度不足时中间项折叠为「...」\n- 点击「...」弹出下拉菜单显示完整路径\n- 顶层和当前位置始终可见\n\n无障碍:\n- 键盘 ←/→ 在项目间移动焦点\n- 每个项目设置 aria-current 属性\n\n提示:\n- 鼠标悬停长标题可查看完整标题提示\n- 有待保存更改时会显示圆点指示" },
  { id: "rename", title: "16. 批量重命名 (Ctrl+Shift+H)", content: "在整个稿件中安全替换角色名·术语·专有名词。\n\n打开方式:\n- Ctrl+Shift+H (Cmd+Shift+H) — 批量重命名弹窗\n- Dock 中的「Rename」按钮\n\n3种范围:\n- session: 仅当前打开的剧集\n- project: 当前项目的所有剧集\n- all: 所有项目（注意: 大范围修改）\n\nPreview → Apply 流程:\n1. 输入查找词和替换词\n2. 点击 Preview → 显示匹配的N处位置\n3. 通过复选框排除特定位置\n4. 点击 Apply → 仅替换所选位置\n\n撤销备份路径:\n- 修改前原文自动保存到 IndexedDB 的 rename-backup 存储桶\n- 保留最近10次重命名会话\n- 设置 > 备份 中可手动恢复\n\n选项:\n- 特殊字符: 自动转义正则元字符\n- 区分大小写: 控制英文字母大小写匹配\n- 全字匹配: 防止部分匹配（如搜「猫」不匹配「猫咪」）\n\n提示:\n- 替换英文名时建议启用「区分大小写」\n- 2字以下的词必须先 Preview（避免误匹配）" },
  { id: "minimap", title: "17. 编辑器迷你地图", content: "在编辑器右侧以缩小方式渲染整个稿件，提供快速导航。\n\n切换方式:\n- 点击状态栏的「迷你地图」按钮\n- 设置 > 编辑器 > 显示迷你地图\n\n质量色彩含义:\n- green: 质量评分70分以上的段落（稳固）\n- amber: 40-70分（有改进空间）\n- red: 40分以下（建议重写）\n- gray: 未分析的段落\n\n导航:\n- 拖拽: 移动视口框进行滚动\n- 点击: 立即跳转到该位置\n- 键盘: Alt+↑/↓ 按段落移动\n\n当前视口:\n- 半透明高亮框显示当前可见区域\n- 拖动框可同步滚动\n\n移动端隐藏:\n- 屏幕宽度 < 1024px 时自动隐藏\n- 移动端由大纲面板承担备用导航\n\n提示:\n- 长稿件（2万字以上）浏览特别有用\n- 集中优先重写红色聚集区域能获得最大质量提升" },
  { id: "profiler", title: "18. 作品分析 (Work Profiler)", content: "通过4个标签可视化项目级质量与节奏统计。\n\n访问路径:\n- Dock > History 标签 > BarChart3 图标按钮\n- 快捷路径: Ctrl+K 搜索 'profiler'\n\n4个板块:\n1. 张力 (Tension): 每集张力曲线。检测过度紧张/释放区段\n2. 质量 (Quality): 段落平均评分直方图。前/后10%分布\n3. 热力图 (Heatmap): 按星期·时段的写作量。把握节奏\n4. 场景密度 (Scene Density): 每集场景数 + 平均长度。节奏平衡\n\n时间过滤:\n- all: 全部时间\n- last10: 最近10集\n- last30: 最近30天\n\nCSV导出:\n- 各板块右上角的「导出」按钮\n- 可在 Excel 或 Google Sheets 中重新分析数据\n- 文件名: profiler-{section}-{YYYYMMDD}.csv\n\n提示:\n- 连载前10话的张力模式往往预示成败\n- 质量直方图左尾厚说明需要润色\n- 热力图有助于在长期连载中发现倦怠" },
  { id: "marketplace", title: "19. 插件市场 (Beta)", content: "扩展工作室能力的插件商店。\n\n访问路径:\n- 设置 > 插件 标签\n- Ctrl+K 搜索 'marketplace'\n\n3个预置插件:\n1. Genre Pack Korean: 10种韩国网文类型预设\n2. Canon Guard: 设定矛盾实时提醒（如角色瞳色）\n3. Export+: EPUB字体嵌入·增强 ePub3.2 支持\n\n权限模型:\n- read:project — 仅读取项目数据\n- write:episode — 修改剧集\n- network:external — 调用外部API（需用户明示同意）\n- storage:indexeddb — 访问本地存储\n\n安装流程:\n1. 点击插件卡片 → 审阅权限请求列表\n2. 点击「安装」 → 按权限弹出授权对话框\n3. 所有权限通过后立即激活\n\n第三方插件 Coming Soon:\n- v1.5 将开放第三方提交\n- 当前仅可安装3种预置插件\n- 第三方插件将在代码沙盒（iframe）中隔离运行\n\n提示:\n- Canon Guard 对设定复杂的长篇连载必不可少\n- 插件开/关可通过切换立即生效\n- 出现冲突时可使用「Safe Mode」一键暂停全部插件" },
];

// ============================================================
// PART 10 — Section assembly per language
// ============================================================

const SECTIONS: Record<AppLanguage, DocSection[]> = {
  KO: [...KO_SECTIONS, ...KO_POLISH],
  EN: [...EN_SECTIONS, ...EN_POLISH],
  JP: [...JP_SECTIONS, ...JP_POLISH],
  CN: [...CN_SECTIONS, ...CN_POLISH],
};

// ============================================================
// PART 11 — Component
// ============================================================

export default function StudioDocsView({ lang }: Props) {
  const language = normalizeLang(lang);
  const t = createT(language);
  const secs = SECTIONS[language] ?? SECTIONS.KO;
  const [activeId, setActiveId] = useState(secs[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    secs.forEach(s => {
      const el = document.getElementById(`doc-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [secs]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* TOC sidebar */}
        <aside className="lg:w-48 shrink-0">
          <div className="lg:sticky lg:top-20">
            <h2 className="font-mono text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">
              {t('docs.contents')}
            </h2>
            <nav className="space-y-0.5" role="navigation" aria-label="Docs table of contents">
              {secs.map(s => (
                <a key={s.id} href={`#doc-${s.id}`}
                  className={`block py-1.5 px-2.5 rounded text-xs transition-colors font-mono ${
                    activeId === s.id
                      ? "text-accent-purple bg-accent-purple/10 font-bold border-l-2 border-accent-purple"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}>
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-widest text-accent-purple border border-accent-purple/30 rounded font-mono mb-2">
              v1.4.0
            </span>
            <h1 className="font-mono text-3xl font-black tracking-tight mb-1">
              NOA Studio {t('docs.userGuide')}
            </h1>
            <p className="text-text-tertiary text-sm">{t('docs.subtitle')}</p>
          </div>

          <div className="space-y-10">
            {secs.map(s => (
              <section key={s.id} id={`doc-${s.id}`}>
                <h2 className="font-mono text-xl font-bold tracking-tight mb-4 text-text-primary border-l-2 border-accent-purple pl-4">
                  {s.title}
                </h2>
                <div className="text-base text-text-secondary leading-relaxed whitespace-pre-line pl-4">
                  {s.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
