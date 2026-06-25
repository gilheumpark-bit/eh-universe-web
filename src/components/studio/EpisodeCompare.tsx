"use client";

import { useCallback, useMemo, useState } from "react";
import { BarChart3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  DrilldownPanel,
  EpisodeSelector,
  FullTrendSparkline,
  OverlayChart,
} from "@/components/studio/EpisodeCompare.parts";
import {
  MAX_COMPARE,
  METRIC_KEYS,
  extractDrilldown,
  extractEpMetrics,
  type EpMetric,
  type MetricKey,
  type Props,
} from "@/components/studio/EpisodeCompare.model";
import type { AppLanguage } from "@/lib/studio-types";

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 3) return <Minus className="w-3 h-3 text-text-tertiary" />;
  if (diff > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
  return <TrendingDown className="w-3 h-3 text-accent-red" />;
}

function TrendSection({ metrics, language }: { metrics: EpMetric[]; language: AppLanguage }) {
  if (metrics.length < 3) return null;

  const isKO = language === "KO";
  const windowSize = Math.min(5, Math.floor(metrics.length / 2));
  const recent = metrics.slice(-windowSize);
  const previous = metrics.slice(-windowSize * 2, -windowSize);

  if (previous.length === 0) return null;

  const avgOf = (arr: EpMetric[], key: MetricKey) =>
    Math.round(arr.reduce((sum, metric) => sum + metric[key], 0) / arr.length);

  return (
    <div className="bg-black/20 border border-border/30 rounded-xl p-3 space-y-2">
      <h4 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5" />
        {isKO ? `최근 ${windowSize}화 vs 이전 ${previous.length}화` : `Last ${windowSize} vs prev ${previous.length}`}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {METRIC_KEYS.map((key) => {
          const current = avgOf(recent, key);
          const previousValue = avgOf(previous, key);
          const diff = current - previousValue;
          return (
            <div key={key} className="flex items-center gap-2 bg-bg-secondary/50 rounded-lg px-3 py-2">
              <div className={`w-2 h-2 rounded-full shrink-0 episode-metric-dot ${key}`} />
              <div className="min-w-0">
                <div className="text-[9px] text-text-tertiary uppercase">{key.slice(0, 3)}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-white">{current}%</span>
                  <TrendIndicator current={current} previous={previousValue} />
                  <span
                    className={`text-[8px] font-bold ${
                      diff > 0 ? "text-green-400" : diff < 0 ? "text-accent-red" : "text-text-tertiary"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EpisodeCompare({ messages, language }: Props) {
  const isKO = language === "KO";
  const metrics = useMemo(() => extractEpMetrics(messages), [messages]);
  const [selected, setSelected] = useState<number[]>([]);
  const [drilldownIdx, setDrilldownIdx] = useState<number | null>(null);

  const toggleEpisode = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx)
        ? prev.filter((item) => item !== idx)
        : prev.length < MAX_COMPARE
          ? [...prev, idx]
          : prev,
    );
  };

  const handleDrilldown = useCallback((idx: number) => {
    setDrilldownIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const selectedEpisodes = useMemo(
    () => selected.map((idx) => metrics.find((metric) => metric.index === idx)).filter((metric): metric is EpMetric => Boolean(metric)),
    [selected, metrics],
  );

  const drilldownData = useMemo(() => {
    if (drilldownIdx == null) return null;
    return extractDrilldown(messages, drilldownIdx);
  }, [drilldownIdx, messages]);

  if (metrics.length < 2) {
    return (
      <div className="text-center py-8 text-text-tertiary text-xs">
        {isKO ? "비교하려면 최소 2개 챕터가 필요합니다." : "Need at least 2 chapters to compare."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FullTrendSparkline metrics={metrics} language={language} />
      <TrendSection metrics={metrics} language={language} />
      <EpisodeSelector metrics={metrics} selected={selected} onToggle={toggleEpisode} language={language} />

      {selectedEpisodes.length > 0 ? (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            {isKO ? "에피소드 비교" : "Episode Comparison"}
            <span className="ml-2 text-[8px] text-text-tertiary font-normal">
              {isKO ? "(헤더 클릭 시 상세 분석)" : "(click header to drill down)"}
            </span>
          </h3>
          <OverlayChart episodes={selectedEpisodes} language={language} onEpisodeClick={handleDrilldown} />
        </div>
      ) : (
        <div className="text-center py-6 text-text-tertiary text-[10px] border border-border/30 border-dashed rounded-xl">
          {isKO ? "위에서 에피소드를 선택하면 비교 차트가 표시됩니다" : "Select episodes above to see comparison chart"}
        </div>
      )}

      {drilldownData && (
        <DrilldownPanel data={drilldownData} language={language} onClose={() => setDrilldownIdx(null)} />
      )}
    </div>
  );
}
