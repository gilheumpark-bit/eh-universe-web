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
    { id: "start", title: "1. 시작하기", content: "접속: https://eh-universe-web.vercel.app\n\nBYOK (Bring Your Own Key)\n7개 AI 프로바이더 지원: Gemini / OpenAI / Claude / Groq / Mistral / Ollama(로컬) / LM Studio(로컬)\n커스텀 모델 직접 입력 가능\nAPI 키는 브라우저에 암호화 저장 (XOR+Base64)\n\n프로젝트 생성: 제목 입력 → AI 초기 설정 제안\n쾌속 시작: 장르 선택 → 원클릭 세계관+캐릭터+첫 장면 자동 생성\n\n온보딩 가이드 투어 (5단계)\n처음 접속 시 자동 시작. 세계관 → 캐릭터 → 연출 → 집필 → 내보내기\n\n데모 모드: API 키 없이 샘플 소설로 전체 워크플로우 체험\nGoogle 로그인 + Drive 동기화 (AES-GCM 암호화)" },
    { id: "world", title: "2. 세계관 설계", content: "7개 장르 × 2 프리셋 = 14개 시나리오\n시놉시스, 캐릭터, 시대 배경 설정\n텐션 커브 차트 (회차별 긴장도 시각화)\n\n총 회차 최대 500화 (에피소드 클램핑 적용)\n플랫폼 프리셋 4종: 문피아 / 노벨피아 / 카카오 / 시리즈\n\nPRISM-MODE 콘텐츠 등급\n간단 모드에서 바로 선택 가능: OFF / FREE / ALL / T15 / M18\n고급 모드에서 수위 세부 조절 (폭력/성적/언어/약물/공포)\n\nNOL AI 채팅: 세계관 전문 AI 어시스턴트" },
    { id: "simulator", title: "3. 세계관 시뮬레이터", content: "장르별 완성도 검사 (장르 레벨 ~ 언어 생성까지 전 필드 자동 채움)\n문명/세력 관계 시각화 + 헥스 맵\n\nEH 엔진 9단계 적용률\n미적용(0%) → 먼치킨(15%) → 로맨스(25%) → 아카데미(35%) → 헌터(50%) → 회귀(65%) → 다크(75%) → 디스토피아(90%) → 풀EH(100%)\n\n장르 선택 시 권장 적용률 자동 설정" },
    { id: "character", title: "4. 캐릭터 스튜디오", content: "캐릭터 관계도 시각화\n3-Tier 프레임워크: 뼈대 / 작동 / 디테일\nAI 캐릭터 자동 생성 (배역별 자동 분류: 주인공/악당/조력자/기타)\n배역 드롭다운으로 직접 조정 가능\n\nNOC AI 채팅: 캐릭터 전문 AI 어시스턴트" },
    { id: "direction", title: "5. 연출 스튜디오", content: "13개 탭: 플롯 / 텐션 / 페이싱 / 고구마 / 훅 / 클리프 / 도파민 / 전환 / 감정 / 대화 / 캐논 / 복선 / 메모\n4종 플롯 구조: 3막 / 영웅여정 / 기승전결 / 피히텐\n\nAI 자동 생성: 9개 필드 동시 채움 (훅/텐션/클리프/감정/대화톤/복선/도파민/페이싱/텐션커브)\n에피소드 씬시트 저장/조회" },
    { id: "writing", title: "6. 집필 스튜디오", content: "5가지 모드: 초안 생성 / 글쓰기 / 3단계 작성 / AUTO 30% / 정밀 집필\n3패스 캔버스: 초고 → 구조 검증 → 문체 수정\n인라인 리라이터 (텍스트 선택 → AI 교체)\n\nEngine Report 인라인 표시 (Grade / Tension / Pacing / Immersion / EOS)\n자동 수정 버튼\nNOD 감독 실시간 분석\n오타 감지 (자동 집계)\n\n원고에 반영: 편집 내용을 원고 히스토리에 저장\n내보내기 완료 Toast 알림\n\nNOW AI 채팅" },
    { id: "style", title: "7. 문체 스튜디오", content: "진입: 소설 스튜디오 `/studio` → 상단에서 문체 탭(`?tab=style`). 별도 `/tools/style-studio` 랜딩은 없습니다(레거시 URL은 스튜디오로 리다이렉트).\n\n4가지 DNA: 하드SF / 웹소설 / 문학 / 멀티장르\n5개 슬라이더: 문장길이 / 감정밀도 / 묘사방식 / 서술시점 / 어휘수준\n10개 스타일 프리셋\n문체 실험실\n\nNOE AI 채팅" },
    { id: "manuscript", title: "8. 원고 관리", content: "회차별 원고 저장\n챕터 분석: 인물 상태 / 배경 / 씬 분석 / 소리 / 이미지 프롬프트 / 음악 프롬프트 AI 자동 추출\n\n내보내기 6종: EPUB / DOCX / TXT / JSON / Backup / 불러오기\n진행률 대시보드\n세이브 슬롯: config 전체 저장/완전 복원" },
    { id: "engine", title: "9. 엔진 시스템", content: "ANS 10.0 엔진\nEH 엔진 9단계 장르별 적용률\n대가 승수 공식: costMultiplier = max(0, (R-25)/75)\n모듈별 활성화 임계값\n\n가드레일 수치 주입: 문자수(min/max), 대화비율, 텐션, 긴장도 전부 AI 프롬프트에 적용\nTemperature 기본값 0.9 (소설 창작 최적화)\n\nAdaptiveLearner: NOD 감독 오탐 자동 보정\nSession EMA: 장편 맥락 지수이동평균 추적" },
    { id: "local", title: "10. 로컬 LLM", content: "Ollama / LM Studio 지원\nlocalhost 환경에서 사설 IP 프록시 자동 경유 (/api/local-proxy)\nChrome PNA(Private Network Access) 자동 우회\n\n설정 방법:\n▸ LM Studio: 실행 → 모델 다운로드 → Local Server → Start → URL: http://localhost:1234\n▸ Ollama: ollama pull llama3.2 → ollama serve → URL: http://localhost:11434\n\n⚠️ Vercel 배포 환경에서는 사설 IP 접근 불가. localhost(npm run dev)에서만 사용 가능" },
    { id: "security", title: "11. 보안", content: "API 키 암호화 저장 (XOR + Base64 + 브라우저 핑거프린트)\nDrive 동기화 AES-GCM 암호화 (UID 기반)\nPRISM 서버 가드: ALL 모드일 때 서버에서도 콘텐츠 필터링\nCSRF 방어: Origin + x-real-ip 검증\nRate Limiting: IP당 30요청/분\n500 에러 자동 재시도 (서버+클라이언트 2중 지수 백오프)" },
    { id: "common", title: "12. 공통 기능", content: "자동 저장 (localStorage + IndexedDB 백업)\n마지막 저장 시각 표시 (\"방금\" / \"N초 전\")\nGoogle Drive 동기화\n4개국어 (KO / EN / JP / CN)\n가이드/자유 모드 전환\n내보내기/계정 영역 접기 가능\nWCAG AA 접근성\n단축키 지원\n한국어 IME 안정성 (조합 중 Enter 방지)" },
  ],
  EN: [
    { id: "start", title: "1. Getting Started", content: "Access: https://eh-universe-web.vercel.app\n\nBYOK (Bring Your Own Key)\n7 AI providers: Gemini / OpenAI / Claude / Groq / Mistral / Ollama(local) / LM Studio(local)\nCustom model input supported\nAPI keys encrypted in browser (XOR+Base64)\n\nProject creation: Enter title → AI suggests initial settings\nQuick Start: Pick genre → one-click world+characters+first scene\n\nOnboarding Guide Tour (5 steps)\nDemo Mode: Full workflow with sample data, no API key needed\nGoogle Login + Drive Sync (AES-GCM encrypted)" },
    { id: "world", title: "2. World Design", content: "7 genres × 2 presets = 14 scenarios\nSynopsis, characters, era settings\nTension curve chart\n\nUp to 500 episodes (clamped)\n4 Platform Presets: Munpia / Novelpia / KakaoPage / Series\n\nPRISM-MODE Content Rating\nSimple mode: OFF / FREE / ALL / T15 / M18\nAdvanced: Fine-tune violence/sexual/language/substance/horror\n\nNOL AI Chat: World design assistant" },
    { id: "simulator", title: "3. World Simulator", content: "Genre completeness check (all fields auto-filled)\nCivilization/faction visualization + hex map\n\nEH Engine 9-Level Rate\nOff(0%) → Munchkin(15%) → Romance(25%) → Academy(35%) → Hunter(50%) → Regression(65%) → Dark(75%) → Dystopia(90%) → Full EH(100%)" },
    { id: "character", title: "4. Character Studio", content: "Character relationship map\n3-Tier Framework: Skeleton / Mechanics / Detail\nAI character generation (auto-categorized: hero/villain/ally/extra)\nRole adjustable via dropdown\n\nNOC AI Chat: Character design assistant" },
    { id: "direction", title: "5. Direction Studio", content: "13 tabs: Plot / Tension / Pacing / Goguma / Hook / Cliff / Dopamine / Transition / Emotion / Dialogue / Canon / Foreshadow / Notes\nAI auto-generate: 9 fields at once\n4 plot structures: 3-Act / Hero's Journey / Kishotenketsu / Fichtean\n\nEpisode scene sheet save/view" },
    { id: "writing", title: "6. Writing Studio", content: "5 modes: Draft / Write / 3-Step / AUTO 30% / Precision\n3-pass canvas: Draft → Structure → Style\nInline rewriter\n\nEngine Report inline (Grade / Tension / Pacing / Immersion / EOS)\nNOD Director real-time analysis\nTypo detection\nExport completion Toast\n\nNOW AI Chat" },
    { id: "style", title: "7. Style Studio", content: "Open from Novel Studio `/studio` → Style tab (`?tab=style`). There is no standalone `/tools/style-studio` product page (legacy URL redirects into the studio).\n\n4 DNA types: Hard SF / Web Novel / Literary / Multi-Genre\n5 sliders: Sentence length / Emotion density / Description / POV / Vocabulary\n10 style presets\nStyle lab\n\nNOE AI Chat" },
    { id: "manuscript", title: "8. Manuscript", content: "Per-episode manuscript storage\nChapter Analysis: AI extracts characters/background/scenes/sound/image prompts/music prompts\n\nExport 6 formats: EPUB / DOCX / TXT / JSON / Backup / Import\nSave slots: Full config save/restore" },
    { id: "engine", title: "9. Engine System", content: "ANS 10.0 Engine\nGuardrail injection: char count, dialogue ratio, tension all applied to AI prompt\nTemperature default 0.9 (optimized for fiction)\n\nAdaptiveLearner: Auto-adjust NOD false positives\nSession EMA: Long-form context tracking" },
    { id: "local", title: "10. Local LLM", content: "Ollama / LM Studio supported\nAuto-proxied via /api/local-proxy on localhost\nChrome PNA auto-bypass\n\nSetup:\n▸ LM Studio: Launch → Download model → Local Server → Start → URL: http://localhost:1234\n▸ Ollama: ollama pull llama3.2 → ollama serve → URL: http://localhost:11434\n\n⚠️ Local LLM only works on localhost (npm run dev)" },
    { id: "security", title: "11. Security", content: "API key encrypted storage (XOR + Base64 + browser fingerprint)\nDrive sync AES-GCM encryption (UID-based)\nPRISM server guard: Content filtering in ALL mode\nCSRF: Origin + x-real-ip validation\nRate Limiting: 30 req/min per IP\n500 error auto-retry (dual exponential backoff)" },
    { id: "common", title: "12. Common Features", content: "Auto-save (localStorage + IndexedDB backup)\nLast save timestamp (\"just now\" / \"N sec ago\")\nGoogle Drive sync\n4 languages (KO / EN / JP / CN)\nGuided/Free mode toggle\nCollapsible export/account section\nWCAG AA accessibility\nKeyboard shortcuts\nKorean IME stability" },
  ],
  JP: [
    { id: "start", title: "1. はじめに", content: "アクセス: https://eh-universe-web.vercel.app\n\nBYOK (Bring Your Own Key)\n7つのAIプロバイダー: Gemini / OpenAI / Claude / Groq / Mistral / Ollama(ローカル) / LM Studio(ローカル)\nカスタムモデル直接入力可能\nAPIキーはブラウザに暗号化保存\n\nクイックスタート: ジャンル選択 → ワンクリックで世界観+キャラ+初シーン自動生成\nデモモード: APIキー不要で体験\nGoogleログイン + Drive同期 (AES-GCM暗号化)" },
    { id: "world", title: "2. 世界観設計", content: "7ジャンル × 2プリセット = 14シナリオ\nテンションカーブチャート\n最大500話\n\nPRISM-MODEコンテンツ等級: OFF / FREE / ALL / T15 / M18\n\nNOL AIチャット: 世界観専門AIアシスタント" },
    { id: "simulator", title: "3. 世界観シミュレーター", content: "ジャンル別完成度チェック (全フィールド自動生成)\n文明/勢力関係の可視化 + ヘックスマップ\n\nEHエンジン9段階適用率" },
    { id: "character", title: "4. キャラクタースタジオ", content: "キャラクター関係図の可視化\n3階層フレームワーク: 骨格 / 動作 / ディテール\nAIキャラクター生成 (役割自動分類: 主人公/悪役/協力者/その他)\n\nNOC AIチャット" },
    { id: "direction", title: "5. 演出スタジオ", content: "13タブ\nAI自動生成: 9フィールド同時生成\n4種プロット構造\nエピソードシーンシート保存/閲覧" },
    { id: "writing", title: "6. 執筆スタジオ", content: "5モード: 草稿生成 / 執筆 / 3段階作成 / AUTO 30% / 精密執筆\nインラインリライター\nEngine Reportインライン表示\nNOD監督リアルタイム分析\n誤字検出\n\nNOW AIチャット" },
    { id: "style", title: "7. 文体スタジオ", content: "入り口: 小説スタジオ `/studio` → 文体タブ (`?tab=style`)。独立した `/tools/style-studio` 製品ページはありません（旧URLはスタジオへリダイレクト）。\n\n4種DNA / 5スライダー / 10スタイルプリセット\n文体実験室\nNOE AIチャット" },
    { id: "manuscript", title: "8. 原稿管理", content: "チャプター分析: AI自動抽出 (人物/背景/シーン/サウンド/画像プロンプト/音楽プロンプト)\nエクスポート6種: EPUB / DOCX / TXT / JSON / Backup / インポート\nセーブスロット: 設定の完全保存/復元" },
    { id: "engine", title: "9. エンジンシステム", content: "ANS 10.0エンジン\nガードレール数値注入\nTemperatureデフォルト0.9" },
    { id: "local", title: "10. ローカルLLM", content: "Ollama / LM Studio対応\nlocalhost環境でプロキシ自動経由\n\n⚠️ Vercelデプロイ環境ではプライベートIP接続不可。localhost(npm run dev)のみ使用可能" },
    { id: "security", title: "11. セキュリティ", content: "APIキー暗号化保存\nDrive同期AES-GCM暗号化\nPRISMサーバーガード\nCSRF防御 / レートリミット: IP毎30リクエスト/分\n500エラー自動リトライ" },
    { id: "common", title: "12. 共通機能", content: "自動保存 (localStorage + IndexedDBバックアップ)\n最終保存時刻表示\nGoogle Drive同期\n4言語 (KO / EN / JP / CN)\nガイド/フリーモード切替\nWCAG AAアクセシビリティ\nキーボードショートカット" },
  ],
  CN: [
    { id: "start", title: "1. 入门", content: "访问: https://eh-universe-web.vercel.app\n\nBYOK (Bring Your Own Key)\n7个AI提供商: Gemini / OpenAI / Claude / Groq / Mistral / Ollama(本地) / LM Studio(本地)\n支持自定义模型输入\nAPI密钥加密存储\n\n快速开始: 选择类型 → 一键生成世界观+角色+首场景\n演示模式: 无需API密钥体验\nGoogle登录 + Drive同步 (AES-GCM加密)" },
    { id: "world", title: "2. 世界观设计", content: "7种类型 × 2预设 = 14种情景\n张力曲线图\n最多500集\n\nPRISM-MODE内容分级: OFF / FREE / ALL / T15 / M18\n\nNOL AI聊天: 世界观专业AI助手" },
    { id: "simulator", title: "3. 世界观模拟器", content: "各类型完成度检查 (全字段自动生成)\n文明/势力关系可视化 + 六角地图\n\nEH引擎9级应用率" },
    { id: "character", title: "4. 角色工作室", content: "角色关系图可视化\n3层框架: 骨架 / 运作 / 细节\nAI角色生成 (自动分类: 主角/反派/助手/其他)\n\nNOC AI聊天" },
    { id: "direction", title: "5. 导演工作室", content: "13个标签\nAI自动生成: 9个字段同时填充\n4种情节结构\n剧集场景表保存/查看" },
    { id: "writing", title: "6. 写作工作室", content: "5种模式: 草稿生成 / 写作 / 3步创作 / AUTO 30% / 精密写作\n行内重写器\nEngine Report行内显示\nNOD导演实时分析\n错别字检测\n\nNOW AI聊天" },
    { id: "style", title: "7. 文体工作室", content: "入口：小说工作室 `/studio` → 文体标签页 (`?tab=style`)。无独立 `/tools/style-studio` 产品页（旧链接会重定向到工作室）。\n\n4种DNA / 5个滑块 / 10种风格预设\n文体实验室\nNOE AI聊天" },
    { id: "manuscript", title: "8. 稿件管理", content: "章节分析: AI自动提取 (人物/背景/场景/声音/图像提示/音乐提示)\n导出6种: EPUB / DOCX / TXT / JSON / Backup / 导入\n存档槽: 完整配置保存/恢复" },
    { id: "engine", title: "9. 引擎系统", content: "ANS 10.0引擎\n护栏数值注入\nTemperature默认0.9" },
    { id: "local", title: "10. 本地LLM", content: "Ollama / LM Studio支持\nlocalhost环境自动代理\n\n⚠️ Vercel部署环境无法访问私有IP。仅限localhost(npm run dev)使用" },
    { id: "security", title: "11. 安全", content: "API密钥加密存储\nDrive同步AES-GCM加密\nPRISM服务器守卫\nCSRF防御 / 速率限制: 每IP 30请求/分钟\n500错误自动重试" },
    { id: "common", title: "12. 通用功能", content: "自动保存 (localStorage + IndexedDB备份)\n最后保存时间显示\nGoogle Drive同步\n4种语言 (KO / EN / JP / CN)\n引导/自由模式切换\nWCAG AA无障碍\n键盘快捷键" },
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
              v2.0
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
