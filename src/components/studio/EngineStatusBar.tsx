
import React from 'react';
import { Activity, Cpu, Zap } from 'lucide-react';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-constants';
import { EngineReport, PlatformType, getActFromEpisode } from '@/engine/types';
import { tensionCurve } from '@/engine/models';
import { bytesToEstimatedChars, getTargetCharRange } from '@/engine/serialization';

interface EngineStatusBarProps {
  language: AppLanguage;
  config: StoryConfig;
  report: EngineReport | null;
  isGenerating: boolean;
}

const EngineStatusBar: React.FC<EngineStatusBarProps> = ({ language, config, report, isGenerating }) => {
  const t = TRANSLATIONS[language].engine;
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);

  return (
    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest overflow-x-auto custom-scrollbar">
      {/* Act Position */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
        <Activity className="w-3 h-3 text-blue-500" />
        <span className="text-zinc-500">{t.act} {actInfo.act}</span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400">{language === 'KO' ? actInfo.name : actInfo.nameEN}</span>
      </div>

      {/* Tension Target */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
        <Zap className="w-3 h-3 text-amber-500" />
        <span className="text-zinc-500">{t.tensionTarget}</span>
        <span className={`${targetTension > 70 ? 'text-red-400' : targetTension > 40 ? 'text-amber-400' : 'text-green-400'}`}>
          {targetTension}%
        </span>
      </div>

      {/* Platform */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
        <Cpu className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-400">{config.platform === PlatformType.WEB ? t.web : t.mobile}</span>
      </div>

      {/* Live Report Data */}
      {report && !isGenerating && (
        <>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
            <span className="text-zinc-500">{t.grade}</span>
            <span className="text-blue-400">{report.grade}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
            <span className="text-zinc-500">EOS</span>
            <span className={`${report.eosScore >= 40 ? 'text-green-400' : 'text-red-400'}`}>
              {report.eosScore}
            </span>
          </div>
          {/* Char count badge */}
          {(() => {
            const chars = bytesToEstimatedChars(report.serialization.byteSize);
            const charRange = getTargetCharRange(config.platform);
            const inRange = chars >= charRange.min && chars <= charRange.max;
            return (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg whitespace-nowrap">
                <span className="text-zinc-500">{language === 'KO' ? '글자' : 'Chars'}</span>
                <span className={inRange ? 'text-green-400' : chars < charRange.min ? 'text-amber-400' : 'text-red-400'}>
                  {chars.toLocaleString()}
                </span>
                <span className="text-zinc-700">/ {charRange.min.toLocaleString()}~{charRange.max.toLocaleString()}</span>
              </div>
            );
          })()}
        </>
      )}

      {isGenerating && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg whitespace-nowrap">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          <span className="text-blue-400">{t.generating}</span>
        </div>
      )}
    </div>
  );
};

export default EngineStatusBar;

