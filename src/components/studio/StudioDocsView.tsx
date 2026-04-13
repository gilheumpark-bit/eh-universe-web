"use client";

import { useState, useEffect } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { createT } from "@/lib/i18n";

// ============================================================
// PART 1 — Types & section data
// ============================================================

interface Props {
  lang: string;
}

interface DocSection {
  id: string;
  title: string;
  content: string;
}

const SECTIONS: Record<AppLanguage, DocSection[]> = {
  KO: [
    { id: "start", title: "1. 시작하기", content: "접속: https://ehsu.app\n\nBYOK (Bring Your Own Key) — 무료\n7개 프로바이더: Gemini(무료 추천) / OpenAI / Claude / Groq(무료) / Mistral / Ollama(로컬) / LM Studio(로컬)\nAPI 키 모달에서 '키 발급' 링크로 바로 가입 가능\nAPI 키는 AES-GCM v4로 암호화 저장\n\n시작 방법 3가지:\n1. 쾌속 시작: 장르+한 줄 프롬프트 → 세계관+캐릭터+첫 장면 자동 생성 (API 키 필요)\n2. 직접 설정: 세계관 → 캐릭터 → 연출 → 집필 순서로 하나씩\n3. 데모 체험: 미리 만들어진 소설로 전체 기능 탐색\n\n저장: 자동 저장(500ms) + IndexedDB 10분 백업 + Google Drive 동기화\nFirestore 클라우드 동기화 (CLOUD_SYNC 플래그 활성화 시)" },
    { id: "world", title: "2. 세계관", content: "세계관 탭에서 문명/세력/관계를 설계합니다.\n장르 프리셋 60개 (회귀/빙의/헌터/무협/로맨스판타지 등 한국 웹소설 특화)\n텐션 커브 차트 (회차별 긴장도 시각화)\n총 회차 최대 500화\n플랫폼 프리셋: 문피아 / 노벨피아 / 카카오 / 시리즈\n\nPRISM-MODE 콘텐츠 등급: OFF / FREE / ALL / T15 / M18\n세계관 시뮬레이터: 문명 관계 시각화 + EH 엔진 9단계 적용률" },
    { id: "character", title: "3. 캐릭터", content: "캐릭터 생성: 이름, 역할, 특성, 서사 잠재력(DNA) 입력\n\n3-Tier 서사 프레임워크 (생성 폼에서 직접 입력 가능):\n- 욕망: 이 캐릭터가 원하는 것\n- 결핍: 부족하거나 잃은 것\n- 갈등: 이야기 속 충돌\n\n추가 필드: 성격, 말투, 대사 예시, 변화 방향, 가치관, 강점, 약점, 배경\n캐릭터 관계도 시각화\nNOA 자동 생성 (배역별 분류: 주인공/악당/조력자/기타)" },
    { id: "rulebook", title: "4. 연출 (Direction)", content: "4개 카드 대시보드:\n1. 이야기 구조: 플롯, 텐션 곡선, 분량 배분\n2. 장면 연출: 고구마(답답)·사이다(통쾌), 훅, 클리프, 전환\n3. 캐릭터·감정: 감정선, 대사 톤, 캐논 규칙\n4. 복선·메모: 떡밥 관리, 작가 메모장\n\n씬시트: 장면별 등장인물, 톤, 핵심 대사, 감정 포인트 설계\n카드 클릭 → 해당 편집기 진입\n집필 탭 분할뷰에서 실시간 연출 조정 가능" },
    { id: "writing", title: "5. 집필", content: "5가지 모드 (API 키 없으면 2개만 표시):\n- 집필 (기본): 직접 타이핑. Ctrl+Shift+R로 인라인 리라이트\n- NOA 생성: 프롬프트 입력 → NOA가 장면 생성\n- 3단계: 구조 → 초안 → 다듬기\n- 다듬기: 약한 문단(점수 50 미만) 자동 개선\n- 엔진: 파라미터 직접 제어\n\n실시간 품질 분석 (NOD 게이지):\n- 문단별 0~100점 (show/tell, 반복어, 문장 다양성, 밀도, 대사 비율)\n\n연속성 검사:\n- 캐릭터 이름 오타, 특성 모순, 시간대/장르 모순 실시간 감지\n\n인라인 리라이트:\n- 텍스트 선택 → 리라이트/확장/축소/톤변경\n- 문맥 인식 (장르+캐릭터+주변 ±200자 자동 주입)\n\nUndo 스택: 50단계 (리라이트 전용)\n버전 히스토리: 300자+ 변경 시 자동 스냅샷 + diff 뷰\n참조 패널: 왼쪽 사이드에서 인물/세계관 참조하며 집필" },
    { id: "style", title: "6. 문체", content: "문체 탭 → 독에서 '문체' 클릭\n4가지 DNA: 하드SF / 웹소설 / 문학 / 멀티장르\n5개 슬라이더: 문장길이 / 감정밀도 / 묘사방식 / 서술시점 / 어휘수준\n문체 실험실: 스타일 프리셋 적용 후 미리보기" },
    { id: "manuscript", title: "7. 원고", content: "3가지 모드:\n① 편집: 장면 타임라인 + 씬 재배치\n② 라디오: 캐릭터 음성으로 원고 낭독\n③ 비주얼 노벨: 전체 장면 렌더링\n\n내보내기: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\n번역: 내장 번역 패널 (소설 전용 6축 채점)\n네트워크 공유: EH Network에 원고 게시\n작가 대시보드: 감정 아크 차트 + 피로도 감지" },
    { id: "engine", title: "8. 엔진", content: "ANS 10.0 (Adaptive Narrative System)\n품질 게이트: 6차원 평가 (등급/감독점수/EOS/텐션/자연스러움/레드태그)\n재시도: 3회 지터 백오프 + Retry-After 헤더 연동\n토큰 버짓: 시스템 프롬프트 30% 초과 시 경고\n캐릭터 20명 초과 시 절삭 경고\n\n60개 장르 프리셋: 회귀/빙의/헌터/무협 등\n고구마/사이다 구조화 → 프롬프트 자동 주입\nTemperature 기본값 0.9" },
    { id: "keyboard", title: "9. 단축키", content: "Ctrl+Shift+R: 선택 텍스트 인라인 리라이트\nCtrl+Z: Undo (인라인 리라이트 전용 50단계)\nCtrl+Y / Ctrl+Shift+Z: Redo\n\n집필 모드에서 Zen 모드: textarea 포커스 시 UI 자동 숨김\nESC: 모달/팝업 닫기" },
    { id: "local", title: "10. 로컬 엔진", content: "Ollama / LM Studio 지원\nlocalhost에서 /api/local-proxy로 자동 프록시\n\n설정:\n1. LM Studio: 실행 → 모델 다운 → Local Server → Start → URL: http://localhost:1234\n2. Ollama: ollama pull gemma2 → ollama serve → URL: http://localhost:11434\n\nDGX Spark 등 로컬 GPU: Gemma 4 26B/4B, EXAONE 32B 사용 가능\n\n주의: Vercel(ehsu.app) 배포 환경에서는 로컬 엔진 불가. localhost만 가능." },
    { id: "save", title: "11. 저장·동기화", content: "자동 저장: 500ms 디바운스 → localStorage\nIndexedDB 백업: 10분 간격 버전 백업 (최대 5개)\nbeforeunload 비상 저장: 페이지 닫을 때 동기 저장\nGoogle Drive 동기화: 수동 트리거 (2시간 리마인더)\nFirestore 클라우드: CLOUD_SYNC 플래그 활성 시 3초 디바운스 자동 동기화\n\n내보내기: EPUB 3.0 / DOCX / TXT / JSON 등 7종\n불러오기: JSON 프로젝트 파일 임포트" },
    { id: "security", title: "12. 보안", content: "API 키: AES-GCM v4 암호화 (브라우저)\nCSP + HSTS + X-Frame-Options (next.config.ts headers)\nCSRF: Origin + x-real-ip 검증\nRate Limiting: IP당 30요청/분\n재시도: 3회 지터 백오프 + Retry-After\nARI 회로 차단기: 프로바이더 장애 시 자동 전환" },
  ],
  EN: [
    { id: "start", title: "1. Getting Started", content: "Access: https://ehsu.app\n\nBYOK (Bring Your Own Key) — Free\n7 providers: Gemini(free, recommended) / OpenAI / Claude / Groq(free) / Mistral / Ollama(local) / LM Studio(local)\n'Get Key' link in API modal for instant signup\nAPI keys encrypted with AES-GCM v4\n\n3 ways to start:\n1. Quick Start: Genre + one-line prompt → auto-generate world+characters+scene\n2. Manual Setup: World → Characters → Rulebook → Writing step by step\n3. Try Demo: Explore all features with a pre-built story\n\nAuto-save: 500ms debounce + IndexedDB 10min backup + Google Drive sync\nFirestore cloud sync available (CLOUD_SYNC flag)" },
    { id: "world", title: "2. World", content: "Design civilizations, factions, and relationships.\n60 genre presets (regression, hunter, wuxia, romance-fantasy, etc.)\nTension curve chart (per-episode visualization)\nUp to 500 episodes\nPlatform presets: Munpia / Novelpia / KakaoPage / Series\n\nPRISM-MODE content rating: OFF / FREE / ALL / T15 / M18\nWorld Simulator: Civilization relationship visualization + EH Engine 9-level rates" },
    { id: "character", title: "3. Characters", content: "Create characters: name, role, traits, narrative potential (DNA)\n\n3-Tier Story Framework (directly in creation form):\n- Desire: What the character wants\n- Deficiency: What they lack or lost\n- Conflict: The core struggle\n\nAdditional: personality, speech style, dialogue example, change arc, values, strength, weakness, backstory\nCharacter relationship graph\nNOA auto-generation (hero/villain/ally/extra)" },
    { id: "rulebook", title: "4. Rulebook", content: "4-card dashboard:\n1. Story Structure: Plot, tension curve, pacing\n2. Scene Direction: Goguma(tension) / Cider(release), hooks, cliffs, transitions\n3. Character & Emotion: Emotion arc, dialogue tone, canon rules\n4. Foreshadow & Notes: Plot thread tracking, writer memos\n\nClick card → enter editor\nStudio Suggest: Auto-fill 9 fields at once" },
    { id: "writing", title: "5. Writing", content: "5 modes (only 2 shown without API key):\n- Write (default): Type directly. Ctrl+Shift+R for inline rewrite\n- Generate: Enter prompt → NOA generates scenes\n- 3-Step: Structure → Draft → Polish\n- Refine: Auto-improve weak paragraphs (score <50)\n- Engine: Direct parameter control\n\nReal-time quality analysis (NOD gauge):\n- Per-paragraph 0~100 score (show/tell, repetition, variety, density, dialogue)\n\nContinuity check:\n- Character name typos, trait conflicts, time/genre contradictions\n\nInline rewrite:\n- Select text → Rewrite/Expand/Compress/Tone\n- Context-aware (genre + characters + surrounding ±200 chars)\n\nUndo: 50 levels (rewrite-specific)\nVersion history: Auto-snapshot at 300+ char changes + diff view\nReference panel: Side panel for character/world reference while writing" },
    { id: "style", title: "6. Style", content: "Style tab in dock\n4 DNA types: Hard SF / Web Novel / Literary / Multi-Genre\n5 sliders: Sentence length / Emotion density / Description / POV / Vocabulary\nStyle lab: Preview after applying presets" },
    { id: "manuscript", title: "7. Manuscript", content: "3 modes:\n① Edit: Scene timeline + reorder\n② Radio: Character voice narration\n③ Visual Novel: Full scene rendering\n\nExport: EPUB 3.0 / DOCX / TXT / MD / JSON / HTML / CSV\nTranslation: Built-in translation panel (6-axis scoring)\nNetwork share: Publish to EH Network\nAuthor dashboard: Emotion arc chart + fatigue detection" },
    { id: "engine", title: "8. Engine", content: "ANS 10.0 (Adaptive Narrative System)\nQuality gate: 6-dimension evaluation (grade/director/EOS/tension/naturalness/red-tag)\nRetry: 3 attempts + jittered backoff + Retry-After header\nToken budget: Warns when system prompt exceeds 30%\nCharacter truncation warning at 20+\n\n60 genre presets\nGoguma/Cider structurization → auto-injected into prompts\nTemperature default 0.9" },
    { id: "keyboard", title: "9. Shortcuts", content: "Ctrl+Shift+R: Inline rewrite selected text\nCtrl+Z: Undo (50-level rewrite stack)\nCtrl+Y / Ctrl+Shift+Z: Redo\n\nZen mode: UI auto-hides when textarea focused\nESC: Close modals/popups" },
    { id: "local", title: "10. Local Engine", content: "Ollama / LM Studio supported\nAuto-proxied via /api/local-proxy on localhost\n\nSetup:\n1. LM Studio: Launch → Download model → Local Server → Start → URL: http://localhost:1234\n2. Ollama: ollama pull gemma2 → ollama serve → URL: http://localhost:11434\n\nLocal GPU (DGX Spark): Gemma 4 26B/4B, EXAONE 32B supported\n\nNote: Local engine unavailable on Vercel (ehsu.app). Localhost only." },
    { id: "save", title: "11. Save & Sync", content: "Auto-save: 500ms debounce → localStorage\nIndexedDB backup: Every 10 minutes (up to 5 versions)\nbeforeunload emergency save\nGoogle Drive sync: Manual trigger (2-hour reminder)\nFirestore cloud: CLOUD_SYNC flag for auto 3s debounced sync\n\nExport: EPUB 3.0 / DOCX / TXT / JSON + 3 more formats\nImport: JSON project file import" },
    { id: "security", title: "12. Security", content: "API keys: AES-GCM v4 encryption (browser)\nCSP + HSTS + X-Frame-Options (next.config.ts headers)\nCSRF: Origin + x-real-ip validation\nRate Limiting: 30 req/min per IP\nRetry: 3 attempts + jittered backoff + Retry-After\nARI circuit breaker: Auto-failover on provider outage" },
  ],
  JP: [
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
  ],
  CN: [
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
  ],
};

// ============================================================
// PART 2 — Component
// ============================================================

export default function StudioDocsView({ lang }: Props) {
  const language = (lang === "ko" || lang === "KO" ? "KO" : lang === "JP" ? "JP" : lang === "CN" ? "CN" : "EN") as AppLanguage;
  const t = createT(language);
  const secs = SECTIONS[language] ?? SECTIONS.KO;
  const [activeId, setActiveId] = useState(secs[0].id);

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
            <nav className="space-y-0.5">
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
