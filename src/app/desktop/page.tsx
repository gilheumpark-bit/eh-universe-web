"use client";

import { useEffect } from "react";
import { getNovelStudioHref } from "@/lib/studio-entry-links";

export default function LegacyDesktopRedirect() {
  const studioHref = getNovelStudioHref("create");

  useEffect(() => {
    window.location.replace(studioHref);
  }, [studioHref]);

  return (
    <main className="lg-preview-state" aria-labelledby="desktop-redirect-title">
      <section className="lg-preview-state-panel">
        <span className="lg-preview-state-kicker">STUDIO</span>
        <h1 id="desktop-redirect-title">창작 스튜디오로 이동 중</h1>
        <p>이전 데스크톱 주소를 새 작품 시작 화면으로 연결하고 있습니다.</p>
        <a className="premium-button" href={studioHref}>
          바로 열기
        </a>
      </section>
    </main>
  );
}
