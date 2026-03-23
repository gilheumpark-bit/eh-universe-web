"use client";

import { useState, useEffect } from "react";

interface Props {
  lang: string;
}

const sectionsKo = [
  { id: "start", title: "1. 시작하기", content: "접속: https://eh-universe-web.vercel.app\nBYOK: Gemini, OpenAI, Claude, Groq, Mistral 지원\n프로젝트 생성: 제목 입력 → AI 초기 설정 제안\n\n[NEW] 온보딩 가이드 투어 (5단계)\n처음 접속 시 자동 시작. 세계관 → 캐릭터 → 연출 → 집필 → 내보내기\n\n[NEW] 데모 모드\nAPI 키 없이 샘플 소설로 전체 워크플로우 체험 가능\n\nGoogle 로그인 + Drive 동기화" },
  { id: "world", title: "2. 세계관 설계", content: "7개 장르 × 2 프리셋 = 14개 시나리오\n시놉시스, 캐릭터, 시대 배경 설정\n텐션 커브 차트\n\n[NEW] 총 회차 최대 300화\n[NEW] 플랫폼 프리셋 4종: 문피아 / 노벨피아 / 카카오 / 시리즈\n\nNOL AI 채팅: 세계관 전문 AI 어시스턴트" },
  { id: "simulator", title: "3. 세계관 시뮬레이터", content: "장르별 완성도 검사\n문명/세력 관계 시각화 + 헥스 맵\n\n[NEW] EH 엔진 9단계 적용률\n미적용(0%) → 먼치킨(15%) → 로맨스(25%) → 아카데미(35%) → 헌터(50%) → 회귀(65%) → 다크(75%) → 디스토피아(90%) → 풀EH(100%)\n\n장르 선택 시 권장 적용률 자동 설정" },
  { id: "character", title: "4. 캐릭터 스튜디오", content: "캐릭터 관계도 시각화\n3-Tier 프레임워크: 뼈대 / 작동 / 디테일\nAI 캐릭터 생성\n\nNOC AI 채팅: 캐릭터 전문 AI 어시스턴트" },
  { id: "direction", title: "5. 연출 스튜디오", content: "13개 탭: 플롯 / 텐션 / 페이싱 / 고구마 / 훅 / 클리프 / 도파민 / 전환 / 감정 / 대화 / 캐논 / 복선 / 메모\n4종 플롯 구조: 3막 / 영웅여정 / 기승전결 / 피히텐\n\n[NEW] 에피소드 씬시트 저장/조회" },
  { id: "writing", title: "6. 집필 스튜디오", content: "4가지 모드: 초안 생성 / 글쓰기 / 3단계 작성 / AUTO 30%\n3패스 캔버스: 초고 → 구조 검증 → 문체 수정\n인라인 리라이터\n\n[NEW] Engine Report 인라인 표시 (Grade / Tension / Pacing / EOS)\n[NEW] 자동 수정 버튼\n[NEW] NOD 감독 실시간 분석\n[NEW] 할루시네이션 탐지\n\nNOW AI 채팅" },
  { id: "style", title: "7. 문체 스튜디오", content: "4가지 DNA: 하드SF / 웹소설 / 문학 / 멀티장르\n5개 슬라이더: 문장길이 / 감정밀도 / 묘사방식 / 서술시점 / 어휘수준\n10개 스타일 프리셋\n문체 실험실\n\nNOE AI 채팅" },
  { id: "manuscript", title: "8. 원고 관리", content: "회차별 원고 저장\n내보내기: EPUB / DOCX / TXT / JSON / HTML\n진행률 대시보드" },
  { id: "engine", title: "9. 엔진 시스템", content: "[NEW] EH 엔진 9단계 장르별 적용률\n대가 승수 공식: costMultiplier = max(0, (R-25)/75)\n모듈별 활성화 임계값 (금지어 15% / 대가 25% / 시점 45% / 문체 60% / 글리치 80% / 자격박탈 90%)\n\nAdaptiveLearner: NOD 감독 오탐 자동 보정\nSession EMA: 장편 맥락 지수이동평균 추적\nP0 보안: ReDoS 방지 / XSS 방어(rehype-sanitize) / IP 상표 필터" },
  { id: "common", title: "10. 공통 기능", content: "자동 저장 (localStorage)\nGoogle Drive 동기화\n4개국어 (KO / EN / JP / CN)\nAPI 키 배너 닫기 가능\nWCAG AA 접근성\n단축키 지원" },
];

