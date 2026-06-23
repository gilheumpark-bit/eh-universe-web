"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { applyStyleTransform } from "./StylePreview";
import {
  AUTHOR_PROFILES,
  DNA_CARDS,
  getSliderDescriptor,
  RadarChart,
  SLIDERS_I18N,
} from "./StyleStudioView.data";

interface StyleIdentityPanelProps {
  en: boolean;
  language: AppLanguage;
  selectedCards: Set<number>;
  setSelectedCards: Dispatch<SetStateAction<Set<number>>>;
  toggleSet: (setter: Dispatch<SetStateAction<Set<number>>>, idx: number) => void;
  sliderVals: Record<string, number>;
  handleSlider: (id: string, val: number) => void;
  radarValues: number[];
  radarLabels: string[];
  benchmarkAuthor: string;
  setBenchmarkAuthor: Dispatch<SetStateAction<string>>;
  setTab: Dispatch<SetStateAction<number>>;
}

export function StyleIdentityPanel({
  en,
  language,
  selectedCards,
  setSelectedCards,
  toggleSet,
  sliderVals,
  handleSlider,
  radarValues,
  radarLabels,
  benchmarkAuthor,
  setBenchmarkAuthor,
  setTab,
}: StyleIdentityPanelProps) {
  const benchmarkProfile = benchmarkAuthor ? AUTHOR_PROFILES[benchmarkAuthor] : undefined;
  const sampleText = en
    ? "He opened the door. No one was inside. Something lay on the floor. He approached carefully. Cold metal touched his fingertips."
    : "그가 문을 열었다. 안에는 아무도 없었다. 바닥에 뭔가가 떨어져 있었다. 그는 조심스럽게 다가갔다. 차가운 금속 질감이 손끝에 닿았다.";
  const preview = applyStyleTransform(sampleText, sliderVals, language);

  return (
    <div>
      <h2 className="ss-section-title">Step 01 · {en ? "Style Identity" : "문체 정체성 선택"}</h2>
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
      <h2 className="ss-section-title">Step 02 · {en ? "Style Parameters" : "문체 파라미터 설정"}</h2>

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
                  className={`ss-range ss-range-${sliderVals[s.id]}`}
                  aria-valuetext={currentLabel}
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

      <hr className="ss-divider" />
      <h2 className="ss-section-title">{en ? "Style Radar" : "문체 레이더"}</h2>
      <div className="ss-radar-panel">
        <div className="ss-radar-chart">
          <RadarChart
            values={radarValues}
            benchmarkValues={benchmarkProfile?.values}
            labels={radarLabels}
            size={240}
          />
          <div className="ss-radar-legend">
            <span className="ss-legend-item">
              <span className="ss-legend-swatch amber" />
              {en ? "My Style" : "내 문체"}
            </span>
            {benchmarkProfile && (
              <span className="ss-legend-item">
                <span className="ss-legend-swatch blue" />
                {en ? benchmarkProfile.en : benchmarkProfile.ko}
              </span>
            )}
          </div>
        </div>
        <div className="ss-radar-side">
          <label className="ss-field-label">{en ? "Compare with..." : "비교 작가 선택"}</label>
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
            <div className="ss-compare-list">
              {SLIDERS_I18N.map((s, i) => {
                const mine = radarValues[i];
                const theirs = benchmarkProfile.values[i];
                const diff = mine - theirs;
                const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
                const tone = diff > 0 ? "up" : diff < 0 ? "down" : "same";
                return (
                  <div key={s.id} className="ss-compare-row">
                    <span>{en ? s.en : s.ko}</span>
                    <span className={`ss-compare-score ${tone}`}>
                      {mine} vs {theirs} <span className="ss-compare-arrow">{arrow}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <hr className="ss-divider" />
      <h2 className="ss-section-title">{en ? "Quick Preview" : "미리보기"}</h2>
      <p className="ss-hint">
        {en
          ? "See how your current style settings transform a sample paragraph."
          : "현재 문체 설정이 샘플 문단에 어떻게 적용되는지 미리 봅니다."}
      </p>
      <div className="ss-preview-grid">
        <div className="ss-preview-card">
          <div className="ss-preview-label">{en ? "Original" : "원문"}</div>
          <div className="ss-preview-copy muted">{sampleText}</div>
        </div>
        <div className="ss-preview-card styled">
          <div className="ss-preview-label accent">{en ? "With Your Style" : "내 문체 적용"}</div>
          <div className="ss-preview-copy">{preview}</div>
        </div>
      </div>

      <button className="ss-btn-primary ss-next-btn" onClick={() => setTab(1)}>
        {en ? "Next: Technique Checklist →" : "다음: 기법 체크리스트 →"}
      </button>
    </div>
  );
}
