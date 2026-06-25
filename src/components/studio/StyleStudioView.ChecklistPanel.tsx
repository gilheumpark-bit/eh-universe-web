"use client";

import type { Dispatch, SetStateAction } from "react";
import { SF_CHECKS, WEB_CHECKS } from "./StyleStudioView.data";

interface StyleChecklistPanelProps {
  en: boolean;
  checkedSF: Set<number>;
  checkedWeb: Set<number>;
  setCheckedSF: Dispatch<SetStateAction<Set<number>>>;
  setCheckedWeb: Dispatch<SetStateAction<Set<number>>>;
  toggleSet: (setter: Dispatch<SetStateAction<Set<number>>>, idx: number) => void;
  totalChecked: number;
  totalItems: number;
}

export function StyleChecklistPanel({
  en,
  checkedSF,
  checkedWeb,
  setCheckedSF,
  setCheckedWeb,
  toggleSet,
  totalChecked,
  totalItems,
}: StyleChecklistPanelProps) {
  return (
    <div>
      <h2 className="ss-section-title">
        Step 03 · {en ? "Technique Checklist" : "문체 기법 습득 체크리스트"}
      </h2>

      <div className="ss-progress-wrap">
        <span className="ss-progress-label">
          {totalChecked} / {totalItems} {en ? "done" : "완료"}
        </span>
        <div className="ss-progress-bg">
          <progress className="ss-progress-meter" max={totalItems} value={totalChecked} aria-label={en ? "Checklist progress" : "체크리스트 진행률"} />
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
  );
}
