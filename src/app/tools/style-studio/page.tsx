"use client";

// ============================================================
// PART 1 — 상태 및 상수 정의
// ============================================================

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

const STYLE_NAMES = [
  "건조·SF 문체",
  "감각적 묘사 강화",
  "웹소설 리듬감",
  "캐릭터 목소리 강화",
  "긴장감 압축",
] as const;

const PARAM_LABELS: Record<string, string[]> = {
  s1: ["단문 위주", "단문 선호", "균형", "장문 선호", "장문 위주"],
  s2: ["극도로 건조", "건조·분석적", "균형", "감성적", "매우 감성적"],
  s3: ["직접 서술", "직접 선호", "균형", "이미지 선호", "감각적 이미지"],
  s4: ["전지적 관찰", "전지적 선호", "균형", "인물 밀착", "극밀착 내면"],
  s5: ["구어체", "평이함", "중간", "전문적·정밀", "고도 전문"],
};

interface SliderDef {
  id: string;
  label: string;
  left: string;
  right: string;
  defaultVal: number;
}

const SLIDERS: SliderDef[] = [
  { id: "s1", label: "문장 길이", left: "단문 중심", right: "장문 중심", defaultVal: 3 },
  { id: "s2", label: "감정 밀도", left: "건조·객관적", right: "감성·주관적", defaultVal: 2 },
  { id: "s3", label: "묘사 방식", left: "직접 서술", right: "감각적 이미지", defaultVal: 3 },
  { id: "s4", label: "서술 시점", left: "전지적 신", right: "인물 밀착", defaultVal: 3 },
  { id: "s5", label: "어휘 수준", left: "구어체·평이함", right: "전문어·정밀함", defaultVal: 4 },
];

interface CheckItem {
  title: string;
  desc: string;
}

const SF_CHECKS: CheckItem[] = [
  { title: "숫자의 서사화", desc: "D+127일, φ=0.73 같은 데이터를 감정처럼 읽히게 쓰기" },
  { title: "시스템 관점 서술", desc: "캐릭터 대신 프로세스가 주어가 되는 문장 연습" },
  { title: "기술용어 자연화", desc: "독자가 모르는 단어도 문맥으로 이해하게 만들기" },
  { title: "시간축 병렬 서술", desc: "과거·현재·미래 타임라인을 겹쳐 긴장감 만들기" },
  { title: "오류 미학", desc: "결함·이상신호·예외값을 문학적 상징으로 활용" },
  { title: "침묵의 데이터", desc: "로그가 기록하지 않은 것, 센서가 잡지 못한 것으로 감정 표현" },
  { title: "캐릭터 행동 마커", desc: "Brian의 마커, Vasquez의 A5 노트 — 반복 행동으로 개성 각인" },
  { title: "스케일 전환", desc: "우주적 규모 ↔ 손가락 하나의 진동 — 줌인·줌아웃 기법" },
];

const WEB_CHECKS: CheckItem[] = [
  { title: "첫 문장 훅 공식", desc: "행동·충돌·의문 중 하나로 시작. 설명은 나중에." },
  { title: "단락 끊기 전략", desc: "긴장 최고조 직전에 자르기. 독자가 스크롤하게." },
  { title: "3단 호흡 리듬", desc: "긴 문장 → 중간 → 짧다. 반복하면 리듬이 된다." },
  { title: "독자 시점 중계", desc: "주인공이 느끼기 전에 독자가 먼저 불안해지게 설계" },
  { title: "대화의 밀도 조절", desc: "말 사이의 행동 서술로 캐릭터 심리 드러내기" },
  { title: "감각 레이어링", desc: "시각 + 청각 + 촉각 조합. 단, 3개 이상 겹치면 과부하." },
  { title: "반복 어구의 리프레인", desc: "같은 단어·구절 재등장으로 감정 증폭 및 구조 통일" },
  { title: "에필로그의 여운", desc: "챕터 끝을 해결이 아닌 새로운 질문으로 닫기" },
];

interface DnaCard {
  label: string;
  labelClass: string;
  title: string;
  desc: string;
}

