
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Bot, User, Copy, RotateCcw, Activity, Zap, Cpu, ChevronDown, Wrench } from 'lucide-react';
import { Message, AppLanguage } from '@/lib/studio-types';

interface ChatMessageProps {
  message: Message;
  language?: AppLanguage;
  onRegenerate?: (messageId: string) => void;
  onAutoFix?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language = 'KO', onRegenerate, onAutoFix }) => {
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

  return (
    <div className={`flex w-full gap-3 md:gap-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-lg ${
        isUser ? 'bg-zinc-800 border-zinc-700' : 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500'
      }`}>
        {isUser ? <User className="w-4 h-4 text-zinc-500" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <span className="text-[9px] font-black text-accent-purple/60 uppercase tracking-widest font-[family-name:var(--font-mono)]">
            NOW — Narrative Origin Writer
          </span>
        )}
        <div className={`transition-all ${
          isUser
            ? 'bg-zinc-900/80 border border-zinc-800 px-4 py-3 md:px-5 rounded-2xl rounded-tr-none text-zinc-300'
            : 'bg-transparent text-zinc-200'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{mainContent}</p>
          ) : (
            <div className="prose prose-sm sm:prose-base prose-invert max-w-none prose-p:font-serif prose-p:text-zinc-300 prose-p:leading-[1.8]">
              <ReactMarkdown
                skipHtml
                rehypePlugins={[rehypeSanitize]}
                disallowedElements={['script', 'iframe', 'object', 'embed', 'form']}
                components={{
                  p: (props) => <p className="mb-6 last:mb-0" {...props} />,
                  h1: (props) => <h1 className="text-xl font-black text-white mt-10 mb-4 border-l-2 border-blue-600 pl-4 uppercase" {...props} />,
                  hr: () => <div className="my-10 h-px bg-zinc-900"></div>
                }}
              >
                {mainContent}
              </ReactMarkdown>
            </div>
          )}

          {/* Engine Report Badges (from structured report) */}
          {!isUser && report && (
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
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-[9px] font-black text-zinc-500">
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
              <button onClick={() => setShowDetail(!showDetail)} className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors font-[family-name:var(--font-mono)] uppercase tracking-wider">
                <ChevronDown className={`w-3 h-3 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
                {language === 'KO' ? '검증 상세' : 'Validation Detail'}
              </button>
              {showDetail && (
                <div className="mt-2 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-2 text-[10px] font-[family-name:var(--font-mono)] animate-in fade-in duration-300">
                  <div className="flex justify-between text-zinc-500">
                    <span>AI {language === 'KO' ? '톤' : 'Tone'}</span>
                    <span className={report.aiTonePercent > 30 ? 'text-amber-400' : 'text-green-400'}>{report.aiTonePercent}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{language === 'KO' ? '텐션 타겟' : 'Tension Target'}</span>
                    <span>{report.tensionTarget}% → {report.metrics.tension}%</span>
                  </div>
                  {report.fixes.length > 0 && (
                    <div className="border-t border-zinc-800/50 pt-2 space-y-1">
                      <span className="text-amber-500/80">{report.fixes.length}{language === 'KO' ? '건 수정 제안' : ' fix suggestions'}</span>
                      {report.fixes.slice(0, 3).map((f, i) => (
                        <div key={i} className="text-zinc-600 truncate">
                          {f.reason || `${f.original} → ${f.fixed}`}
                        </div>
                      ))}
                      {report.fixes.length > 3 && <div className="text-zinc-700">+{report.fixes.length - 3}{language === 'KO' ? '건 더' : ' more'}</div>}
                    </div>
                  )}
                  {report.issues.length > 0 && (
                    <div className="border-t border-zinc-800/50 pt-2 space-y-1">
                      <span className="text-red-500/80">{report.issues.length}{language === 'KO' ? '건 이슈' : ' issues'}</span>
                      {report.issues.slice(0, 2).map((iss, i) => (
                        <div key={i} className="text-zinc-600 truncate">{iss.message}</div>
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

          {/* Analysis Report (from structured report OR JSON fallback) */}
          {!isUser && (displayGrade || displayMetrics) && (
            <div className="mt-8 p-4 md:p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4 animate-in fade-in duration-500">
              <div className="flex justify-between items-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-blue-500" /> Engine Report</div>
                {displayGrade && <div className="text-blue-500">{displayGrade} Grade</div>}
              </div>
              {displayMetrics && (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(displayMetrics as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <div className="flex justify-between text-[7px] font-black text-zinc-700 uppercase"><span>{k}</span><span>{v}%</span></div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {displayCritique && (
                <p className="text-[11px] text-zinc-500 italic leading-relaxed border-t border-zinc-800/50 pt-3">
                  &quot;{displayCritique}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              aria-label="복사"
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-700 hover:text-zinc-400 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-700 hover:text-zinc-400 transition-all"
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