const sectionsEn = [
  { id: "start", title: "1. Getting Started", content: "Access: https://eh-universe-web.vercel.app\nBYOK: Gemini, OpenAI, Claude, Groq, Mistral supported\nProject creation: Enter title → AI suggests initial settings\n\n[NEW] Onboarding Guide Tour (5 steps)\nAuto-starts on first visit. World → Character → Direction → Writing → Export\n\n[NEW] Demo Mode\nTry the full workflow with sample data — no API key needed\n\nGoogle Login + Drive Sync" },
  { id: "world", title: "2. World Design", content: "7 genres × 2 presets = 14 scenarios\nSynopsis, characters, era settings\nTension curve chart\n\n[NEW] Up to 300 episodes\n[NEW] 4 Platform Presets: Munpia / Novelpia / KakaoPage / Series\n\nNOL AI Chat: World design assistant" },
  { id: "simulator", title: "3. World Simulator", content: "Genre completeness check\nCivilization/faction visualization + hex map\n\n[NEW] EH Engine 9-Level Rate\nOff(0%) → Munchkin(15%) → Romance(25%) → Academy(35%) → Hunter(50%) → Regression(65%) → Dark(75%) → Dystopia(90%) → Full EH(100%)\n\nAuto-sets recommended rate by genre" },
  { id: "character", title: "4. Character Studio", content: "Character relationship map\n3-Tier Framework: Skeleton / Mechanics / Detail\nAI character generation\n\nNOC AI Chat: Character design assistant" },
  { id: "direction", title: "5. Direction Studio", content: "13 tabs: Plot / Tension / Pacing / Goguma / Hook / Cliff / Dopamine / Transition / Emotion / Dialogue / Canon / Foreshadow / Notes\n4 plot structures: 3-Act / Hero's Journey / Kishotenketsu / Fichtean\n\n[NEW] Episode scene sheet save/view" },
  { id: "writing", title: "6. Writing Studio", content: "4 modes: Draft / Write / 3-Step / AUTO 30%\n3-pass canvas: Draft → Structure → Style\nInline rewriter\n\n[NEW] Engine Report inline (Grade / Tension / Pacing / EOS)\n[NEW] Auto-fix button\n[NEW] NOD Director real-time analysis\n[NEW] Hallucination detection\n\nNOW AI Chat" },
  { id: "style", title: "7. Style Studio", content: "4 DNA types: Hard SF / Web Novel / Literary / Multi-Genre\n5 sliders: Sentence length / Emotion density / Description / POV / Vocabulary\n10 style presets\nStyle lab\n\nNOE AI Chat" },
  { id: "manuscript", title: "8. Manuscript", content: "Per-episode manuscript storage\nExport: EPUB / DOCX / TXT / JSON / HTML\nProgress dashboard" },
  { id: "engine", title: "9. Engine System", content: "[NEW] EH Engine 9-level genre-based rate\nCost multiplier: costMultiplier = max(0, (R-25)/75)\nModule activation thresholds\n\nAdaptiveLearner: Auto-adjust NOD false positives\nSession EMA: Long-form context tracking\nP0 Security: ReDoS / XSS / IP trademark filter" },
  { id: "common", title: "10. Common Features", content: "Auto-save (localStorage)\nGoogle Drive sync\n4 languages (KO / EN / JP / CN)\nDismissable API key banner\nWCAG AA accessibility\nKeyboard shortcuts" },
];

export default function StudioDocsView({ lang }: Props) {
  const isKO = lang === "ko";
  const secs = isKO ? sectionsKo : sectionsEn;
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
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">
              {isKO ? "목차" : "Contents"}
            </h2>
            <nav className="space-y-0.5">
              {secs.map(s => (
                <a key={s.id} href={`#doc-${s.id}`}
                  className={`block py-1 px-2 rounded text-[10px] transition-colors font-[family-name:var(--font-mono)] ${
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
            <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest text-accent-purple border border-accent-purple/30 rounded font-[family-name:var(--font-mono)] mb-2">
              v1.1
            </span>
            <h1 className="font-[family-name:var(--font-mono)] text-2xl font-black tracking-tight mb-1">
              NOA Studio {isKO ? "사용설명서" : "User Guide"}
            </h1>
            <p className="text-text-tertiary text-xs">{isKO ? "AI 소설 창작 워크벤치 — 전체 기능 가이드" : "AI Novel Writing Workbench — Full Feature Guide"}</p>
          </div>

          <div className="space-y-10">
            {secs.map(s => (
              <section key={s.id} id={`doc-${s.id}`}>
                <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-tight mb-3 text-text-primary border-l-2 border-accent-purple pl-3">
                  {s.title}
                </h2>
                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line pl-3">
                  {s.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('[NEW]') ? (
                        <span className="text-accent-purple font-bold">{line}</span>
                      ) : line}
                      {'\n'}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
