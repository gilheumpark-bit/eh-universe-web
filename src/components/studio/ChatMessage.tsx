
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, RotateCcw, Activity, Zap, Cpu } from 'lucide-react';
import { Message, AppLanguage } from '@/lib/studio-types';

interface ChatMessageProps {
  message: Message;
  language?: AppLanguage;
  onRegenerate?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language = 'KO', onRegenerate }) => {
  const isUser = message.role === 'user';

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

    // 3) Remove any remaining lines that look like raw metrics output
    mainContent = mainContent
      .replace(/^\s*\{[\s\S]*?"grade"\s*:[\s\S]*?\}\s*$/gm, '')
      .replace(/\[?(Engine|엔진)\s*(Report|리포트|분석)[:\]].*/gi, '')
      .replace(/^\s*"(?:grade|metrics|tension|pacing|immersion|eos)"[\s:].*/gm, '')
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

