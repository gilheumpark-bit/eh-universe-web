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
      <section className="wr-center wr-empty-state-shell">
        <div className="wr-empty-state-card">
          <div className="wr-empty-state-mark" aria-hidden="true">
            <Plus size={22} />
          </div>
          <div className="wr-title wr-empty-state-title">
            {L4(language, { ko: "집필 모드", en: "Writing Mode" })}
          </div>
          <p className="wr-empty-state-copy">
            {L4(language, { ko: "아직 작업 중인 작품이 없습니다.", en: "No work in progress yet." })}
            <br />
            {L4(language, {
              ko: "작품 기준선을 만들면 여기에서 원고를 이어 쓸 수 있습니다.",
              en: "Create a new work to start writing your manuscript here.",
            })}
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={onCreate}
          >
            <Plus size={15} />
            {L4(language, { ko: "기준선 만들기", en: "Build baseline" })}
          </button>
        </div>
      </section>
    </div>
  );
}