const DNA_CARDS: DnaCard[] = [
  { label: "Hard SF", labelClass: "ss-label-sf", title: "냉정한 관찰자", desc: "기술적 정확성이 곧 아름다움. 감정보다 시스템. 독자가 세계를 이해하게 만드는 문장." },
  { label: "웹소설", labelClass: "ss-label-web", title: "빠른 호흡의 이야기꾼", desc: "첫 문장에 훅. 짧은 단락, 강한 리듬. 독자를 다음 장으로 끌어당기는 마력." },
  { label: "문학적", labelClass: "ss-label-lit", title: "감각의 설계자", desc: "세부 묘사가 감정을 만든다. 은유와 여백. 독자가 스스로 느끼게 하는 문장." },
  { label: "멀티장르", labelClass: "ss-label-all", title: "장르를 넘나드는 작가", desc: "SF의 논리 + 웹소설의 속도 + 문학의 깊이. 각 장르의 장점을 혼합." },
];

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function StyleStudioPage() {
  const { lang } = useLang();
  const en = lang === "en";

  const [tab, setTab] = useState(0);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    SLIDERS.forEach((s) => (init[s.id] = s.defaultVal));
    return init;
  });
  const [checkedSF, setCheckedSF] = useState<Set<number>>(new Set());
  const [checkedWeb, setCheckedWeb] = useState<Set<number>>(new Set());
  const [activeStyles, setActiveStyles] = useState<Set<number>>(new Set([0]));
  const [sourceText, setSourceText] = useState("");
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);

  const totalChecked = checkedSF.size + checkedWeb.size;
  const totalItems = SF_CHECKS.length + WEB_CHECKS.length;

  const toggleSet = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<number>>>, idx: number) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    []
  );

  const handleSlider = useCallback((id: string, val: number) => {
    setSliderVals((prev) => ({ ...prev, [id]: val }));
  }, []);

  // ============================================================
  // PART 3 — 문체 변환 API 호출
  // ============================================================

  const transformText = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (activeStyles.size === 0) return;

    const selectedStyleNames = Array.from(activeStyles)
      .map((i) => STYLE_NAMES[i])
      .join(", ");

    setLoading(true);
    setResultText("");

    const systemInstruction =
      "당신은 한국어 문체 전문가입니다. 지시된 문체 방향에 맞춰 원문을 재작성합니다. 결과물만 출력하고, 설명이나 메타 코멘트는 붙이지 않습니다.";

    const userPrompt = `다음 원문을 "${selectedStyleNames}" 스타일로 재작성해주세요.

원문:
"${sourceText}"

지침:
- 같은 내용과 사건, 동일한 인물을 유지하면서 문체만 변환
- 변환 방향에 맞는 구체적인 기법 적용
- 한국어로만 작성
- 결과물만 출력 (설명 없이)
- 2~4문단 분량으로 자연스럽게`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "claude",
          model: "claude-sonnet-4-20250514",
          systemInstruction,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.8,
        }),
      });

      if (!res.ok) {
        setResultText("API 오류가 발생했습니다. 다시 시도해주세요.");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setResultText("스트림을 읽을 수 없습니다.");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta =
              parsed.delta?.text ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (delta) {
              accumulated += delta;
              setResultText(accumulated);
            }
          } catch {
            // non-JSON SSE line — skip
          }
        }
      }

      if (!accumulated) setResultText("변환 결과가 비어있습니다.");
    } catch {
      setResultText("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [sourceText, activeStyles]);

  // ============================================================
  // PART 4 — 렌더: 헤더 + 탭 네비게이션
  // ============================================================

  const tabLabels = [
    "① 문체 DNA 진단",
    "② 기법 체크리스트",
    "③ 문장 실험실",
    "④ 내 문체 프로필",
  ];

  return (
    <>
      <Header />
      <main className="pt-14">
        {/* Hero */}
        <div className="ss-header">
          <div className="ss-header-bg">STYLE</div>
          <div className="ss-header-label">
            Writing Studio · {en ? "Style Development" : "문체 개발"}
          </div>
          <h1 className="ss-header-title">
            {en ? (
              <>
                Define Your <span>Style</span>
              </>
            ) : (
              <>
                나만의 <span>문체</span>를
                <br />
                정의하다
              </>
            )}
          </h1>
          <p className="ss-header-desc">
            {en
              ? "From hard SF to web novels — a systematic tool for building your unique authorial voice across genres."
              : "하드SF부터 웹소설까지 — 장르를 넘나드는 고유한 작가적 목소리를 체계적으로 구축하는 도구입니다."}
          </p>
        </div>

        {/* Tabs */}
        <div className="ss-tabs">
          {tabLabels.map((label, i) => (
            <button
              key={i}
              className={`ss-tab ${tab === i ? "active" : ""}`}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ss-main">
          {/* ============================================================ */}
          {/* PART 5 — 패널 1: 문체 DNA 진단                              */}
          {/* ============================================================ */}
          {tab === 0 && (
            <div>
              <div className="ss-section-title">Step 01 — 문체 정체성 선택</div>
              <p className="ss-hint">
                지금의 글쓰기 또는 목표로 하는 문체에 가장 가까운 유형을 선택하세요.
                복수 선택 가능.
              </p>

              <div className="ss-dna-grid">
                {DNA_CARDS.map((card, i) => (
                  <button
                    key={i}
                    className={`ss-dna-card ${selectedCards.has(i) ? "selected" : ""}`}
                    onClick={() => toggleSet(setSelectedCards, i)}
                  >
                    {selectedCards.has(i) && (
                      <span className="ss-dna-check">✓</span>
                    )}
                    <span className={`ss-dna-label ${card.labelClass}`}>
                      {card.label}
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                  </button>
                ))}
              </div>

              <hr className="ss-divider" />
              <div className="ss-section-title">Step 02 — 문체 파라미터 설정</div>

              <div className="ss-slider-group">
                {SLIDERS.map((s) => (
                  <div key={s.id} className="ss-slider-row">
                    <div className="ss-slider-label">{s.label}</div>
                    <div className="ss-slider-ends">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={sliderVals[s.id]}
                        onChange={(e) =>
                          handleSlider(s.id, Number(e.target.value))
                        }
                        className="ss-range"
                      />
                      <div className="ss-slider-end-labels">
                        <span>{s.left}</span>
                        <span>{s.right}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="ss-btn-primary" onClick={() => setTab(1)}>
                다음: 기법 체크리스트 →
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* PART 6 — 패널 2: 기법 체크리스트                             */}
          {/* ============================================================ */}
          {tab === 1 && (
            <div>
              <div className="ss-section-title">
                Step 03 — 문체 기법 습득 체크리스트
              </div>

              <div className="ss-progress-wrap">
                <span className="ss-progress-label">
                  {totalChecked} / {totalItems} 완료
                </span>
                <div className="ss-progress-bg">
                  <div
                    className="ss-progress-fill"
                    style={{
                      width: `${(totalChecked / totalItems) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="ss-checklist-grid">
                <div>
                  <h3 className="ss-checklist-heading">SF / 기술적 문체</h3>
                  {SF_CHECKS.map((item, i) => (
                    <button
                      key={i}
                      className={`ss-check-item ${checkedSF.has(i) ? "done" : ""}`}
                      onClick={() => toggleSet(setCheckedSF, i)}
                    >
                      <span className="ss-check-box">
                        {checkedSF.has(i) ? "✓" : ""}
                      </span>
                      <span className="ss-check-text">
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div>
                  <h3 className="ss-checklist-heading">웹소설 / 몰입 기법</h3>
                  {WEB_CHECKS.map((item, i) => (
                    <button
                      key={i}
                      className={`ss-check-item ${checkedWeb.has(i) ? "done" : ""}`}
                      onClick={() => toggleSet(setCheckedWeb, i)}
                    >
                      <span className="ss-check-box">
                        {checkedWeb.has(i) ? "✓" : ""}
                      </span>
                      <span className="ss-check-text">
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PART 7 — 패널 3: 문장 실험실                                 */}
          {/* ============================================================ */}
          {tab === 2 && (
            <div>
              <div className="ss-section-title">Step 04 — 문장 변환 실험실</div>
              <p className="ss-hint">
                원문을 입력하고 변환하고 싶은 문체 요소를 선택하면, AI가 같은
                내용을 다른 스타일로 재작성합니다.
              </p>

              <div className="ss-section-title" style={{ marginBottom: 12 }}>
                변환 방향 선택
              </div>
              <div className="ss-style-toggles">
                {STYLE_NAMES.map((name, i) => (
                  <button
                    key={i}
                    className={`ss-style-toggle ${activeStyles.has(i) ? "on" : ""}`}
                    onClick={() => toggleSet(setActiveStyles, i)}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="ss-lab-split">
                <div>
                  <label className="ss-lab-label">원문 입력</label>
                  <textarea
                    className="ss-textarea"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder={`여기에 원문을 붙여넣으세요.\n\n예시: '그는 창밖을 바라보며 무언가를 생각했다. 오늘따라 하늘이 특별히 파랗게 느껴졌다.'`}
                  />
                </div>
                <div>
                  <label className="ss-lab-label">변환 결과</label>
                  <div className="ss-result-box">
                    {resultText ? (
                      resultText.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < resultText.split("\n").length - 1 && <br />}
                        </span>
                      ))
                    ) : (
                      <span className="ss-placeholder">
                        ← 원문을 입력하고 변환을 실행하면 결과가 여기에
                        표시됩니다.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ss-btn-row">
                <button
                  className="ss-btn-primary"
                  onClick={transformText}
                  disabled={loading || !sourceText.trim() || activeStyles.size === 0}
                >
                  문체 변환 실행
                </button>
                <button
                  className="ss-btn-secondary"
                  onClick={() => {
                    setSourceText("");
                    setResultText("");
                  }}
                >
                  초기화
                </button>
                {loading && (
                  <div className="ss-loading">
                    <span className="ss-dot" />
                    <span className="ss-dot" />
                    <span className="ss-dot" />
                    <span>변환 중...</span>
                  </div>
                )}
              </div>

              <hr className="ss-divider" />

              <div className="ss-section-title">
                문체 팁 — 자주 나오는 함정
              </div>
              <div className="ss-tip warning">
                <h4>AI 문체 증상 1: 과잉 전환어</h4>
                <p>
                  하지만 / 그러나 / 그럼에도 불구하고 — 연속 사용 시 글이
                  설명문처럼 들린다. 행동으로 대체하라.
                </p>
              </div>
              <div className="ss-tip warning">
                <h4>AI 문체 증상 2: 감정 직접 명시</h4>
                <p>
                  &quot;두려움이 몰려왔다&quot; 대신 신체 반응으로: 손끝이
                  모니터 엣지를 긁었다. 0.3초. 다시 긁었다.
                </p>
              </div>
              <div className="ss-tip">
                <h4>HP 작가 문체 강점: 데이터의 서사화</h4>
                <p>
                  희망호에서 D+일수, φ값, 예산 수치가 단순 정보가 아니라
                  캐릭터의 감정 온도계 역할을 한다. 이것이 고유 문체의 핵심.
                </p>
              </div>
              <div className="ss-tip">
                <h4>활용 포인트: 행동 마커의 반복</h4>
                <p>
                  Brian의 마커, Vasquez의 A5, 김미래의 CTRL+SHIFT+D. 이런 반복
                  행동 모티프를 모든 주요 캐릭터에 설계하면 독자가 설명 없이도
                  누군지 안다.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PART 8 — 패널 4: 내 문체 프로필                              */}
          {/* ============================================================ */}
          {tab === 3 && (
            <div>
              <div className="ss-section-title">
                내 문체 프로필 — 현재 설정 기준
              </div>

              <div className="ss-profile-grid">
                <div className="ss-profile-card">
                  <h3>장르 정체성</h3>
                  <div className="ss-tag-row">
                    {Array.from(selectedCards).map((i) => (
                      <span key={i} className="ss-tag ss-tag-gold">
                        {DNA_CARDS[i].label}
                      </span>
                    ))}
                    {selectedCards.size === 0 && (
                      <span className="ss-tag ss-tag-gold">미선택</span>
                    )}
                  </div>
                  <div className="ss-profile-items">
                    <div className="ss-profile-item">
                      <span className="ss-profile-key">주력 프로젝트</span>
                      <span>희망호 (브릿G)</span>
                    </div>
                    <div className="ss-profile-item">
                      <span className="ss-profile-key">연재 규모</span>
                      <span>Part 1 100화 완성</span>
                    </div>
                    <div className="ss-profile-item">
                      <span className="ss-profile-key">작업 방식</span>
                      <span>3-캔버스 시스템</span>
                    </div>
                  </div>
                </div>

                <div className="ss-profile-card">
                  <h3>문체 파라미터</h3>
                  <div className="ss-profile-items">
                    {SLIDERS.map((s) => (
                      <div key={s.id} className="ss-profile-item">
                        <span className="ss-profile-key">{s.label}</span>
                        <span>
                          {PARAM_LABELS[s.id][sliderVals[s.id] - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ss-author-dna">
                <div className="ss-author-dna-bg">DNA</div>
                <h3>작가 문체 DNA 선언문</h3>
                <div className="ss-dna-statement">
                  나는 <em className="ss-hl">시스템의 언어</em>로 인간의 감정을
                  쓴다.
                  <br />
                  숫자와 프로토콜 사이에서{" "}
                  <em className="ss-hl2">살아남는 것들</em>을 포착하고,
                  <br />
                  독자가 이해하기 전에{" "}
                  <em className="ss-hl">먼저 느끼게</em> 만드는 것이 내
                  문체다.
                </div>
              </div>

              <hr className="ss-divider" />

              <div className="ss-section-title">참고할 작가 — 문체 레퍼런스</div>
              <div className="ss-ref-grid">
                <div className="ss-tip">
                  <h4>킴 스탠리 로빈슨</h4>
                  <p>
                    과학적 정밀함과 생태적 감수성. 데이터가 시가 되는 문장.
                  </p>
                </div>
                <div className="ss-tip">
                  <h4>테드 창</h4>
                  <p>
                    철학적 질문을 SF 논리로 풀어냄. 냉정하고 아름다운 구조.
                  </p>
                </div>
                <div className="ss-tip">
                  <h4>듀나</h4>
                  <p>한국 SF의 건조한 감각. 설명하지 않고 제시한다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
