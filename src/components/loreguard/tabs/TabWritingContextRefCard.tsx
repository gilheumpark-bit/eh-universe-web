import { memo, useMemo, useState } from "react";
import { Eye } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import {
  buildWritingContextPack,
  summarizeWritingContextPack,
} from "@/lib/writing-workspace/context-pack";

export const ContextRefCard = memo(function ContextRefCard({
  config,
  language,
  projectId,
  sessionId,
}: {
  config: StoryConfig;
  language: AppLanguage;
  projectId: string | null;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);

  const ctx = useMemo(() => {
    const pack = buildWritingContextPack({
      config,
      projectId,
      sessionId,
    });
    const summary = summarizeWritingContextPack(pack);
    const activeRefs = pack.sourceRefs.filter((ref) => ref.status === "adopted").length;
    const currentSceneSheet = pack.blocks.some((block) => block.id === `scene-sheet:${config.episode}`);
    const currentDirection =
      pack.blocks.some((block) => block.id === "production-direction" || block.id === "act-guide");
    const externalCraftCount = pack.blocks.filter((block) => block.scope === "external-craft").length;
    return {
      pack,
      summary,
      activeRefs,
      currentSceneSheet,
      currentDirection,
      externalCraftCount,
    };
  }, [config, projectId, sessionId]);

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Eye size={15} />
        {L4(language, { ko: "노아가 참고하는 작품 정보", en: "Work info Noa will use" })}
        <button
          type="button"
          className="mini-btn"
          style={{ marginLeft: "auto" }}
          aria-expanded={open}
          aria-label={L4(language, {
            ko: "노아가 참고하는 작품 정보 접기/펼치기",
            en: "Expand or collapse the work info Noa will use",
          })}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? L4(language, { ko: "접기", en: "Collapse" })
            : L4(language, { ko: "펼치기", en: "Expand" })}
        </button>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "반영 범위", en: "Reference range" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.pack.modeLabel}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "참조 근거", en: "Referenced sources" })}
        <b style={{ marginLeft: "auto" }}>
          {L4(language, {
            ko: `${ctx.activeRefs}개 채택 · ${ctx.pack.omitted.length}개 제외`,
            en: `${ctx.activeRefs} adopted · ${ctx.pack.omitted.length} excluded`,
          })}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "회차", en: "Episode" })}
        <b style={{ marginLeft: "auto" }}>
          EP {config.episode}
          {config.totalEpisodes ? ` / ${config.totalEpisodes}` : ""}
        </b>
      </div>
      <div className="wr-srow">
        <span className={`rdot ${ctx.currentDirection ? "blue" : "gray"}`} />
        {L4(language, { ko: "연출", en: "Direction" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.currentDirection
            ? L4(language, { ko: "반영됨", en: "Included" })
            : L4(language, { ko: "아직 없음", en: "Not set" })}
        </b>
      </div>
      <div className="wr-srow">
        <span className={`rdot ${ctx.currentSceneSheet ? "blue" : "gray"}`} />
        {L4(language, { ko: "씬시트", en: "Scene sheet" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.currentSceneSheet
            ? L4(language, { ko: "현 회차 기준", en: "Current episode" })
            : L4(language, { ko: "현 회차 없음", en: "None for this ep." })}
        </b>
      </div>
      <div className="wr-srow">
        <span className={`rdot ${ctx.externalCraftCount > 0 ? "blue" : "gray"}`} />
        {L4(language, { ko: "외부 기법 브릿지", en: "External craft bridge" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.externalCraftCount > 0
            ? L4(language, { ko: `${ctx.externalCraftCount}개 연결`, en: `${ctx.externalCraftCount} linked` })
            : L4(language, { ko: "없음", en: "None" })}
        </b>
      </div>
      <div className="wr-srow">
        <span className={`rdot ${ctx.pack.hardStopReasons.length ? "amber" : "blue"}`} />
        {L4(language, { ko: "초안 준비", en: "Draft readiness" })}
        <b style={{ marginLeft: "auto" }}>
          {ctx.pack.hardStopReasons.length
            ? L4(language, { ko: "검토 필요", en: "Needs review" })
            : ctx.summary.label}
        </b>
      </div>
      {open && (
        <>
          <pre
            style={{
              maxHeight: 220,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "var(--c-sub, #888)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 8,
              margin: "8px 0 0",
              background: "transparent",
            }}
          >
            {ctx.pack.preview}
          </pre>
          {ctx.pack.hardStopReasons.length > 0 && (
            <div className="wr-srow" style={{ color: "var(--c-amber, #9a6a00)", marginTop: 8 }}>
              {ctx.pack.hardStopReasons.join(" / ")}
            </div>
          )}
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
            {L4(language, {
              ko: "노아는 제안하고, 작가는 결정하며, Loreguard는 과정을 기록합니다.",
              en: "Noa suggests, the author decides, and Loreguard records the process.",
            })}
          </div>
        </>
      )}
    </div>
  );
});
