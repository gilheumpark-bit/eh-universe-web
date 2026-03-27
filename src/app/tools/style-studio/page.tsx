"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import ToolNav from "@/components/tools/ToolNav";
import StyleStudioView from "@/components/studio/StyleStudioView";
import type { StyleProfile } from "@/lib/studio-types";

// ============================================================
// PART 1 — Style Studio Page Wrapper
// ============================================================

export default function StyleStudioPage() {
  const { lang } = useLang();
  const en = lang !== "ko";
  const language = lang === "ko" ? "KO" : lang === "jp" ? "JP" : lang === "cn" ? "CN" : "EN";

  const [showImportTip, setShowImportTip] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const profileRef = useRef<StyleProfile | null>(null);

  const handleProfileChange = useCallback((profile: StyleProfile) => {
    profileRef.current = profile;
  }, []);

  const handleExport = () => {
    const profile = profileRef.current;
    if (!profile) {
      setExportMsg(en ? "No profile configured yet." : "아직 프로파일이 설정되지 않았습니다.");
      setTimeout(() => setExportMsg(""), 3000);
      return;
    }
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "style-profile.json";
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg(en ? "Exported!" : "내보내기 완료!");
    setTimeout(() => setExportMsg(""), 2500);
  };

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <ToolNav
            toolName={en ? "Style Studio" : "문체 스튜디오"}
            isKO={!en}
            relatedTools={[
              { href: "/tools/noa-tower", label: en ? "NOA Tower" : "NOA 타워" },
              { href: "/tools/soundtrack", label: en ? "Soundtrack" : "사운드트랙" },
            ]}
          />

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-blue mr-2">TOOL</span>
            {en
              ? "Document Level: PUBLIC — Level 0 — Interactive Interface"
              : "문서 등급: PUBLIC — Level 0 — 인터랙티브 인터페이스"}
          </div>

          <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
            {/* Intro */}
            <div className="mb-8 border-l-2 border-accent-purple bg-accent-purple/5 p-4 text-xs text-text-secondary leading-relaxed">
              <strong className="text-accent-purple">
                {en ? "Style Studio" : "문체 스튜디오"}
              </strong>{" "}
              {en
                ? "lets you define and calibrate a unique writing style profile. Select DNA cards, tune stylistic sliders, and check off technique mastery. The resulting profile can be exported as JSON for integration with external pipelines or personal archives."
                : "고유한 문체 프로파일을 정의하고 조율할 수 있습니다. DNA 카드를 선택하고, 스타일 슬라이더를 조정하며, 기법 숙련도를 체크하세요. 결과 프로파일은 JSON으로 내보내 외부 파이프라인이나 개인 아카이브에 통합할 수 있습니다."}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap mb-8">
              {/* Import tooltip */}
              <div className="relative">
                <button
                  onClick={() => setShowImportTip(prev => !prev)}
                  className="px-4 py-2 border border-border text-text-tertiary font-[family-name:var(--font-mono)] text-[9px] tracking-widest hover:border-accent-purple hover:text-accent-purple transition-all rounded"
                >
                  {en ? "IMPORT FROM STUDIO" : "스튜디오에서 가져오기"}
                </button>
                {showImportTip && (
                  <div className="absolute left-0 top-full mt-2 z-20 w-64 p-3 bg-bg-secondary border border-border rounded shadow-lg text-[11px] text-text-secondary leading-relaxed">
                    {en
                      ? "This tool runs standalone. To import a profile from CSL-IDE Studio, copy the JSON from Studio's export and load it here. Standalone mode does not connect to external sessions."
                      : "이 도구는 독립 실행형입니다. CSL-IDE Studio에서 프로파일을 가져오려면 Studio의 내보내기 JSON을 복사해 여기서 로드하세요. 독립 모드에서는 외부 세션에 연결되지 않습니다."}
                    <button
                      onClick={() => setShowImportTip(false)}
                      className="block mt-2 text-accent-purple text-[10px] hover:underline"
                    >
                      {en ? "Close" : "닫기"}
                    </button>
                  </div>
                )}
              </div>

              {/* Export JSON */}
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-accent-purple text-accent-purple font-[family-name:var(--font-mono)] text-[9px] tracking-widest hover:bg-accent-purple hover:text-white transition-all rounded"
              >
                {en ? "EXPORT JSON" : "JSON 내보내기"}
              </button>
              {exportMsg && (
                <span className="self-center text-[10px] text-accent-purple font-[family-name:var(--font-mono)]">
                  {exportMsg}
                </span>
              )}
            </div>

            {/* StyleStudioView */}
            <StyleStudioView
              language={language}
              onProfileChange={handleProfileChange}
            />
          </div>
        </div>
      </main>
    </>
  );
}
