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
    { id: "start", title: "1. 시작하기", content: "접속: https://eh-universe-web.vercel.app\nBYOK: Gemini, OpenAI, Claude, Groq, Mistral 지원\n프로젝트 생성: 제목 입력 → AI 초기 설정 제안\n\n온보딩 가이드 투어 (5단계)\n처음 접속 시 자동 시작. 세계관 → 캐릭터 → 연출 → 집필 → 내보내기\n\n데모 모드\nAPI 키 없이 샘플 소설로 전체 워크플로우 체험 가능\n\nGoogle 로그인 + Drive 동기화" },
    { id: "world", title: "2. 세계관 설계", content: "7개 장르 × 2 프리셋 = 14개 시나리오\n시놉시스, 캐릭터, 시대 배경 설정\n텐션 커브 차트\n\n총 회차 최대 300화\n플랫폼 프리셋 4종: 문피아 / 노벨피아 / 카카오 / 시리즈\n\nNOL AI 채팅: 세계관 전문 AI 어시스턴트" },
    { id: "simulator", title: "3. 세계관 시뮬레이터", content: "장르별 완성도 검사\n문명/세력 관계 시각화 + 헥스 맵\n\nEH 엔진 9단계 적용률\n미적용(0%) → 먼치킨(15%) → 로맨스(25%) → 아카데미(35%) → 헌터(50%) → 회귀(65%) → 다크(75%) → 디스토피아(90%) → 풀EH(100%)\n\n장르 선택 시 권장 적용률 자동 설정" },
    { id: "character", title: "4. 캐릭터 스튜디오", content: "캐릭터 관계도 시각화\n3-Tier 프레임워크: 뼈대 / 작동 / 디테일\nAI 캐릭터 생성\n\nNOC AI 채팅: 캐릭터 전문 AI 어시스턴트" },
    { id: "direction", title: "5. 연출 스튜디오", content: "13개 탭: 플롯 / 텐션 / 페이싱 / 고구마 / 훅 / 클리프 / 도파민 / 전환 / 감정 / 대화 / 캐논 / 복선 / 메모\n4종 플롯 구조: 3막 / 영웅여정 / 기승전결 / 피히텐\n\n에피소드 씬시트 저장/조회" },
    { id: "writing", title: "6. 집필 스튜디오", content: "4가지 모드: 초안 생성 / 글쓰기 / 3단계 작성 / AUTO 30%\n3패스 캔버스: 초고 → 구조 검증 → 문체 수정\n인라인 리라이터\n\nEngine Report 인라인 표시 (Grade / Tension / Pacing / EOS)\n자동 수정 버튼\nNOD 감독 실시간 분석\n할루시네이션 탐지\n\nNOW AI 채팅" },
    { id: "style", title: "7. 문체 스튜디오", content: "4가지 DNA: 하드SF / 웹소설 / 문학 / 멀티장르\n5개 슬라이더: 문장길이 / 감정밀도 / 묘사방식 / 서술시점 / 어휘수준\n10개 스타일 프리셋\n문체 실험실\n\nNOE AI 채팅" },
    { id: "manuscript", title: "8. 원고 관리", content: "회차별 원고 저장\n내보내기: EPUB / DOCX / TXT / JSON / HTML\n진행률 대시보드" },
    { id: "engine", title: "9. 엔진 시스템", content: "EH 엔진 9단계 장르별 적용률\n대가 승수 공식: costMultiplier = max(0, (R-25)/75)\n모듈별 활성화 임계값 (금지어 15% / 대가 25% / 시점 45% / 문체 60% / 글리치 80% / 자격박탈 90%)\n\nAdaptiveLearner: NOD 감독 오탐 자동 보정\nSession EMA: 장편 맥락 지수이동평균 추적\nP0 보안: ReDoS 방지 / XSS 방어(rehype-sanitize) / IP 상표 필터" },
    { id: "common", title: "10. 공통 기능", content: "자동 저장 (localStorage)\nGoogle Drive 동기화\n4개국어 (KO / EN / JP / CN)\nAPI 키 배너 닫기 가능\nWCAG AA 접근성\n단축키 지원" },
  ],
  EN: [
    { id: "start", title: "1. Getting Started", content: "Access: https://eh-universe-web.vercel.app\nBYOK: Gemini, OpenAI, Claude, Groq, Mistral supported\nProject creation: Enter title → AI suggests initial settings\n\nOnboarding Guide Tour (5 steps)\nAuto-starts on first visit. World → Character → Direction → Writing → Export\n\nDemo Mode\nTry the full workflow with sample data — no API key needed\n\nGoogle Login + Drive Sync" },
    { id: "world", title: "2. World Design", content: "7 genres × 2 presets = 14 scenarios\nSynopsis, characters, era settings\nTension curve chart\n\nUp to 300 episodes\n4 Platform Presets: Munpia / Novelpia / KakaoPage / Series\n\nNOL AI Chat: World design assistant" },
    { id: "simulator", title: "3. World Simulator", content: "Genre completeness check\nCivilization/faction visualization + hex map\n\nEH Engine 9-Level Rate\nOff(0%) → Munchkin(15%) → Romance(25%) → Academy(35%) → Hunter(50%) → Regression(65%) → Dark(75%) → Dystopia(90%) → Full EH(100%)\n\nAuto-sets recommended rate by genre" },
    { id: "character", title: "4. Character Studio", content: "Character relationship map\n3-Tier Framework: Skeleton / Mechanics / Detail\nAI character generation\n\nNOC AI Chat: Character design assistant" },
    { id: "direction", title: "5. Direction Studio", content: "13 tabs: Plot / Tension / Pacing / Goguma / Hook / Cliff / Dopamine / Transition / Emotion / Dialogue / Canon / Foreshadow / Notes\n4 plot structures: 3-Act / Hero's Journey / Kishotenketsu / Fichtean\n\nEpisode scene sheet save/view" },
    { id: "writing", title: "6. Writing Studio", content: "4 modes: Draft / Write / 3-Step / AUTO 30%\n3-pass canvas: Draft → Structure → Style\nInline rewriter\n\nEngine Report inline (Grade / Tension / Pacing / EOS)\nAuto-fix button\nNOD Director real-time analysis\nHallucination detection\n\nNOW AI Chat" },
    { id: "style", title: "7. Style Studio", content: "4 DNA types: Hard SF / Web Novel / Literary / Multi-Genre\n5 sliders: Sentence length / Emotion density / Description / POV / Vocabulary\n10 style presets\nStyle lab\n\nNOE AI Chat" },
    { id: "manuscript", title: "8. Manuscript", content: "Per-episode manuscript storage\nExport: EPUB / DOCX / TXT / JSON / HTML\nProgress dashboard" },
    { id: "engine", title: "9. Engine System", content: "EH Engine 9-level genre-based rate\nCost multiplier: costMultiplier = max(0, (R-25)/75)\nModule activation thresholds\n\nAdaptiveLearner: Auto-adjust NOD false positives\nSession EMA: Long-form context tracking\nP0 Security: ReDoS / XSS / IP trademark filter" },
    { id: "common", title: "10. Common Features", content: "Auto-save (localStorage)\nGoogle Drive sync\n4 languages (KO / EN / JP / CN)\nDismissable API key banner\nWCAG AA accessibility\nKeyboard shortcuts" },
  ],
  JP: [
    { id: "start", title: "1. はじめに", content: "アクセス: https://eh-universe-web.vercel.app\nBYOK: Gemini, OpenAI, Claude, Groq, Mistral 対応\nプロジェクト作成: タイトル入力 → AI初期設定提案\n\nオンボーディングガイドツアー（5段階）\n初回アクセス時に自動開始。世界観 → キャラクター → 演出 → 執筆 → エクスポート\n\nデモモード\nAPIキー不要でサンプル小説の全ワークフロー体験可能\n\nGoogleログイン + Driveドライブ同期" },
    { id: "world", title: "2. 世界観設計", content: "7ジャンル × 2プリセット = 14シナリオ\nシノプシス、キャラクター、時代背景設定\nテンションカーブチャート\n\n最大300話\nプラットフォームプリセット4種\n\nNOL AIチャット: 世界観専門AIアシスタント" },
    { id: "simulator", title: "3. 世界観シミュレーター", content: "ジャンル別完成度チェック\n文明/勢力関係の可視化 + ヘックスマップ\n\nEHエンジン9段階適用率\nオフ(0%) → マンチキン(15%) → ロマンス(25%) → アカデミー(35%) → ハンター(50%) → 回帰(65%) → ダーク(75%) → ディストピア(90%) → フルEH(100%)\n\nジャンル選択時に推奨適用率を自動設定" },
    { id: "character", title: "4. キャラクタースタジオ", content: "キャラクター関係図の可視化\n3階層フレームワーク: 骨格 / 動作 / ディテール\nAIキャラクター生成\n\nNOC AIチャット: キャラクター専門AIアシスタント" },
    { id: "direction", title: "5. 演出スタジオ", content: "13タブ: プロット / テンション / ペーシング / ゴグマ / フック / クリフ / ドーパミン / 転換 / 感情 / 対話 / カノン / 伏線 / メモ\n4種プロット構造: 3幕 / 英雄の旅 / 起承転結 / フィヒテ\n\nエピソードシーンシート保存/閲覧" },
    { id: "writing", title: "6. 執筆スタジオ", content: "4モード: 草稿生成 / 執筆 / 3段階作成 / AUTO 30%\n3パスキャンバス: 初稿 → 構造検証 → 文体修正\nインラインリライター\n\nEngine Reportインライン表示 (Grade / Tension / Pacing / EOS)\n自動修正ボタン\nNOD監督リアルタイム分析\nハルシネーション検出\n\nNOW AIチャット" },
    { id: "style", title: "7. 文体スタジオ", content: "4種DNA: ハードSF / Web小説 / 文学 / マルチジャンル\n5スライダー: 文の長さ / 感情密度 / 描写方法 / 視点 / 語彙レベル\n10スタイルプリセット\n文体実験室\n\nNOE AIチャット" },
    { id: "manuscript", title: "8. 原稿管理", content: "エピソード別原稿保存\nエクスポート: EPUB / DOCX / TXT / JSON / HTML\n進捗ダッシュボード" },
    { id: "engine", title: "9. エンジンシステム", content: "EHエンジン9段階ジャンル別適用率\nコスト乗数: costMultiplier = max(0, (R-25)/75)\nモジュール別活性化閾値\n\nAdaptiveLearner: NOD監督の誤検知自動補正\nSession EMA: 長編コンテキスト指数移動平均追跡\nP0セキュリティ: ReDoS / XSS / IP商標フィルター" },
    { id: "common", title: "10. 共通機能", content: "自動保存 (localStorage)\nGoogle Drive同期\n4言語対応 (KO / EN / JP / CN)\nAPIキーバナー非表示可能\nWCAG AAアクセシビリティ\nキーボードショートカット" },
  ],
  CN: [
    { id: "start", title: "1. 入门", content: "访问: https://eh-universe-web.vercel.app\nBYOK: 支持 Gemini, OpenAI, Claude, Groq, Mistral\n创建项目: 输入标题 → AI建议初始设置\n\n引导教程（5步）\n首次访问时自动启动。世界观 → 角色 → 导演 → 写作 → 导出\n\n演示模式\n无需API密钥即可体验完整工作流程\n\nGoogle登录 + Drive同步" },
    { id: "world", title: "2. 世界观设计", content: "7种类型 × 2预设 = 14种情景\n大纲、角色、时代背景设定\n张力曲线图\n\n最多300集\n4种平台预设\n\nNOL AI聊天: 世界观专业AI助手" },
    { id: "simulator", title: "3. 世界观模拟器", content: "各类型完成度检查\n文明/势力关系可视化 + 六角地图\n\nEH引擎9级应用率\n关闭(0%) → 外挂(15%) → 浪漫(25%) → 学院(35%) → 猎人(50%) → 回归(65%) → 黑暗(75%) → 反乌托邦(90%) → 全EH(100%)\n\n选择类型时自动设置推荐应用率" },
    { id: "character", title: "4. 角色工作室", content: "角色关系图可视化\n3层框架: 骨架 / 运作 / 细节\nAI角色生成\n\nNOC AI聊天: 角色设计专业AI助手" },
    { id: "direction", title: "5. 导演工作室", content: "13个标签: 情节 / 张力 / 节奏 / 甘薯 / 钩子 / 悬崖 / 多巴胺 / 转换 / 情感 / 对话 / 正典 / 伏笔 / 备注\n4种情节结构: 三幕 / 英雄之旅 / 起承转合 / 菲希特\n\n剧集场景表保存/查看" },
    { id: "writing", title: "6. 写作工作室", content: "4种模式: 草稿生成 / 写作 / 3步创作 / AUTO 30%\n3遍画布: 初稿 → 结构验证 → 文体修改\n行内重写器\n\nEngine Report行内显示 (Grade / Tension / Pacing / EOS)\n自动修复按钮\nNOD导演实时分析\n幻觉检测\n\nNOW AI聊天" },
    { id: "style", title: "7. 文体工作室", content: "4种DNA: 硬科幻 / 网络小说 / 文学 / 多类型\n5个滑块: 句子长度 / 情感密度 / 描写方式 / 叙述视角 / 词汇水平\n10种风格预设\n文体实验室\n\nNOE AI聊天" },
    { id: "manuscript", title: "8. 稿件管理", content: "按集保存稿件\n导出: EPUB / DOCX / TXT / JSON / HTML\n进度仪表板" },
    { id: "engine", title: "9. 引擎系统", content: "EH引擎9级按类型应用率\n成本乘数: costMultiplier = max(0, (R-25)/75)\n模块激活阈值\n\nAdaptiveLearner: NOD导演误报自动校正\nSession EMA: 长篇上下文指数移动平均追踪\nP0安全: ReDoS / XSS / IP商标过滤" },
    { id: "common", title: "10. 通用功能", content: "自动保存 (localStorage)\nGoogle Drive同步\n4种语言 (KO / EN / JP / CN)\nAPI密钥横幅可关闭\nWCAG AA无障碍\n键盘快捷键" },
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
            <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">
              {t('docs.contents')}
            </h2>
            <nav className="space-y-0.5">
              {secs.map(s => (
                <a key={s.id} href={`#doc-${s.id}`}
                  className={`block py-1.5 px-2.5 rounded text-xs transition-colors font-[family-name:var(--font-mono)] ${
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
            <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-widest text-accent-purple border border-accent-purple/30 rounded font-[family-name:var(--font-mono)] mb-2">
              v1.1
            </span>
            <h1 className="font-[family-name:var(--font-mono)] text-3xl font-black tracking-tight mb-1">
              NOA Studio {t('docs.userGuide')}
            </h1>
            <p className="text-text-tertiary text-sm">{t('docs.subtitle')}</p>
          </div>

          <div className="space-y-10">
            {secs.map(s => (
              <section key={s.id} id={`doc-${s.id}`}>
                <h2 className="font-[family-name:var(--font-mono)] text-xl font-bold tracking-tight mb-4 text-text-primary border-l-2 border-accent-purple pl-4">
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
