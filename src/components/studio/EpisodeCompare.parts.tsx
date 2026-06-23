"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { ProgressFill } from "@/components/studio/ProgressFill";
import type { AppLanguage } from "@/lib/studio-types";
import {
  COMPARE_PALETTE,
  MAX_COMPARE,
  METRIC_COLORS,
  METRIC_KEYS,
  METRIC_LABELS,
  type DrilldownData,
  type EpMetric,
  type MetricKey,
} from "@/components/studio/EpisodeCompare.model";

function bindStudioBarHeight(node: HTMLDivElement | null, height: string) {
  if (!node) return;
  node.style.setProperty("--studio-bar-height", height);
}

function bindEpisodeCompareTone(node: HTMLElement | null, color?: string) {
  if (!node || !color) return;
  node.style.setProperty("--episode-compare-color", color);
  node.style.setProperty("--episode-compare-color-soft", `${color}15`);
}

export function FullTrendSparkline({
  metrics,
  language,
}: {
  metrics: EpMetric[];
  language: AppLanguage;
}) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<MetricKey, boolean>>({
    tension: true,
    pacing: true,
    immersion: true,
    eos: true,
  });

  if (metrics.length < 2) return null;

  const isKO = language === "KO";
  const w = 600;
  const h = 100;
  const padX = 24;
  const padY = 12;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-black/20 border border-border/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          {isKO ? "전체 에피소드 추이" : "Full Series Trajectory"}
        </h4>
        <div className="flex gap-2">
          {METRIC_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={`flex items-center gap-1 text-[8px] font-bold uppercase transition-opacity ${
                visibleMetrics[key] ? "opacity-100" : "opacity-30"
              }`}
            >
              <div className={`w-2 h-2 rounded-full episode-metric-dot ${key}`} />
              {METRIC_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" role="img" aria-label="Full trend sparkline">
        {[25, 50, 75].map((value) => (
          <line
            key={value}
            x1={padX}
            y1={padY + chartH - (value / 100) * chartH}
            x2={w - padX}
            y2={padY + chartH - (value / 100) * chartH}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        {METRIC_KEYS.filter((key) => visibleMetrics[key]).map((key) => {
          const color = METRIC_COLORS[key];
          const points = metrics
            .map((metric, index) => {
              const x = padX + (metrics.length > 1 ? (index / (metrics.length - 1)) * chartW : chartW / 2);
              const y = padY + chartH - (metric[key] / 100) * chartH;
              return `${x},${y}`;
            })
            .join(" ");
          const areaPoints = [
            `${padX},${padY + chartH}`,
            ...metrics.map((metric, index) => {
              const x = padX + (metrics.length > 1 ? (index / (metrics.length - 1)) * chartW : chartW / 2);
              const y = padY + chartH - (metric[key] / 100) * chartH;
              return `${x},${y}`;
            }),
            `${padX + chartW},${padY + chartH}`,
          ].join(" ");

          return (
            <g key={key}>
              <polygon fill={`${color}08`} points={areaPoints} />
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
                opacity="0.8"
              />
            </g>
          );
        })}

        {metrics
          .reduce<Array<{ metric: EpMetric; index: number }>>((acc, metric, index) => {
            if (
              index === 0 ||
              index === metrics.length - 1 ||
              (index + 1) % Math.max(1, Math.ceil(metrics.length / 10)) === 0
            ) {
              acc.push({ metric, index });
            }
            return acc;
          }, [])
          .map(({ metric, index }) => {
            const x = padX + (metrics.length > 1 ? (index / (metrics.length - 1)) * chartW : chartW / 2);
            return (
              <text key={metric.index} x={x} y={h - 1} fill="rgba(255,255,255,0.2)" fontSize="6" textAnchor="middle">
                {metric.index}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

export function EpisodeSelector({
  metrics,
  selected,
  onToggle,
  language,
}: {
  metrics: EpMetric[];
  selected: number[];
  onToggle: (idx: number) => void;
  language: AppLanguage;
}) {
  const isKO = language === "KO";
  const deltaMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let index = 1; index < metrics.length; index++) {
      map.set(metrics[index].index, metrics[index].tension - metrics[index - 1].tension);
    }
    return map;
  }, [metrics]);

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
        {isKO ? `비교할 에피소드 선택 (최대 ${MAX_COMPARE})` : `Select episodes to compare (max ${MAX_COMPARE})`}
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
        {metrics.map((metric) => {
          const selectedIndex = selected.indexOf(metric.index);
          const isSelected = selectedIndex >= 0;
          const color = isSelected ? COMPARE_PALETTE[selectedIndex % COMPARE_PALETTE.length] : undefined;
          const delta = deltaMap.get(metric.index);
          return (
            <button
              key={metric.index}
              ref={(node) => bindEpisodeCompareTone(node, color)}
              onClick={() => onToggle(metric.index)}
              disabled={!isSelected && selected.length >= MAX_COMPARE}
              className={`relative p-2 rounded-lg border text-center transition-[transform,opacity,background-color,border-color,color] ${
                isSelected
                  ? "text-white episode-selected-card"
                  : "border-border/50 text-text-tertiary hover:border-white/20 disabled:opacity-30"
              }`}
            >
              {delta != null && delta !== 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 text-[7px] font-black px-1 py-px rounded-full leading-none ${
                    delta > 0 ? "bg-green-500/20 text-green-400" : "bg-accent-red/20 text-accent-red"
                  }`}
                >
                  {delta > 0 ? `▲+${delta}` : `▼${delta}`}
                </span>
              )}
              <div className="text-xs font-black">#{metric.index}</div>
              <div className="text-[8px] opacity-60">{metric.grade}</div>
              <div className="flex gap-px mt-1 h-1.5">
                <div
                  ref={(node) => bindStudioBarHeight(node, `${metric.tension * 1.5}%`)}
                  className="flex-1 rounded-sm bg-accent-red/40 studio-bar-height"
                />
                <div
                  ref={(node) => bindStudioBarHeight(node, `${metric.pacing * 1.5}%`)}
                  className="flex-1 rounded-sm bg-accent-blue/40 studio-bar-height"
                />
                <div
                  ref={(node) => bindStudioBarHeight(node, `${metric.immersion * 1.5}%`)}
                  className="flex-1 rounded-sm bg-green-500/40 studio-bar-height"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OverlayChart({
  episodes,
  language,
  onEpisodeClick,
}: {
  episodes: EpMetric[];
  language: AppLanguage;
  onEpisodeClick?: (idx: number) => void;
}) {
  if (episodes.length === 0) return null;

  const w = 400;
  const h = 160;
  const padX = 30;
  const padY = 15;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" role="img" aria-label="Episode comparison chart">
        {[25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={padX}
              y1={padY + chartH - (value / 100) * chartH}
              x2={w - padX}
              y2={padY + chartH - (value / 100) * chartH}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
            <text x={padX - 4} y={padY + chartH - (value / 100) * chartH + 3} fill="rgba(255,255,255,0.2)" fontSize="7" textAnchor="end">
              {value}
            </text>
          </g>
        ))}

        {METRIC_KEYS.map((key, index) => {
          const x = padX + (index / (METRIC_KEYS.length - 1)) * chartW;
          return (
            <text key={key} x={x} y={h - 2} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="middle" className="episode-axis-label">
              {key.slice(0, 3).toUpperCase()}
            </text>
          );
        })}

        {episodes.map((episode, episodeIndex) => {
          const color = COMPARE_PALETTE[episodeIndex % COMPARE_PALETTE.length];
          const points = METRIC_KEYS.map((key, index) => {
            const x = padX + (index / (METRIC_KEYS.length - 1)) * chartW;
            const y = padY + chartH - (episode[key] / 100) * chartH;
            return `${x},${y}`;
          }).join(" ");

          return (
            <g key={episode.index}>
              <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points} />
              {METRIC_KEYS.map((key, index) => {
                const x = padX + (index / (METRIC_KEYS.length - 1)) * chartW;
                const y = padY + chartH - (episode[key] / 100) * chartH;
                return (
                  <g key={`${episode.index}-${key}`}>
                    <circle cx={x} cy={y} r="3.5" fill={color} />
                    <text x={x} y={y - 7} fill={color} fontSize="7" textAnchor="middle" fontWeight="bold">
                      {episode[key]}
                    </text>
                  </g>
                );
              })}
              <text
                x={w - padX + 5}
                y={padY + chartH - (episode[METRIC_KEYS[METRIC_KEYS.length - 1]] / 100) * chartH + 3}
                fill={color}
                fontSize="8"
                fontWeight="bold"
                className="cursor-pointer"
                onClick={() => onEpisodeClick?.(episode.index)}
              >
                #{episode.index}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-text-tertiary uppercase tracking-wider">
              <th className="text-left py-1 px-2">{language === "KO" ? "지표" : "Metric"}</th>
              {episodes.map((episode, index) => (
                <th
                  key={episode.index}
                  ref={(node) => bindEpisodeCompareTone(node, COMPARE_PALETTE[index])}
                  className="text-center py-1 px-2 cursor-pointer hover:underline episode-compare-tone-text"
                  onClick={() => onEpisodeClick?.(episode.index)}
                >
                  #{episode.index} ({episode.grade})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["tension", language === "KO" ? "긴장감" : "Tension"],
                ["pacing", language === "KO" ? "호흡" : "Pacing"],
                ["immersion", language === "KO" ? "몰입도" : "Immersion"],
                ["eos", language === "KO" ? "분량" : "Volume"],
                ["charCount", language === "KO" ? "글자수" : "Chars"],
                ["dialogueRatio", language === "KO" ? "대화비율" : "Dialogue%"],
                ["avgSentenceLen", language === "KO" ? "평균문장길이" : "Avg Sent Len"],
              ] as [keyof EpMetric, string][]
            ).map(([key, label]) => {
              const values = episodes.map((episode) => episode[key] as number);
              const max = Math.max(...values);
              const min = Math.min(...values);
              return (
                <tr key={key} className="border-t border-border/30">
                  <td className="py-1.5 px-2 text-text-tertiary font-bold">{label}</td>
                  {episodes.map((episode) => {
                    const value = episode[key] as number;
                    const isMax = value === max && episodes.length > 1;
                    const isMin = value === min && episodes.length > 1;
                    return (
                      <td
                        key={episode.index}
                        className={`py-1.5 px-2 text-center font-bold ${
                          isMax ? "text-green-400" : isMin ? "text-accent-red" : "text-text-secondary"
                        }`}
                      >
                        {key === "charCount"
                          ? value.toLocaleString()
                          : key === "dialogueRatio" || key === "avgSentenceLen"
                            ? value
                            : `${value}%`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DrilldownPanel({
  data,
  language,
  onClose,
}: {
  data: DrilldownData;
  language: AppLanguage;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isKO = language === "KO";
  const previewLen = 500;
  const textPreview = data.fullText.slice(0, previewLen);
  const hasMore = data.fullText.length > previewLen;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-text-tertiary" />
          {isKO ? `에피소드 #${data.index} 상세` : `Episode #${data.index} Drilldown`}
        </h3>
        <button onClick={onClose} className="text-[9px] text-text-tertiary hover:text-white transition-colors uppercase tracking-wider font-bold">
          {isKO ? "닫기" : "Close"}
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? "본문 미리보기" : "Text Preview"}
        </p>
        <div className="bg-black/20 rounded-lg p-3 text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          {expanded ? data.fullText : textPreview}
          {hasMore && !expanded && "..."}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[8px] text-text-tertiary hover:text-white transition-colors font-bold uppercase"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? (isKO ? "접기" : "Show less") : isKO ? "더 보기" : "Show more"}
          </button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? "문단별 긴장감 / 호흡" : "Per-Paragraph Tension / Pacing"}
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.paragraphs.map((paragraph, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 p-1.5 rounded-md text-[8px] ${
                index === data.highDialogueParagraphIdx
                  ? "bg-purple-500/10 border border-purple-500/20"
                  : "bg-black/10"
              }`}
            >
              <span className="text-text-tertiary font-mono w-5 shrink-0 text-right">P{index + 1}</span>
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden" title={`Tension: ${paragraph.tension}`}>
                <ProgressFill value={paragraph.tension} className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color] episode-metric-fill tension" />
              </div>
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden" title={`Pacing: ${paragraph.pacing}`}>
                <ProgressFill value={paragraph.pacing} className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color] episode-metric-fill pacing" />
              </div>
              {paragraph.isDialogue && <span className="text-[7px] text-purple-400 font-bold shrink-0">DLG</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[7px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-1 rounded-full episode-metric-dot tension" />
            {isKO ? "긴장감" : "Tension"}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-1 rounded-full episode-metric-dot pacing" />
            {isKO ? "호흡" : "Pacing"}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-1 rounded-sm bg-purple-500/30" />
            {isKO ? "최다대화 문단" : "Top dialogue para"}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? "주요 문장" : "Key Sentences"}
        </p>
        <div className="space-y-1.5">
          {data.longestSentence && (
            <div className="bg-black/10 rounded-lg p-2">
              <span className="text-[7px] text-text-tertiary uppercase font-bold block mb-0.5">
                {isKO ? "최장 문장" : "Longest"}
              </span>
              <p className="text-[9px] text-text-secondary leading-relaxed">
                {data.longestSentence.slice(0, 200)}
                {data.longestSentence.length > 200 ? "..." : ""}
              </p>
            </div>
          )}
          {data.shortestSentence && (
            <div className="bg-black/10 rounded-lg p-2">
              <span className="text-[7px] text-text-tertiary uppercase font-bold block mb-0.5">
                {isKO ? "최단 문장" : "Shortest"}
              </span>
              <p className="text-[9px] text-text-secondary leading-relaxed">{data.shortestSentence}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
