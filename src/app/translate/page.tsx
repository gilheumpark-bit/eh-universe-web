"use client";

import { useEffect } from "react";

export default function TranslateRedirectPage() {
  useEffect(() => {
    window.location.replace("/translation-studio");
  }, []);

  return (
    <main className="lg-preview-state" aria-labelledby="translate-redirect-title">
      <section className="lg-preview-state-panel">
        <span className="lg-preview-state-kicker">TRANSLATION</span>
        <h1 id="translate-redirect-title">번역·현지화 작업실로 이동 중</h1>
        <p>잠시 후 번역 스튜디오가 열립니다.</p>
        <a className="premium-button" href="/translation-studio">
          바로 열기
        </a>
      </section>
    </main>
  );
}
