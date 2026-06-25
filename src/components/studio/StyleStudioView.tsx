"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { StyleProfile, AppLanguage } from "@/lib/studio-types";
import { CopyButton } from "./UXHelpers";
import { getActiveProvider, getActiveModel, getApiKey } from "@/lib/ai-providers";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 — 사일런트 차단 금지
import { checkBlockedJson, checkBlockedLegacy403 } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import StylePreview from "./StylePreview";
import {
  analyzeText,
  SF_CHECKS,
  SLIDERS_I18N,
  STYLE_NAMES_EN,
  STYLE_NAMES_KO,
  STYLE_PRESETS,
  TextAnalysisCards,
  type TextMetrics,
  WEB_CHECKS,
} from "./StyleStudioView.data";
import { StyleChecklistPanel } from "./StyleStudioView.ChecklistPanel";
import { StyleIdentityPanel } from "./StyleStudioView.IdentityPanel";
import { StyleProfilePanel } from "./StyleStudioView.ProfilePanel";

interface Props {
  language?: AppLanguage;
  /** @deprecated Use language prop instead */
  isKO?: boolean;
  initialProfile?: StyleProfile;
  onProfileChange?: (profile: StyleProfile) => void;
}

export default function StyleStudioView({ language: languageProp, isKO: isKOProp, initialProfile, onProfileChange }: Props) {
  const language: AppLanguage = languageProp ?? (isKOProp === false ? 'EN' : 'KO');
  const en = language === 'EN' || language === 'CN';

  const [tab, setTab] = useState(0);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(
    () => new Set(initialProfile?.selectedDNA ?? [])
  );
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    if (initialProfile?.sliders && Object.keys(initialProfile.sliders).length > 0) {
      return { ...Object.fromEntries(SLIDERS_I18N.map((s) => [s.id, s.defaultVal])), ...initialProfile.sliders };
    }
    const init: Record<string, number> = {};
    SLIDERS_I18N.forEach((s) => {
      init[s.id] = s.defaultVal;
    });
    return init;
  });
  const [checkedSF, setCheckedSF] = useState<Set<number>>(
    () => new Set(initialProfile?.checkedSF ?? [])
  );
  const [checkedWeb, setCheckedWeb] = useState<Set<number>>(
    () => new Set(initialProfile?.checkedWeb ?? [])
  );
  const [activeStyles, setActiveStyles] = useState<Set<number>>(new Set([0]));
  const [sourceText, setSourceText] = useState("");
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStylePresetMenu, setShowStylePresetMenu] = useState(false);
  const [benchmarkAuthor, setBenchmarkAuthor] = useState<string>("");
  const [textMetrics, setTextMetrics] = useState<TextMetrics | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setTextMetrics(analyzeText(sourceText));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sourceText]);

  const radarValues = useMemo(
    () => SLIDERS_I18N.map((s) => sliderVals[s.id] ?? s.defaultVal),
    [sliderVals]
  );
  const radarLabels = useMemo(
    () => SLIDERS_I18N.map((s) => (en ? s.en.split(" ")[0] : s.ko)),
    [en]
  );

  const applyStylePreset = useCallback((presetKey: string) => {
    const preset = STYLE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    setSliderVals(prev => ({ ...prev, ...preset.sliders }));
    setSelectedCards(new Set(preset.dna));
    setShowStylePresetMenu(false);
  }, []);

  const totalChecked = checkedSF.size + checkedWeb.size;
  const totalItems = SF_CHECKS.length + WEB_CHECKS.length;

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onProfileChange?.({
      selectedDNA: Array.from(selectedCards),
      sliders: { ...sliderVals },
      checkedSF: Array.from(checkedSF),
      checkedWeb: Array.from(checkedWeb),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCards, sliderVals, checkedSF, checkedWeb]);

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

  const transformAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { transformAbortRef.current?.abort(); }, []);

  const transformText = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (activeStyles.size === 0) return;

    transformAbortRef.current?.abort();
    const controller = new AbortController();
    transformAbortRef.current = controller;

    const NAMES = en ? STYLE_NAMES_EN : STYLE_NAMES_KO;
    const selectedStyleNames = (Array.from(activeStyles) as number[])
      .map((i) => NAMES[i])
      .join(", ");

    setLoading(true);
    setResultText("");

    const systemInstruction = en
      ? "You are an expert writing style consultant. Rewrite the original text to match the specified style direction. Output only the result, with no explanations or meta-commentary."
      : "당신은 한국어 문체 전문가입니다. 지시된 문체 방향에 맞춰 원문을 재작성합니다. 결과물만 출력하고, 설명이나 메타 코멘트는 붙이지 않습니다.";

    const userPrompt = en
      ? `Rewrite the following text in "${selectedStyleNames}" style.\n\nOriginal:\n"${sourceText}"\n\nInstructions:\n- Keep the same content, events, and characters — change only the style\n- Apply specific techniques matching the selected direction\n- Output only the result (no explanation)\n- 2–4 paragraphs, natural flow`
      : `다음 원문을 "${selectedStyleNames}" 스타일로 재작성해주세요.\n\n원문:\n"${sourceText}"\n\n지침:\n- 같은 내용과 사건, 동일한 인물을 유지하면서 문체만 변환\n- 변환 방향에 맞는 구체적인 기법 적용\n- 한국어로만 작성\n- 결과물만 출력 (설명 없이)\n- 2~4문단 분량으로 자연스럽게`;

    try {
      const provider = getActiveProvider();
      const model = getActiveModel();
      const apiKey = getApiKey(provider);

      if (!apiKey) {
        setResultText(en ? "Please set your connection key in Settings first." : "환경 설정에서 연결 키를 먼저 등록해 주세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          systemInstruction,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let inlineMsg: string | null = null;
        try {
          const errData: unknown = await res.json();
          inlineMsg = checkPaywallJson(errData) ?? checkBlockedLegacy403(errData, "style-studio", en ? "en" : "ko");
          if (!inlineMsg) {
            const plainError = (errData as { error?: unknown })?.error;
            if (typeof plainError === "string" && plainError) inlineMsg = plainError;
          }
        } catch { /* 본문 비-JSON — 일반 오류 문구 유지 */ }
        setResultText(inlineMsg ?? (en ? "Connection error. Please try again." : "연결에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요."));
        return;
      }

      const blockedCt = res.headers.get("content-type") ?? "";
      if (blockedCt.includes("application/json")) {
        const blockedJson: unknown = await res.json().catch(() => null);
        const blockedMsg = checkBlockedJson(blockedJson, "style-studio", en ? "en" : "ko");
        setResultText(blockedMsg ?? (en ? "Connection error. Please try again." : "연결에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요."));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setResultText(en ? "Cannot read stream." : "스트림을 읽을 수 없습니다.");
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
              parsed.candidates?.[0]?.content?.parts?.[0]?.text ??
              parsed.delta?.text ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (delta) {
              accumulated += delta;
              setResultText(accumulated);
            }
          } catch {
          }
        }
      }

      if (!accumulated) setResultText(en ? "Transform result is empty." : "변환 결과가 비어있습니다.");
    } catch {
      setResultText(en ? "Connection error. Please try again." : "연결에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [sourceText, activeStyles, en]);

  const tabLabels = en
    ? ["① DNA Diagnosis", "② Technique Checklist", "③ Sentence Lab", "④ My Profile", "⑤ Preview & Compare"]
    : ["① 문체 DNA 진단", "② 기법 체크리스트", "③ 문장 실험실", "④ 내 문체 프로필", "⑤ 프리뷰 비교"];

  return (
    <div className="ss-page">
      {/* Hero */}
      <div className="ss-header">
        <div className="ss-shell ss-header-shell">
          <div className="ss-header-bg" aria-hidden="true">STYLE</div>
          <div className="ss-header-label">
            Loreguard Studio · {en ? "Style Alignment" : "문체 정렬"}
          </div>
          <h1 className="ss-header-title">
            {en ? (
              <>Define Your <span>Style</span></>
            ) : (
              <>나만의 <span>문체</span>를<br />정의하다</>
            )}
          </h1>
          <p className="ss-header-desc">
            {en
              ? "From hard SF to web novels, tune a stable authorial voice across genres."
              : "하드 SF부터 웹소설까지, 장르를 넘나드는 작가적 목소리를 안정적으로 정렬합니다."}
          </p>
        </div>
      </div>

      {/* Style Preset Dropdown */}
      <div className="ss-toolbar">
        <div className="ss-shell ss-toolbar-shell">
          <div className="ss-toolbar-anchor">
            <button className="ss-preset-trigger" onClick={() => setShowStylePresetMenu((v) => !v)}>
              {en ? "Preset" : "프리셋"}
            </button>
            {showStylePresetMenu && (
              <div className="ss-preset-menu">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.key} className="ss-preset-item" onClick={() => applyStylePreset(p.key)}>
                    {en ? p.en : p.ko}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ss-tabs">
        <div className="ss-shell ss-tabs-shell">
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
      </div>

      <div className="ss-main">
        <div className="ss-shell ss-main-shell">
        {tab === 0 && (
          <StyleIdentityPanel
            en={en}
            language={language}
            selectedCards={selectedCards}
            setSelectedCards={setSelectedCards}
            toggleSet={toggleSet}
            sliderVals={sliderVals}
            handleSlider={handleSlider}
            radarValues={radarValues}
            radarLabels={radarLabels}
            benchmarkAuthor={benchmarkAuthor}
            setBenchmarkAuthor={setBenchmarkAuthor}
            setTab={setTab}
          />
        )}

        {tab === 1 && (
          <StyleChecklistPanel
            en={en}
            checkedSF={checkedSF}
            checkedWeb={checkedWeb}
            setCheckedSF={setCheckedSF}
            setCheckedWeb={setCheckedWeb}
            toggleSet={toggleSet}
            totalChecked={totalChecked}
            totalItems={totalItems}
          />
        )}

        {tab === 2 && (
          <div>
            <h2 className="ss-section-title">Step 04 · {en ? "Sentence Transform Lab" : "문장 변환 실험실"}</h2>
            <p className="ss-hint">
              {en
                ? "Enter your original text and select style directions. Noa rewrites the same content in a different style."
                : "원문을 입력하고 변환하고 싶은 문체 요소를 선택하면, 노아가 같은 내용을 다른 스타일로 재작성합니다."}
            </p>

            <h2 className="ss-section-title ss-section-title-tight">
              {en ? "Transform Direction" : "변환 방향 선택"}
            </h2>
            <div className="ss-style-toggles">
              {(en ? STYLE_NAMES_EN : STYLE_NAMES_KO).map((name, i) => (
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
                <label className="ss-lab-label">{en ? "Original" : "원문 입력"}</label>
                <textarea
                  className="ss-textarea"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={en
                    ? "Paste your original text here."
                    : "여기에 원문을 붙여넣으세요.\n\n예시: '그는 창밖을 바라보며 무언가를 생각했다. 오늘따라 하늘이 특별히 파랗게 느껴졌다.'"
                  }
                />
                {/* Real-time text analysis */}
                <TextAnalysisCards metrics={textMetrics} en={en} />
              </div>
              <div>
                <div className="ss-lab-label-row">
                  <label className="ss-lab-label">{en ? "Result" : "변환 결과"}</label>
                  {resultText && <CopyButton text={resultText} language={language} />}
                </div>
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
                      {en
                        ? "← Enter text and run transform to see results."
                        : "← 원문을 입력하고 변환을 실행하면 결과가 여기에 표시됩니다."}
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
                {en ? "Transform" : "문체 변환 실행"}
              </button>
              <button
                className="ss-btn-secondary"
                onClick={() => { setSourceText(""); setResultText(""); }}
              >
                {en ? "Reset" : "초기화"}
              </button>
              {loading && (
                <div className="ss-loading">
                  <span className="ss-dot" />
                  <span className="ss-dot" />
                  <span className="ss-dot" />
                  <span>{en ? "Transforming..." : "변환 중..."}</span>
                </div>
              )}
            </div>

            <hr className="ss-divider" />

            <h2 className="ss-section-title">
              {en ? "Style Tips · Common Pitfalls" : "문체 팁 · 자주 나오는 함정"}
            </h2>
            <div className="ss-tip warning">
              <h3>{en ? "Noa Style Symptom 1: Transition Overload" : "노아 문체 증상 1: 과잉 전환어"}</h3>
              <p>{en
                ? "However / Nevertheless / Despite: consecutive use makes prose sound like an essay. Replace with action."
                : "하지만 / 그러나 / 그럼에도 불구하고: 연속 사용 시 글이 설명문처럼 들린다. 행동으로 대체하라."}</p>
            </div>
            <div className="ss-tip warning">
              <h3>{en ? "Noa Style Symptom 2: Stating Emotions Directly" : "노아 문체 증상 2: 감정 직접 명시"}</h3>
              <p>{en
                ? "Instead of 'Fear washed over him,' use physical reactions: His fingertips scraped the edge of the monitor. 0.3 seconds. Again."
                : "\"두려움이 몰려왔다\" 대신 신체 반응으로: 손끝이 모니터 엣지를 긁었다. 0.3초. 다시 긁었다."}</p>
            </div>
            <div className="ss-tip">
              <h3>{en ? "Technique: Data as Narrative" : "기법 활용: 데이터의 서사화"}</h3>
              <p>{en
                ? "Numbers, dates, and measurements are not just information. They can serve as emotional thermometers for your characters."
                : "숫자·날짜·측정값이 단순 정보가 아니라 캐릭터의 감정 온도계 역할을 할 수 있다. 수치에 맥락을 부여하라."}</p>
            </div>
            <div className="ss-tip">
              <h3>{en ? "Technique: Behavioral Markers" : "기법 활용: 행동 마커의 반복"}</h3>
              <p>{en
                ? "Give each character a repeated habit or gesture. Readers learn to identify them without explicit description."
                : "인물마다 고유한 반복 습관을 부여하라. 독자가 설명 없이도 누구인지 식별할 수 있게 된다."}</p>
            </div>
          </div>
        )}

        {tab === 3 && (
          <StyleProfilePanel
            en={en}
            selectedCards={selectedCards}
            totalChecked={totalChecked}
            totalItems={totalItems}
            resultText={resultText}
            sliderVals={sliderVals}
          />
        )}

        {tab === 4 && (
          <StylePreview
            profile={{
              selectedDNA: Array.from(selectedCards),
              sliders: { ...sliderVals },
              checkedSF: Array.from(checkedSF),
              checkedWeb: Array.from(checkedWeb),
            }}
            language={language}
          />
        )}
        </div>
      </div>
    </div>
  );
}
