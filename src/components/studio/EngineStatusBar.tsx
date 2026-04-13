
import React, { useState, useMemo } from 'react';
import { Activity, Cpu, Zap, AlertCircle } from 'lucide-react';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-translations';
import { EngineReport, PlatformType, getActFromEpisode } from '@/engine/types';
import { tensionCurve } from '@/engine/models';
import { bytesToEstimatedChars, getTargetCharRange } from '@/engine/serialization';
import { getOverdueThreads, getHighPriorityUnresolved, type NarrativeThread } from '@/engine/shadow';

interface EngineStatusBarProps {
  language: AppLanguage;
  config: StoryConfig;
  report: EngineReport | null;
  isGenerating: boolean;
}

/** 미해결 복선/떡밥 알림 배지 */
function ShadowThreadAlert({ config, language }: { config: StoryConfig; language: AppLanguage }) {
  const [open, setOpen] = useState(false);
  const isKO = language === 'KO';

  // config에서 thread 데이터 추출 (있으면)
  const threads: NarrativeThread[] = useMemo(() => {
    // manuscripts의 continuity report에서 open threads 추출
    const msList = config.manuscripts || [];
    const threadSet = new Map<string, NarrativeThread>();
    for (const ms of msList) {
      // 간이 스레드 추출: 원고 내 떡밥 키워드
      const content = ms.content || '';
      const plants = content.match(/(?:떡밥|복선|의문|비밀|수수께끼|미스터리|단서|foreshadow|mystery|clue)/gi) || [];
      for (const p of plants) {
        const key = `${ms.episode}-${p}`;
        if (!threadSet.has(key)) {
          threadSet.set(key, { id: key, description: `EP.${ms.episode}: ${p}`, introducedEpisode: ms.episode, priority: 5, resolved: false });
        }
      }
    }
    return Array.from(threadSet.values());
  }, [config.manuscripts]);

  const currentEp = config.episode ?? 1;
  const overdue = getOverdueThreads(threads, currentEp);
  const highPriority = getHighPriorityUnresolved(threads);
  const alertCount = overdue.length + highPriority.length;

  if (alertCount === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 bg-accent-amber/10 border border-accent-amber/20 rounded-lg text-accent-amber hover:bg-accent-amber/20 transition-colors"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold font-mono">{alertCount}</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-bg-primary border border-border rounded-xl shadow-xl p-3 z-50">
          <p className="text-xs font-bold text-text-primary mb-2">{isKO ? '미해결 복선' : 'Unresolved Threads'}</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {[...overdue, ...highPriority].slice(0, 8).map(t => (
              <div key={t.id} className="text-[10px] text-text-secondary px-2 py-1 bg-bg-secondary rounded">
                {t.description}
                {overdue.includes(t) && <span className="ml-1 text-accent-red font-bold">{isKO ? '(7화+)' : '(7ep+)'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EngineStatusBar: React.FC<EngineStatusBarProps> = React.memo(function EngineStatusBar({ language, config, report, isGenerating }) {
  const t = TRANSLATIONS[language].engine;
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);

  const isKO = language === 'KO';
  const tipAct = isKO ? '현재 3막 구조에서의 위치' : 'Current position in 3-act structure';
  const tipTension = isKO ? '이 에피소드의 목표 긴장도' : 'Target tension for this episode';
  const tipPlatform = isKO ? '출판 플랫폼 (글자수 기준)' : 'Publishing platform (char count target)';
  const tipGrade = isKO ? 'NOA가 평가한 품질 등급' : 'Quality grade by NOA';
  const tipVol = isKO ? '분량 적정성 점수' : 'Volume adequacy score';
  const tipChars = isKO ? '현재 글자수 / 목표 범위' : 'Current chars / target range';

  return (
    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest overflow-x-auto custom-scrollbar">
      {/* Act Position */}
      <div title={tipAct} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
        <Activity className="w-3 h-3 text-blue-500" />
        <span className="text-text-tertiary">{t.act} {actInfo.act}</span>
        <span className="text-text-tertiary">|</span>
        <span className="text-text-secondary">{language === 'KO' ? actInfo.name : actInfo.nameEN}</span>
      </div>

      {/* Tension Target */}
      <div title={tipTension} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
        <Zap className="w-3 h-3 text-amber-500" />
        <span className="text-text-tertiary">{t.tensionTarget}</span>
        <span className={`${targetTension > 70 ? 'text-red-400' : targetTension > 40 ? 'text-amber-400' : 'text-green-400'}`}>
          {targetTension}%
        </span>
      </div>

      {/* Platform */}
      <div title={tipPlatform} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
        <Cpu className="w-3 h-3 text-text-tertiary" />
        <span className="text-text-secondary">{config.platform === PlatformType.WEB ? t.web : t.mobile}</span>
      </div>

      {/* Live Report Data */}
      {report && !isGenerating && (
        <>
          <div title={tipGrade} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
            <span className="text-text-tertiary">{t.grade}</span>
            <span className="text-blue-400">{report.grade}</span>
          </div>
          <div title={tipVol} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
            <span className="text-text-tertiary">{language === 'KO' ? '분량' : 'VOL'}</span>
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
              <div title={tipChars} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/50 border border-border/50 rounded-lg whitespace-nowrap">
                <span className="text-text-tertiary">{language === 'KO' ? '글자' : 'Chars'}</span>
                <span className={inRange ? 'text-green-400' : chars < charRange.min ? 'text-amber-400' : 'text-red-400'}>
                  {chars.toLocaleString()}
                </span>
                <span className="text-text-tertiary">/ {charRange.min.toLocaleString()}~{charRange.max.toLocaleString()}</span>
              </div>
            );
          })()}
        </>
      )}

      {/* 미해결 복선 알림 */}
      <ShadowThreadAlert config={config} language={language} />

      {isGenerating && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg whitespace-nowrap">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          <span className="text-blue-400">{t.generating}</span>
        </div>
      )}
    </div>
  );
});

export default EngineStatusBar;

