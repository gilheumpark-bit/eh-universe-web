"use client";

import { X } from "lucide-react";
import { SubmissionPackageBuilder } from "./NovelIDELauncher.lazy";
import type { NovelIDELanguage } from "./NovelIDELauncher.model";

type SubmissionPackageModalProps = {
  isKO: boolean;
  language: NovelIDELanguage;
  projectId: string;
  onClose: () => void;
};

export function SubmissionPackageModal({
  isKO,
  language,
  projectId,
  onClose,
}: SubmissionPackageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-6"
      role="dialog"
      aria-modal="true"
      aria-label={isKO ? "제출 묶음 발급" : "Submission Package"}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl my-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-9 h-9 inline-flex items-center justify-center bg-text-primary text-bg-primary hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-blue"
          aria-label={isKO ? "닫기" : "Close"}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
        <SubmissionPackageBuilder language={language} projectIdOverride={projectId} />
      </div>
    </div>
  );
}
