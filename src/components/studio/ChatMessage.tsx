
import React from 'react';
import dynamic from 'next/dynamic';
import { Bot, User, Copy, RotateCcw, Activity, Zap, Cpu, ChevronDown, Wrench } from 'lucide-react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { ActionBar } from '@/components/ui/ActionBar';
import { createT } from '@/lib/i18n';
import { getStudioBackendDisplayLabel } from '@/lib/studio-ai-backend-label';
import { logger } from '@/lib/logger';

const ChatMarkdownBlock = dynamic(
  () => import('./ChatMarkdownBlock').then((m) => m.ChatMarkdownBlock),
  { ssr: false, loading: () => <span className="text-text-tertiary text-xs">…</span> },
);
interface ChatMessageProps {
  message: Message;
  language?: AppLanguage;
  onRegenerate?: (messageId: string) => void;
  onAutoFix?: (messageId: string) => void;
  isCompact?: boolean;
  /** 집필 스트림: 호스팅 백엔드면「자동」, 아니면 프로바이더·모델 표기 */
  hostedProviders?: Partial<Record<string, boolean>>;
  /** 어시스턴트 상단 라벨(미지정 시 NOW 페르소나) */
  assistantPersonaLine?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, language = 'KO', onRegenerate, onAutoFix, isCompact,
  hostedProviders = {}, assistantPersonaLine,
}) => {
  const t = createT(language);
  const isUser = message.role === 'user';
  const [showDetail, setShowDetail] = React.useState(false);

  // Try structured EngineReport first, fall back to JSON regex extraction
  const report = message.meta?.engineReport ?? null;

  let mainContent = message.content;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analysisData: any = null;

  if (!report && !isUser) {
    // 1) ```json ... ``` blocks (case-insensitive, with or without newlines)
    const jsonBlockRe = /```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```/g;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = jsonBlockRe.exec(mainContent)) !== null) {
      try {
        const parsed = JSON.parse(blockMatch[1]);
        if (parsed && typeof parsed === 'object') {
          analysisData = analysisData || parsed;
        }
      } catch { /* not valid JSON, leave it */ }
    }
    // Remove ALL code blocks (json, JSON, unmarked)
    mainContent = mainContent.replace(/```(?:json|JSON)?\s*[\s\S]*?```/g, '').trim();

    // 2) Standalone JSON objects anywhere in content: { "grade": ..., "metrics": ... }
    const jsonObjRe = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"(?:grade|metrics|critique|tension|eos(?:_score|Score)?|pacing|immersion)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let jsonMatch: RegExpExecArray | null;
    while ((jsonMatch = jsonObjRe.exec(mainContent)) !== null) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed === 'object') {
          analysisData = analysisData || parsed;
        }
      } catch { /* not valid JSON */ }
    }
    mainContent = mainContent.replace(jsonObjRe, '').trim();

    // 3) Remove any remaining standalone JSON objects (greedy: outermost braces)
    mainContent = mainContent
      .replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique|eosScore|serialization)"[\s\S]*?\n\s*\}/g, '')
      .replace(/^\s*\{[\s\S]*?"grade"\s*:[\s\S]*?\}\s*$/gm, '')
      .replace(/\[?(Engine|엔진)\s*(Report|리포트|분석)[:\]].*/gi, '')
      .replace(/^\s*"(?:grade|metrics|tension|pacing|immersion|eos)"[\s:].*/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const displayGrade = report?.grade ?? analysisData?.grade;
  const displayMetrics = report?.metrics ?? analysisData?.metrics;
  const displayCritique = analysisData?.critique ?? null;

  const personaLine = assistantPersonaLine ?? t('writingMode.nowWriterBadge');
  const backendLine = getStudioBackendDisplayLabel(language, hostedProviders);

  return (
    <div className={`flex w-full ${isCompact ? 'gap-2' : 'gap-3 md:gap-4'} group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 ${isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg flex items-center justify-center border shadow-lg ${
        isUser ? 'bg-bg-tertiary border-border' : 'bg-linear-to-br from-blue-600 to-blue-800 border-blue-500'
      }`}>
        {isUser ? <User className={isCompact ? 'w-3 h-3 text-text-tertiary' : 'w-4 h-4 text-text-tertiary'} /> : <Bot className={isCompact ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <span
            className="text-[9px] font-black text-accent-purple/60 uppercase tracking-widest font-mono max-w-full truncate"
            title={backendLine ? `${personaLine} · ${backendLine}` : personaLine}
          >
            {backendLine ? `${personaLine} · ${backendLine}` : personaLine}
          </span>
        )}
        <div className={`overflow-hidden transition-all ${
          isUser
            ? 'bg-bg-secondary/80 border border-border px-4 py-3 md:px-5 rounded-2xl rounded-tr-none text-text-secondary'
            : 'bg-transparent text-zinc-200'
        }`}>
          {isUser ? (
            <p className={`${isCompact ? 'text-[11px]' : 'text-sm'} leading-relaxed whitespace-pre-wrap`}>{mainContent}</p>
          ) : (
            <div className={`prose ${isCompact ? 'prose-xs' : 'prose-sm sm:prose-base'} prose-invert max-w-none break-words prose-p:font-serif prose-p:text-text-secondary prose-p:leading-[1.8]`}>
              <ChatMarkdownBlock mainContent={mainContent} isCompact={isCompact} />
            </div>
          )}

          {/* Engine Report Badges — Hide in compact mode */}
          {!isUser && report && !isCompact && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-400">
                {report.grade}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border ${
                report.eosScore >= 40
                  ? 'bg-green-600/10 border-green-500/20 text-green-400'
                  : 'bg-red-600/10 border-red-500/20 text-red-400'
              }`}>
                <Zap className="w-2.5 h-2.5" /> EOS {report.eosScore}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-bg-secondary/50 border border-border/50 rounded-lg text-[9px] font-black text-text-tertiary">
                <Activity className="w-2.5 h-2.5" /> {report.actPosition.act}{language === 'KO' ? '막' : ''}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border ${
                report.serialization.withinRange
                  ? 'bg-green-600/10 border-green-500/20 text-green-400'
                  : 'bg-amber-600/10 border-amber-500/20 text-amber-400'
              }`}>
                <Cpu className="w-2.5 h-2.5" /> {(report.serialization.byteSize / 1024).toFixed(1)}KB
              </span>
            </div>
          )}

          {/* Detailed Engine Validation Report */}
          {!isUser && report && (
            <div className="mt-3">
              <button onClick={() => setShowDetail(!showDetail)} className="flex items-center gap-1 text-[9px] text-text-tertiary hover:text-text-secondary transition-colors font-mono uppercase tracking-wider">
                <ChevronDown className={`w-3 h-3 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
                {language === 'KO' ? '검증 상세' : 'Validation Detail'}
              </button>
              {showDetail && (
                <div className="mt-2 p-3 bg-bg-secondary/50 border border-border/50 rounded-xl space-y-2 text-[10px] font-mono animate-in fade-in duration-300">
                  <div className="flex justify-between text-text-tertiary">
                    <span>AI {language === 'KO' ? '톤' : 'Tone'}</span>
                    <span className={report.aiTonePercent > 30 ? 'text-amber-400' : 'text-green-400'}>{report.aiTonePercent}%</span>
                  </div>
                  <div className="flex justify-between text-text-tertiary">
                    <span>{language === 'KO' ? '텐션 타겟' : 'Tension Target'}</span>
                    <span>{report.tensionTarget}% → {report.metrics.tension}%</span>
                  </div>
                  {report.fixes.length > 0 && (
                    <div className="border-t border-border/50 pt-2 space-y-1">
                      <span className="text-amber-500/80">{report.fixes.length}{language === 'KO' ? '건 수정 제안' : ' fix suggestions'}</span>
                      {report.fixes.slice(0, 3).map((f, i) => (
                        <div key={i} className="text-text-tertiary truncate">
                          {f.reason || `${f.original} → ${f.fixed}`}
                        </div>
                      ))}
                      {report.fixes.length > 3 && <div className="text-text-tertiary">+{report.fixes.length - 3}{language === 'KO' ? '건 더' : ' more'}</div>}
                    </div>
                  )}
                  {report.issues.length > 0 && (
                    <div className="border-t border-border/50 pt-2 space-y-1">
                      <span className="text-red-500/80">{report.issues.length}{language === 'KO' ? '건 이슈' : ' issues'}</span>
                      {report.issues.slice(0, 2).map((iss, i) => (
                        <div key={i} className="text-text-tertiary truncate">{iss.message}</div>
                      ))}
                    </div>
                  )}
                  {report.fixes.length > 0 && onAutoFix && (
                    <button onClick={() => onAutoFix(message.id)} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-accent-purple/10 border border-accent-purple/30 rounded-lg text-accent-purple text-[10px] font-bold uppercase tracking-wider hover:bg-accent-purple/20 transition-colors">
                      <Wrench className="w-3 h-3" /> {language === 'KO' ? '자동 수정 적용' : 'Apply Auto-Fix'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quality Tag (서사 강도 기반 품질 배지) */}
          {!isUser && message.meta?.qualityTag && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetail(d => !d)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  message.meta.qualityTag === '🔴' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : message.meta.qualityTag === '🟡' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
                }`}
              >
                {message.meta.qualityTag} {message.meta.qualityLabel}
                {(message.meta.qualityFindings?.length ?? 0) > 0 && (
                  <span className="text-[8px] opacity-70">({message.meta.qualityFindings?.length})</span>
                )}
              </button>
              {showDetail && message.meta.qualityFindings && message.meta.qualityFindings.length > 0 && (
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                  {message.meta.qualityFindings.map((f, i) => (
                    <div key={i} className="text-[10px] text-text-tertiary">
                      <span className={f.severity >= 4 ? 'text-red-400' : f.severity >= 3 ? 'text-amber-400' : 'text-text-tertiary'}>
                        [{f.kind}]
                      </span>{' '}
                      {f.message}
                      {f.lineNo && <span className="text-text-tertiary ml-1">(L{f.lineNo})</span>}
                    </div>
                  ))}
                  {message.meta.qualityTag === '🔴' && (
                    <p className="text-[10px] text-red-400/80 font-bold mt-2">
                      {language === 'KO' ? '⚠ 재작성을 권장합니다.' : '⚠ Rewrite recommended.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analysis Report — Hide in compact mode */}
          {!isUser && (displayGrade || displayMetrics) && !isCompact && (
            <div className="mt-8 p-4 md:p-6 bg-bg-secondary/50 border border-border rounded-2xl space-y-4 animate-in fade-in duration-500">
              <div className="flex justify-between items-center text-[9px] font-black text-text-tertiary uppercase tracking-widest">
                <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-blue-500" /> Engine Report</div>
                {displayGrade && <div className="text-blue-500">{displayGrade} Grade</div>}
              </div>
              {displayMetrics && (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(displayMetrics as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <div className="flex justify-between text-[7px] font-black text-text-tertiary uppercase"><span>{k}</span><span>{v}%</span></div>
                      <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {displayCritique && (
                <p className="text-[11px] text-text-tertiary italic leading-relaxed border-t border-border/50 pt-3">
                  &quot;{displayCritique}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <ActionBar
              content={message.content}
              title={`AI Message`}
              actions={['copy', 'share', 'feedback']}
              shareType="novel"
              onFeedback={(positive) => { logger.info('feedback', `AI message ${message.id}: ${positive ? 'positive' : 'negative'}`); }}
            />
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-secondary transition-all"
                title={language === 'KO' ? '재생성' : 'Regenerate'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

