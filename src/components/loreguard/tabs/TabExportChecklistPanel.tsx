import type { IPReadinessParts, IPReadinessResult } from "@/lib/creative/ip-readiness";
import type { EpisodeManuscript } from "@/lib/studio-types";
import type { checkPlatformFit, PLATFORM_SPECS } from "@/lib/writing-workspace/export-spec";
import IdeResizablePanel from "../IdeResizablePanel";
import { Book, Download, Flag, Scale } from "../icons";

type PlatformFitRow = {
  spec: (typeof PLATFORM_SPECS)[number];
  fit: ReturnType<typeof checkPlatformFit>;
};

type TabExportChecklistPanelProps = {
  target: EpisodeManuscript | undefined;
  platformFits: PlatformFitRow[];
  ipParts: IPReadinessParts;
  ipResult: IPReadinessResult;
  onChangeIpPart: (key: keyof IPReadinessParts, value: number) => void;
};

const IP_PART_LABELS: Array<{ key: keyof IPReadinessParts; labelKo: string }> = [
  { key: "rights", labelKo: "권리성" },
  { key: "market", labelKo: "시장성" },
  { key: "adaptation", labelKo: "매체전환성" },
  { key: "assetPackage", labelKo: "패키지성" },
  { key: "riskControl", labelKo: "리스크관리" },
];

function readinessLabelKo(score: number): string {
  if (score >= 80) return "제안 준비";
  if (score >= 55) return "보강 권장";
  return "필수 보강";
}

export default function TabExportChecklistPanel({
  target,
  platformFits,
  ipParts,
  ipResult,
  onChangeIpPart,
}: TabExportChecklistPanelProps) {
  return (
    <IdeResizablePanel
      id="export-checklist"
      side="right"
      className="wd-board"
      ariaLabel="출고 점검 패널"
      stripLabel="출고"
      defaultWidth={460}
      minWidth={300}
      maxWidth={960}
    >
      <div className="wr-panel-head" style={{ marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Download size={15} />
          출고 보조 패널
        </span>
        <span className="pill gray">패키지</span>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Book size={15} />
          선택 원고
          <span className="pill gray" style={{ marginLeft: "auto" }}>
            {target ? `EP.${target.episode}` : "없음"}
          </span>
        </div>
        <div className="wr-srow">제목 <b>{target?.title || "무제"}</b></div>
        <div className="wr-srow">자수 <b>{(target?.charCount ?? target?.content.length ?? 0).toLocaleString()}</b></div>
        <div className="wr-srow">수정일 <b>{target?.lastUpdate ? new Date(target.lastUpdate).toLocaleDateString() : "-"}</b></div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Scale size={15} />
          플랫폼 자수
        </div>
        {platformFits.length === 0 ? (
          <div className="wr-srow" style={{ color: "var(--ink-3)" }}>점검할 저장 원고 없음</div>
        ) : (
          platformFits.map(({ spec, fit }) => (
            <div key={spec.id} className="wr-srow">
              <span className={"rdot " + (fit.withinRange ? "green" : "amber")} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {spec.label}
                <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                  기준일 {fit.checkedAt} · {fit.unitLabelKo} · {spec.sourceSummaryKo}
                </span>
              </span>
              <b>{fit.note}</b>
            </div>
          ))
        )}
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Flag size={15} />
          IP 준비도
          <span className="pill gray" style={{ marginLeft: "auto" }}>
            {readinessLabelKo(ipResult.score)}
          </span>
        </div>
        {IP_PART_LABELS.map(({ key, labelKo }) => (
          <div key={key} className="wr-srow" style={{ gap: 8 }}>
            <span style={{ width: 78, flexShrink: 0 }}>{labelKo}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={ipParts[key]}
              aria-label={`${labelKo} 자가 평가`}
              onChange={(event) => onChangeIpPart(key, Number(event.target.value))}
              style={{ flex: 1, minWidth: 0 }}
            />
            <b style={{ width: 64, textAlign: "right" }}>{readinessLabelKo(ipParts[key])}</b>
          </div>
        ))}
      </div>
    </IdeResizablePanel>
  );
}
