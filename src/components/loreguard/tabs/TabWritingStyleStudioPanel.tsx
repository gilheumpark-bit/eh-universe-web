import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Pen, X } from "@/components/loreguard/icons";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { useStudio } from "@/app/studio/StudioContext";
import { L4 } from "@/lib/i18n";

const StyleTab = dynamic(() => import("@/components/studio/tabs/StyleTab"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={600} />,
});

export function StyleStudioPanel() {
  const {
    currentSession,
    language,
    updateCurrentSession,
    triggerSave,
    saveFlash,
    showAiLock,
    hostedProviders,
  } = useStudio();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-style", onOpen);
    return () => window.removeEventListener("loreguard:open-style", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const config = currentSession?.config;
  if (!open || !currentSession || !config) return null;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "문체 스튜디오", en: "Style Studio" })}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(640px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Pen size={16} />
          {L4(language, { ko: "문체 스튜디오", en: "Style Studio" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <StyleTab
          language={language}
          config={config}
          updateCurrentSession={updateCurrentSession}
          triggerSave={triggerSave}
          saveFlash={saveFlash}
          showAiLock={showAiLock}
          hostedProviders={hostedProviders}
          messages={currentSession.messages}
        />
      </aside>
    </div>
  );
}
