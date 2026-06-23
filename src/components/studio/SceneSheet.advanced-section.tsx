"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { L4 } from "@/lib/i18n";
import {
  DOPAMINE_DEVICES,
  type CanonEntry,
  type DopamineEntry,
  type Lang,
  type PacingEntry,
  type TensionPoint,
  type TransitionEntry,
} from "./SceneSheet.data";
import { PlotBarEditor } from "./SceneSheet.parts";

type SceneSheetAdvancedSectionProps = {
  canons: CanonEntry[];
  dopamines: DopamineEntry[];
  lang: Lang;
  pacings: PacingEntry[];
  plotStructure: string;
  tensionPoints: TensionPoint[];
  transitions: TransitionEntry[];
  setCanons: Dispatch<SetStateAction<CanonEntry[]>>;
  setDopamines: Dispatch<SetStateAction<DopamineEntry[]>>;
  setPacings: Dispatch<SetStateAction<PacingEntry[]>>;
  setPlotStructure: Dispatch<SetStateAction<string>>;
  setTensionPoints: Dispatch<SetStateAction<TensionPoint[]>>;
  setTransitions: Dispatch<SetStateAction<TransitionEntry[]>>;
};

const PACING_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

function bindPacingSegment(node: HTMLDivElement | null, width: number, color: string) {
  if (!node) return;
  node.style.setProperty("--scene-segment-width", `${width}%`);
  node.style.setProperty("--scene-segment-color", color);
}

