"use client";

import { Plus } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

interface TabWritingEmptyStateProps {
  language: AppLanguage;
  onCreate: () => void;
}

export function TabWritingEmptyState({ language, onCreate }: TabWritingEmptyStateProps) {
  return (
    <div className="wr-grid">
      <section className="wr-center" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div className="wr-title" style={{ marginBottom: 8 }}>
            {L4(language, { ko: "집필 모드", en: "Writing Mode" })}
          </div>
          <p style={{ color: "var(--ink-2, #5b6273)", fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
            {L4(language, { ko: "아직 작업 중인 작품이 없습니다.", en: "No work in progress yet." })}
            <br />
            {L4(language, {
              ko: "새 작품을 만들면 여기에서 원고를 집필할 수 있습니다.",
              en: "Create a new work to start writing your manuscript here.",
            })}
          </p>
          <button
            type="button"
            className="btn primary"
            style={{ justifyContent: "center" }}
            onClick={onCreate}
          >
            <Plus size={15} />
            {L4(language, { ko: "새 작품 시작", en: "Start a new work" })}
          </button>
        </div>
      </section>
    </div>
  );
}
