"use client";

import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { ImportCandidate } from "@/lib/loreguard/import-classifier";
import type {
  ImportAlignmentWarning,
  ImportBasisUpdateSuggestion,
} from "@/lib/loreguard/import-project-alignment";
import { Check, X } from "./icons";

interface ProjectStartReviewDialogProps {
  language: AppLanguage;
  candidate: ImportCandidate | null;
  warnings: ImportAlignmentWarning[];
  suggestions: ImportBasisUpdateSuggestion[];
  onClose: () => void;
  onKeepBasis: (candidate: ImportCandidate) => void;
  onApplyBasis: (candidate: ImportCandidate) => void;
}

export function ProjectStartReviewDialog({
  language,
  candidate,
  warnings,
  suggestions,
  onClose,
  onKeepBasis,
  onApplyBasis,
}: ProjectStartReviewDialogProps) {
  if (!candidate) return null;

  return (
    <div className="lg-candidate-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="lg-candidate-modal ps-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-review-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lg-candidate-modal-head">
          <div>
            <div className="lg-candidate-modal-kicker">{L4(language, { ko: "기준 확인", en: "Basis review", ja: "基準確認", zh: "基准检查" })}</div>
            <h2 id="ps-review-modal-title">{L4(language, { ko: "기준 확인 후 반영", en: "Apply after basis review", ja: "基準確認後に反映", zh: "检查基准后反映" })}</h2>
            <p>{L4(language, {
              ko: `${candidate.title} 후보를 작품에 반영하기 전에 기준값을 확인합니다.`,
              en: `Review basis values before applying ${candidate.title} to the work.`,
              ja: `${candidate.title} 候補をプロジェクトへ反映する前に基準値を確認します。`,
              zh: `在将 ${candidate.title} 候选写入项目前，请先检查基准值。`,
            })}</p>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            aria-label={L4(language, { ko: "기준 확인 닫기", en: "Close basis review", ja: "基準確認を閉じる", zh: "关闭基准检查" })}
          >
            <X size={16} />
          </button>
        </div>
        <div className="lg-candidate-modal-body">
          {warnings.length > 0 ? (
            <div className="lg-candidate-notices" aria-label={L4(language, { ko: "검토 필요 항목", en: "Items needing review", ja: "確認が必要な項目", zh: "需要检查的项目" })}>
              <div className="lg-candidate-notices-title">{L4(language, { ko: "검토 필요", en: "Needs review", ja: "確認必要", zh: "需要检查" })}</div>
              {warnings.map((warning) => (
                <div key={warning.code} className={`lg-candidate-notice ${warning.severity}`}>
                  <b>{warning.label}</b>
                  <span>{warning.detail}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="ps-review-block">
            <strong>{L4(language, { ko: "기준 반영 제안", en: "Basis update suggestions", ja: "基準反映提案", zh: "基准应用建议" })}</strong>
            {suggestions.length > 0 ? (
              <div className="ps-review-suggestions">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.field} className="ps-review-suggestion">
                    <span>{suggestion.label}</span>
                    <b>
                      {suggestion.currentLabel} → {suggestion.nextLabel}
                    </b>
                    <p>{suggestion.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>{L4(language, {
                ko: "작품 기준은 유지하고 자료 내용만 반영할 수 있습니다.",
                en: "You can keep the work basis and accept only the candidate content.",
                ja: "プロジェクト基準は維持し、候補内容だけ採択できます。",
                zh: "可以保留项目基准，仅采纳候选内容。",
              })}</p>
            )}
          </div>
        </div>
        <div className="lg-candidate-modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {L4(language, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button type="button" className="btn" onClick={() => onKeepBasis(candidate)}>
            {L4(language, { ko: "기준 유지하고 반영", en: "Keep basis and apply", ja: "基準を維持して反映", zh: "保留基准并反映" })}
          </button>
          {suggestions.length > 0 ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => onApplyBasis(candidate)}
            >
              <Check size={14} />
              {L4(language, { ko: "기준 반영 후 적용", en: "Apply basis and use", ja: "基準反映後に適用", zh: "应用基准后使用" })}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
