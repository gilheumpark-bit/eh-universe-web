
import React from 'react';
import { Activity, Zap, Database, ShieldCheck, AlertCircle, Cpu, BarChart3 } from 'lucide-react';
import { StoryConfig, AppLanguage } from '@/lib/studio-types';
import { EngineReport, PlatformType } from '@/engine/types';
import { generateTensionCurveData } from '@/engine/models';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { bytesToEstimatedChars, getTargetCharRange } from '@/engine/serialization';

interface EngineDashboardProps {
  config: StoryConfig;
  report: EngineReport | null;
  isGenerating: boolean;
  language: AppLanguage;
}

const EngineDashboard: React.FC<EngineDashboardProps> = ({ config, report, isGenerating }) => {
  const totalEpisodes = config.totalEpisodes ?? 25;
  const tensionData = generateTensionCurveData(totalEpisodes, config.genre);

  return (
    <div className="h-full bg-zinc-950 border-l border-zinc-800 flex flex-col w-80 text-xs font-mono overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
        <h2 className="text-zinc-100 font-black flex items-center gap-2 tracking-widest uppercase">
          <Zap className="w-4 h-4 text-blue-500" />
          ANS {ENGINE_VERSION}
        </h2>
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-blue-500 animate-ping' : 'bg-zinc-700'}`} />
          <span className="text-zinc-500 font-bold uppercase tracking-tighter">
            {isGenerating ? "Generating..." : "Idle"}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Context Status */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-3 h-3" /> Context
          </div>
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Platform</span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-black">
                {config.platform === PlatformType.WEB ? 'WEB' : 'MOBILE'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Episode</span>
              <span className="text-zinc-300">{config.episode} / {totalEpisodes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Genre</span>
              <span className="text-zinc-300">{config.genre}</span>
            </div>
            {report && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Characters</span>
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Tension Arc - Real Data */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3" /> Tension Arc
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 h-24 flex items-end gap-0.5">
            {tensionData.map((t, i) => {
              const isCurrentEp = i + 1 === config.episode;
              const height = Math.round(t * 100);
              return (
                <div key={i} className="flex-1 relative h-full group">
                  <div className="absolute bottom-0 w-full bg-blue-500/10 h-full rounded-t-sm" />
                  <div
                    className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-300 ${
                      isCurrentEp ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-gradient-to-t from-blue-600/60 to-indigo-400/40'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  {isCurrentEp && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-zinc-700">
            <span>EP.1</span>
            <span>EP.{totalEpisodes}</span>
          </div>
        </div>

        {/* Engine Report */}
        {report && (
          <div className="space-y-3">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-3 h-3" /> Last Report
            </div>
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 space-y-4">
              {/* Grade + EOS */}
              <div className="flex gap-3">
                <div className="flex-1 text-center p-3 bg-black/40 rounded-xl">
                  <div className="text-[8px] text-zinc-600 mb-1">GRADE</div>
                  <div className="text-lg font-black text-blue-400">{report.grade}</div>
                </div>
                <div className="flex-1 text-center p-3 bg-black/40 rounded-xl">
                  <div className="text-[8px] text-zinc-600 mb-1">EOS</div>
                  <div className={`text-lg font-black ${report.eosScore >= 40 ? 'text-green-400' : 'text-red-400'}`}>
                    {report.eosScore}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {Object.entries(report.metrics).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black text-zinc-600 uppercase">
                    <span>{k}</span>
                    <span>{v}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}

              {/* Byte Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-black text-zinc-600 uppercase">
                  <span>BYTES</span>
                  <span className={report.serialization.withinRange ? 'text-green-500' : 'text-amber-500'}>
                    {(report.serialization.byteSize / 1024).toFixed(1)}KB
                  </span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-500 ${report.serialization.withinRange ? 'bg-green-600' : 'bg-amber-600'}`}
                    style={{ width: `${Math.min(100, (report.serialization.byteSize / report.serialization.targetRange.max) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[7px] text-zinc-700">
                  <span>{(report.serialization.targetRange.min / 1024).toFixed(1)}KB</span>
                  <span>{(report.serialization.targetRange.max / 1024).toFixed(1)}KB</span>
                </div>
              </div>

              {/* Char Count */}
              {(() => {
                const chars = bytesToEstimatedChars(report.serialization.byteSize);
                const charRange = getTargetCharRange(config.platform);
                const charInRange = chars >= charRange.min && chars <= charRange.max;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-zinc-600 uppercase">
                      <span>CHARS</span>
                      <span className={charInRange ? 'text-green-500' : 'text-amber-500'}>
                        {chars.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-500 ${charInRange ? 'bg-green-600' : 'bg-amber-600'}`}
                        style={{ width: `${Math.min(100, (chars / charRange.max) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[7px] text-zinc-700">
                      <span>{charRange.min.toLocaleString()}</span>
                      <span>{charRange.max.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {/* AI Tone */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-[9px]">AI Tone</span>
                <span className={`text-[9px] font-black ${report.aiTonePercent <= 10 ? 'text-green-500' : report.aiTonePercent <= 30 ? 'text-amber-500' : 'text-red-500'}`}>
                  {report.aiTonePercent}%
                </span>
              </div>

              {/* Issues */}
              {report.issues.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/50">
                  <div className="text-[8px] text-zinc-600 mb-2">ISSUES ({report.issues.length})</div>
                  {report.issues.slice(0, 3).map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-[8px] text-zinc-500">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Processing Time */}
              <div className="text-[8px] text-zinc-700 text-right">
                <Cpu className="w-3 h-3 inline mr-1" />
                {report.processingTimeMs}ms
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineDashboard;

