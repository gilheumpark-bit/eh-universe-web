import type { IPReadinessParts, IPReadinessResult } from "@/lib/creative/ip-readiness";
import type { EpisodeManuscript } from "@/lib/studio-types";
import type { checkPlatformFit, PLATFORM_SPECS } from "@/lib/writing-workspace/export-spec";
import IdeResizablePanel, { type IdeCollapsedSummaryItem } from "../IdeResizablePanel";
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
  const fitReadyCount = platformFits.filter((item) => item.fit.withinRange).length;
  const collapsedSummary: IdeCollapsedSummaryItem[] = [
    { label: "현재", value: target ? `EP${target.episode}` : "-", tone: target ? "green" : "gray" },
    {
      label: "적합",
      value: `${fitReadyCount}/${platformFits.length || 5}`,
      tone: fitReadyCount > 0 ? "blue" : target ? "amber" : "gray",
    },
    {
      label: "IP",
      value: ipResult.tier,
      tone: ipResult.score >= 80 ? "green" : ipResult.score >= 55 ? "amber" : "red",
    },
  ];

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
      collapsedSummary={collapsedSummary}
    >
      <div className="wr-panel-head tex-checklist-head">
        <span className="tex-head-label">
          <Download size={15} />
          출고 보조 패널
        </span>
        <span className="pill gray">패키지</span>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Book size={15} />
          선택 원고
          <span className="pill gray tex-push">
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
          <div className="wr-srow tex-muted-row">점검할 저장 원고 없음</div>
        ) : (
          platformFits.map(({ spec, fit }) => (
            <div key={spec.id} className="wr-srow">
              <span className={"rdot " + (fit.withinRange ? "green" : "amber")} />
              <span className="tex-row-body">
                {spec.label}
                <span className="tex-meta-line">
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
          <span className="pill gray tex-push">
            {readinessLabelKo(ipResult.score)}
          </span>
        </div>
        {IP_PART_LABELS.map(({ key, labelKo }) => (
          <div key={key} className="wr-srow tex-range-row">
            <span className="tex-range-label">{labelKo}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={ipParts[key]}
              aria-label={`${labelKo} 자가 평가`}
              onChange={(event) => onChangeIpPart(key, Number(event.target.value))}
              className="tex-range-input"
            />
            <b className="tex-range-value">{readinessLabelKo(ipParts[key])}</b>
          </div>
        ))}
      </div>
    </IdeResizablePanel>
  );
}
