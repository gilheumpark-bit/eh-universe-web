"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { StyleProfile, AppLanguage } from "@/lib/studio-types";
import { CopyButton } from "./UXHelpers";
import { getActiveProvider, getActiveModel, getApiKey } from "@/lib/ai-providers";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 — 사일런트 차단 금지
import { checkBlockedJson, checkBlockedLegacy403 } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import StylePreview, { applyStyleTransform } from "./StylePreview";
import {
  analyzeText,
  AUTHOR_PROFILES,
  DNA_CARDS,
  getSliderDescriptor,
  getSliderTrackStyle,
  RadarChart,
  REF_AUTHORS,
  SF_CHECKS,
  SLIDERS_I18N,
  STYLE_NAMES_EN,
  STYLE_NAMES_KO,
  STYLE_PRESETS,
  TextAnalysisCards,
  type RefAuthor,
  type TextMetrics,
  WEB_CHECKS,
} from "./StyleStudioView.data";

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
  const benchmarkProfile = benchmarkAuthor ? AUTHOR_PROFILES[benchmarkAuthor] : undefined;

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
          <div className="ss-header-bg">STYLE</div>
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
          <div>
            <div className="ss-section-title">Step 01 · {en ? "Style Identity" : "문체 정체성 선택"}</div>
            <p className="ss-hint">
              {en
                ? "Select the style types closest to your current or target writing. Multiple selections allowed."
                : "지금의 글쓰기 또는 목표로 하는 문체에 가장 가까운 유형을 선택하세요. 복수 선택 가능."}
            </p>

            <div className="ss-dna-grid">
              {DNA_CARDS.map((card, i) => (
                <button
                  key={i}
                  className={`ss-dna-card ${selectedCards.has(i) ? "selected" : ""}`}
                  onClick={() => toggleSet(setSelectedCards, i)}
                >
                  {selectedCards.has(i) && <span className="ss-dna-check">✓</span>}
                  <span className={`ss-dna-label ${card.labelClass}`}>{en ? card.labelEN : card.label}</span>
                  <h3>{en ? card.titleEN : card.title}</h3>
                  <p>{en ? card.descEN : card.desc}</p>
                </button>
              ))}
            </div>

            <hr className="ss-divider" />
            <div className="ss-section-title">Step 02 · {en ? "Style Parameters" : "문체 파라미터 설정"}</div>

            <div className="ss-slider-group">
              {SLIDERS_I18N.map((s) => {
                const currentLabel = getSliderDescriptor(s, sliderVals[s.id], en);

                return (
                  <div key={s.id} className="ss-slider-row">
                    <div className="ss-slider-topline" title={`${en ? s.en : s.ko}: ${currentLabel} — ${en ? s.noteEN : s.noteKO}`}>
                      <div className="ss-slider-meta">
                        <div className="ss-slider-label">{en ? s.en : s.ko}</div>
                        <p className="ss-slider-note">{en ? s.noteEN : s.noteKO}</p>
                      </div>
                      <span className="ss-slider-current">{currentLabel}</span>
                    </div>

                    <div className="ss-slider-ends">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={sliderVals[s.id]}
                        onChange={(e) => handleSlider(s.id, Number(e.target.value))}
                        className="ss-range"
                        aria-valuetext={currentLabel}
                        style={getSliderTrackStyle(sliderVals[s.id])}
                      />
                      <div className="ss-slider-end-labels">
                        <span>{en ? s.leftEN : s.leftKO}</span>
                        <strong>{currentLabel}</strong>
                        <span>{en ? s.rightEN : s.rightKO}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radar Chart + Benchmark Comparison */}
            <hr className="ss-divider" />
            <div className="ss-section-title">
              {en ? "Style Radar" : "문체 레이더"}
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto" }}>
                <RadarChart
                  values={radarValues}
                  benchmarkValues={benchmarkProfile?.values}
                  labels={radarLabels}
                  size={240}
                />
                {/* Legend */}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-accent-amber)", display: "inline-block" }} />
                    {en ? "My Style" : "내 문체"}
                  </span>
                  {benchmarkProfile && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-accent-blue)", display: "inline-block" }} />
                      {en ? benchmarkProfile.en : benchmarkProfile.ko}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary, #999)", display: "block", marginBottom: 6 }}>
                  {en ? "Compare with..." : "비교 작가 선택"}
                </label>
                <select
                  value={benchmarkAuthor}
                  onChange={(e) => setBenchmarkAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple/50"
                >
                  <option value="">{en ? "None" : "선택 안 함"}</option>
                  {Object.entries(AUTHOR_PROFILES).map(([key, prof]) => (
                    <option key={key} value={key}>{en ? prof.en : prof.ko}</option>
                  ))}
                </select>
                {benchmarkProfile && (
                  <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary, #999)" }}>
                    {SLIDERS_I18N.map((s, i) => {
                      const mine = radarValues[i];
                      const theirs = benchmarkProfile.values[i];
                      const diff = mine - theirs;
                      const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
                      const clr = diff > 0 ? "var(--color-accent-amber)" : diff < 0 ? "var(--color-accent-blue)" : "var(--color-text-secondary)";
                      return (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{en ? s.en : s.ko}</span>
                          <span style={{ color: clr, fontWeight: 600 }}>
                            {mine} vs {theirs} <span style={{ fontSize: 10 }}>{arrow}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Style Preview — inline sample */}
            <hr className="ss-divider" />
            <div className="ss-section-title">
              {en ? "Quick Preview" : "미리보기"}
            </div>
            <p className="ss-hint">
              {en
                ? "See how your current style settings transform a sample paragraph."
                : "현재 문체 설정이 샘플 문단에 어떻게 적용되는지 미리 봅니다."}
            </p>
            {(() => {
              const sampleText = en
                ? 'He opened the door. No one was inside. Something lay on the floor. He approached carefully. Cold metal touched his fingertips.'
                : '그가 문을 열었다. 안에는 아무도 없었다. 바닥에 뭔가가 떨어져 있었다. 그는 조심스럽게 다가갔다. 차가운 금속 질감이 손끝에 닿았다.';
              const preview = applyStyleTransform(sampleText, sliderVals, language);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{en ? 'Original' : '원문'}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{sampleText}</div>
                  </div>
                  <div style={{ background: 'var(--indigo-50, #eff6ff)', borderRadius: 10, padding: '12px 16px', border: '1px solid color-mix(in srgb, var(--color-accent-amber) 20%, transparent)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent-amber)', marginBottom: 6 }}>{en ? 'With Your Style' : '내 문체 적용'}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{preview}</div>
                  </div>
                </div>
              );
            })()}

            <button className="ss-btn-primary" onClick={() => setTab(1)} style={{ marginTop: 20 }}>
              {en ? "Next: Technique Checklist →" : "다음: 기법 체크리스트 →"}
            </button>
          </div>
        )}

        {tab === 1 && (
          <div>
            <div className="ss-section-title">
              Step 03 · {en ? "Technique Checklist" : "문체 기법 습득 체크리스트"}
            </div>

            <div className="ss-progress-wrap">
              <span className="ss-progress-label">
                {totalChecked} / {totalItems} {en ? "done" : "완료"}
              </span>
              <div className="ss-progress-bg">
                <div
                  className="ss-progress-fill"
                  style={{ width: `${(totalChecked / totalItems) * 100}%` }}
                />
              </div>
            </div>

            <div className="ss-checklist-grid">
              <div>
                <h3 className="ss-checklist-heading">SF / {en ? "Technical Style" : "기술적 문체"}</h3>
                {SF_CHECKS.map((item, i) => (
                  <button
                    key={i}
                    className={`ss-check-item ${checkedSF.has(i) ? "done" : ""}`}
                    onClick={() => toggleSet(setCheckedSF, i)}
                  >
                    <span className="ss-check-box">{checkedSF.has(i) ? "✓" : ""}</span>
                    <span className="ss-check-text">
                      <strong>{en ? item.titleEN : item.title}</strong>
                      <span>{en ? item.descEN : item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="ss-checklist-heading">{en ? "Web Novel / Immersion" : "웹소설 / 몰입 기법"}</h3>
                {WEB_CHECKS.map((item, i) => (
                  <button
                    key={i}
                    className={`ss-check-item ${checkedWeb.has(i) ? "done" : ""}`}
                    onClick={() => toggleSet(setCheckedWeb, i)}
                  >
                    <span className="ss-check-box">{checkedWeb.has(i) ? "✓" : ""}</span>
                    <span className="ss-check-text">
                      <strong>{en ? item.titleEN : item.title}</strong>
                      <span>{en ? item.descEN : item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div>
            <div className="ss-section-title">Step 04 · {en ? "Sentence Transform Lab" : "문장 변환 실험실"}</div>
            <p className="ss-hint">
              {en
                ? "Enter your original text and select style directions. Noa rewrites the same content in a different style."
                : "원문을 입력하고 변환하고 싶은 문체 요소를 선택하면, 노아가 같은 내용을 다른 스타일로 재작성합니다."}
            </p>

            <div className="ss-section-title" style={{ marginBottom: 12 }}>
              {en ? "Transform Direction" : "변환 방향 선택"}
            </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            <div className="ss-section-title">
              {en ? "Style Tips · Common Pitfalls" : "문체 팁 · 자주 나오는 함정"}
            </div>
            <div className="ss-tip warning">
              <h4>{en ? "Noa Style Symptom 1: Transition Overload" : "노아 문체 증상 1: 과잉 전환어"}</h4>
              <p>{en
                ? "However / Nevertheless / Despite: consecutive use makes prose sound like an essay. Replace with action."
                : "하지만 / 그러나 / 그럼에도 불구하고: 연속 사용 시 글이 설명문처럼 들린다. 행동으로 대체하라."}</p>
            </div>
            <div className="ss-tip warning">
              <h4>{en ? "Noa Style Symptom 2: Stating Emotions Directly" : "노아 문체 증상 2: 감정 직접 명시"}</h4>
              <p>{en
                ? "Instead of 'Fear washed over him,' use physical reactions: His fingertips scraped the edge of the monitor. 0.3 seconds. Again."
                : "\"두려움이 몰려왔다\" 대신 신체 반응으로: 손끝이 모니터 엣지를 긁었다. 0.3초. 다시 긁었다."}</p>
            </div>
            <div className="ss-tip">
              <h4>{en ? "Technique: Data as Narrative" : "기법 활용: 데이터의 서사화"}</h4>
              <p>{en
                ? "Numbers, dates, and measurements are not just information. They can serve as emotional thermometers for your characters."
                : "숫자·날짜·측정값이 단순 정보가 아니라 캐릭터의 감정 온도계 역할을 할 수 있다. 수치에 맥락을 부여하라."}</p>
            </div>
            <div className="ss-tip">
              <h4>{en ? "Technique: Behavioral Markers" : "기법 활용: 행동 마커의 반복"}</h4>
              <p>{en
                ? "Give each character a repeated habit or gesture. Readers learn to identify them without explicit description."
                : "인물마다 고유한 반복 습관을 부여하라. 독자가 설명 없이도 누구인지 식별할 수 있게 된다."}</p>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div>
            <div className="ss-section-title">
              {en ? "My Style Profile" : "내 문체 프로필 · 현재 설정 기준"}
            </div>

            <div className="ss-profile-grid">
              <div className="ss-profile-card">
                <h3>{en ? "Genre Identity" : "장르 정체성"}</h3>
                <div className="ss-tag-row">
                  {Array.from(selectedCards).map((i) => (
                    <span key={i} className="ss-tag ss-tag-gold">{DNA_CARDS[i].label}</span>
                  ))}
                  {selectedCards.size === 0 && (
                    <span className="ss-tag ss-tag-gold">{en ? "None" : "미선택"}</span>
                  )}
                </div>
                <div className="ss-profile-items">
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Selected Styles" : "선택 문체"}</span>
                    <span>{selectedCards.size > 0
                      ? Array.from(selectedCards).map((i) => en ? DNA_CARDS[i].titleEN : DNA_CARDS[i].title).join(" + ")
                      : (en ? "Not set" : "미설정")}</span>
                  </div>
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Techniques" : "습득 기법"}</span>
                    <span>{totalChecked} / {totalItems} {en ? "mastered" : "완료"}</span>
                  </div>
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Lab Usage" : "실험실 사용"}</span>
                    <span>{resultText ? (en ? "Active" : "활성") : (en ? "Not yet" : "미사용")}</span>
                  </div>
                </div>
              </div>

              <div className="ss-profile-card">
                <h3>{en ? "Style Parameters" : "문체 파라미터"}</h3>
                <div className="ss-profile-items">
                  {SLIDERS_I18N.map((s) => (
                    <div key={s.id} className="ss-profile-item">
                      <span className="ss-profile-key">{en ? s.en : s.ko}</span>
                      <span>{getSliderDescriptor(s, sliderVals[s.id], en)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ss-author-dna">
              <div className="ss-author-dna-bg">DNA</div>
              <h3>{en ? "Author Style DNA Statement" : "작가 문체 DNA 선언문"}</h3>
              <div className="ss-dna-statement">
                {selectedCards.size === 0 ? (
                  <span style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                    {en
                      ? "Select your style identity in Step 01 to generate your DNA statement."
                      : "Step 01에서 문체 정체성을 선택하면 DNA 선언문이 생성됩니다."}
                  </span>
                ) : (
                  <>
                    {en ? "I write " : "나는 "}
                    <em className="ss-hl">
                      {selectedCards.has(0) && (en ? "the language of systems" : "시스템의 언어")}
                      {selectedCards.has(1) && (selectedCards.has(0) ? (en ? " and rhythm" : "와 리듬") : (en ? "fast-paced rhythm" : "빠른 호흡의 리듬"))}
                      {selectedCards.has(2) && ((selectedCards.has(0) || selectedCards.has(1)) ? (en ? " and sensory depth" : "과 감각의 깊이") : (en ? "sensory depth" : "감각의 깊이"))}
                      {selectedCards.has(3) && ((selectedCards.has(0) || selectedCards.has(1) || selectedCards.has(2)) ? (en ? " across genres" : "을 장르 너머") : (en ? "genre-crossing craft" : "장르를 넘나드는 문장"))}
                    </em>
                    {en ? " to capture " : "으로 "}
                    <em className="ss-hl2">
                      {sliderVals.s2 <= 2
                        ? (en ? "what data reveals" : "데이터가 드러내는 것들")
                        : sliderVals.s2 >= 4
                          ? (en ? "the weight of emotion" : "감정의 무게")
                          : (en ? "the tension between logic and feeling" : "논리와 감정 사이의 긴장")}
                    </em>
                    {en ? ", and my sentences make readers " : "을 포착하고,"}<br />
                    {en ? "" : "독자가 이해하기 전에 "}
                    <em className="ss-hl">
                      {sliderVals.s4 >= 4
                        ? (en ? "feel before they understand" : "먼저 느끼게")
                        : sliderVals.s4 <= 2
                          ? (en ? "see the whole picture" : "전체를 조망하게")
                          : (en ? "step into the story" : "이야기 안으로 걸어 들어가게")}
                    </em>
                    {en ? "." : " 만드는 것이 내 문체다."}
                  </>
                )}
              </div>
            </div>

            <hr className="ss-divider" />

            <div className="ss-section-title">{en ? "Reference Authors" : "참고할 작가 · 문체 레퍼런스"}</div>
            <div className="ss-ref-grid">
              {(() => {
                const authors = new Map<string, RefAuthor>();
                Array.from(selectedCards).forEach((cardIdx) => {
                  REF_AUTHORS[cardIdx]?.forEach((a) => authors.set(a.name, a));
                });
                const list = authors.size > 0 ? Array.from(authors.values()).slice(0, 3) : REF_AUTHORS[0];
                return list.map((a, i) => (
                  <div key={i} className="ss-tip">
                    <h4>{en ? a.nameEN : a.name}</h4>
                    <p>{en ? a.descEN : a.desc}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
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