export function SceneSheetAdvancedSection({
  canons,
  dopamines,
  lang,
  pacings,
  plotStructure,
  tensionPoints,
  transitions,
  setCanons,
  setDopamines,
  setPacings,
  setPlotStructure,
  setTensionPoints,
  setTransitions,
}: SceneSheetAdvancedSectionProps) {
  const sortedTensionPoints = useMemo(
    () => [...tensionPoints].sort((a, b) => a.position - b.position),
    [tensionPoints],
  );

  return (
    <details className="pt-2">
      <summary className="flex items-center gap-1 cursor-pointer text-[13px] font-bold tracking-wider text-text-tertiary hover:text-text-secondary select-none py-2 min-h-[44px]">
        <span className="text-[10px]">&#9654;</span>
        {L4(lang, { ko: "고급 설정", en: "Advanced Settings", ja: "詳細設定", zh: "高级设置" })}
      </summary>
      <div className="space-y-4 pt-2">
        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {L4(lang, { ko: "도파민 장치", en: "Dopamine Devices", ja: "Dopamine Devices", zh: "Dopamine Devices" })}
          </span>
          <button
            onClick={() => setDopamines((prev) => [...prev, { id: `dp-${Date.now()}`, scale: "medium", device: "growth", desc: "", resolved: false }])}
            className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]"
          >
            + {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          </button>
          {dopamines.map((dopamine, index) => (
            <div key={dopamine.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <select
                value={dopamine.scale}
                onChange={(event) => setDopamines((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, scale: event.target.value as "micro" | "medium" | "macro" } : item)))}
                className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[9px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 uppercase min-h-[44px]"
              >
                <option value="micro">{L4(lang, { ko: "소", en: "Micro", ja: "Micro", zh: "Micro" })}</option>
                <option value="medium">{L4(lang, { ko: "중", en: "Medium", ja: "Medium", zh: "Medium" })}</option>
                <option value="macro">{L4(lang, { ko: "대", en: "Macro", ja: "Macro", zh: "Macro" })}</option>
              </select>
              <select
                value={dopamine.device}
                onChange={(event) => setDopamines((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, device: event.target.value } : item)))}
                className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
              >
                {DOPAMINE_DEVICES.map((device) => <option key={device.id} value={device.id}>{L4(lang, device)}</option>)}
              </select>
              <input
                value={dopamine.desc}
                onChange={(event) => setDopamines((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, desc: event.target.value } : item)))}
                placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })}
                maxLength={500}
                className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
              />
              <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                <input type="checkbox" checked={dopamine.resolved} onChange={(event) => setDopamines((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, resolved: event.target.checked } : item)))} className="accent-accent-green" />
                {L4(lang, { ko: "회수", en: "Resolved", ja: "Resolved", zh: "Resolved" })}
              </label>
              <button onClick={() => setDopamines((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `도파민 ${index + 1} 삭제`, en: `Delete dopamine ${index + 1}`, ja: `ドーパミン ${index + 1} を削除`, zh: `删除多巴胺 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>

        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {L4(lang, { ko: "캐릭터 규칙", en: "Canon Rules", ja: "キャラクタールール", zh: "角色规则" })}
          </span>
          <button onClick={() => setCanons((prev) => [...prev, { id: `cn-${Date.now()}`, character: "", rule: "" }])} className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">
            + {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          </button>
          {canons.map((canon, index) => (
            <div key={canon.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <input value={canon.character} onChange={(event) => setCanons((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, character: event.target.value } : item)))} placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <input value={canon.rule} onChange={(event) => setCanons((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, rule: event.target.value } : item)))} placeholder={L4(lang, { ko: "규칙", en: "Rule", ja: "Rule", zh: "Rule" })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <button onClick={() => setCanons((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `캐논 규칙 ${index + 1} 삭제`, en: `Delete canon rule ${index + 1}`, ja: `キャノン ${index + 1} を削除`, zh: `删除规则 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>

        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {L4(lang, { ko: "장면 전환", en: "Scene Transitions", ja: "シーン転換", zh: "场景切换" })}
          </span>
          <button onClick={() => setTransitions((prev) => [...prev, { id: `tr-${Date.now()}`, fromScene: "", toScene: "", method: "" }])} className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">
            + {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          </button>
          {transitions.map((transition, index) => (
            <div key={transition.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <input value={transition.fromScene} onChange={(event) => setTransitions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, fromScene: event.target.value } : item)))} placeholder={L4(lang, { ko: "장면 A", en: "Scene A", ja: "シーン A", zh: "场景 A" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <span className="text-text-tertiary text-xs">&#8594;</span>
              <input value={transition.toScene} onChange={(event) => setTransitions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, toScene: event.target.value } : item)))} placeholder={L4(lang, { ko: "장면 B", en: "Scene B", ja: "シーン B", zh: "场景 B" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <input value={transition.method} onChange={(event) => setTransitions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, method: event.target.value } : item)))} placeholder={L4(lang, { ko: "전환 방법", en: "Method", ja: "Method", zh: "Method" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <button onClick={() => setTransitions((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `전환 ${index + 1} 삭제`, en: `Delete transition ${index + 1}`, ja: `トランジション ${index + 1} を削除`, zh: `删除转场 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>

        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {L4(lang, { ko: "분량 배분", en: "Pacing", ja: "Pacing", zh: "Pacing" })}
          </span>
          <div className="flex rounded-lg overflow-hidden h-8 border border-border mt-1.5">
            {pacings.map((pacing, index) => (
              <div
                key={pacing.id}
                ref={(node) => bindPacingSegment(node, pacing.percent, PACING_COLORS[index] ?? PACING_COLORS[PACING_COLORS.length - 1])}
                className="flex items-center justify-center text-[9px] font-bold text-white scene-segment-cell"
              >
                {pacing.section} {pacing.percent}%
              </div>
            ))}
          </div>
          {pacings.map((pacing, index) => (
            <div key={pacing.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <span className="text-[10px] font-bold w-16">{pacing.section}</span>
              <input type="range" min={5} max={80} value={pacing.percent} aria-label={L4(lang, { ko: "페이싱 비중", en: "Pacing weight", ja: "Pacing weight", zh: "Pacing weight" })} onChange={(event) => setPacings((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, percent: parseInt(event.target.value) } : item)))} className="flex-1 h-1 accent-accent-purple" />
              <span className="text-[10px] font-bold text-accent-purple w-8 text-right">{pacing.percent}%</span>
            </div>
          ))}
        </div>

        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {L4(lang, { ko: "플롯 구조", en: "Plot Structure", ja: "Plot Structure", zh: "Plot Structure" })}
          </span>
          <div className="mt-1.5">
            <PlotBarEditor lang={lang} onPlotChange={setPlotStructure} initialPlot={plotStructure} />
          </div>
        </div>

        {tensionPoints.length > 1 && (
          <div>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
              {L4(lang, { ko: "텐션 곡선 (상세)", en: "Tension Curve (Detail)", ja: "Tension Curve (Detail)", zh: "Tension Curve (Detail)" })}
            </span>
            <div className="relative h-24 border border-border rounded-lg bg-bg-primary overflow-hidden mt-1.5">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "텐션 곡선", en: "Tension curve", ja: "Tension curve", zh: "Tension curve" })}>
                {tensionPoints.length >= 2 && <polyline fill="none" stroke="var(--color-accent-red)" strokeWidth="0.8" points={sortedTensionPoints.map((point) => `${point.position},${50 - point.level / 2}`).join(" ")} />}
                {tensionPoints.map((point) => <circle key={point.id} cx={point.position} cy={50 - point.level / 2} r="2" fill="var(--color-accent-red)" />)}
              </svg>
            </div>
            <button onClick={() => setTensionPoints((prev) => [...prev, { id: `tp-${Date.now()}`, position: prev.length * 20, level: 50, label: "" }])} className="mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">
              + {L4(lang, { ko: "텐션 포인트", en: "Tension Point", ja: "Tension Point", zh: "Tension Point" })}
            </button>
            {tensionPoints.map((point, index) => (
              <div key={point.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                <input value={point.label} onChange={(event) => setTensionPoints((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))} placeholder={L4(lang, { ko: "라벨", en: "Label", ja: "Label", zh: "Label" })} maxLength={100} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                <span className="text-[9px] text-text-tertiary">Pos</span>
                <input type="range" min={0} max={100} value={point.position} aria-label="position" onChange={(event) => setTensionPoints((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: parseInt(event.target.value) } : item)))} className="w-16 h-1 accent-accent-purple" />
                <span className="text-[9px] text-text-tertiary">Lv</span>
                <input type="range" min={0} max={100} value={point.level} aria-label="level" onChange={(event) => setTensionPoints((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, level: parseInt(event.target.value) } : item)))} className="w-16 h-1 accent-accent-red" />
                <span className="text-[9px] font-bold text-accent-red w-6">{point.level}</span>
                <button onClick={() => setTensionPoints((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `긴장점 ${index + 1} 삭제`, en: `Delete tension point ${index + 1}`, ja: `テンション点 ${index + 1} を削除`, zh: `删除张力点 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
