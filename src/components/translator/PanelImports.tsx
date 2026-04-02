import React, { useState } from 'react';
import { 
  Folder, FileText, Search, Plus, 
  History, MessageSquare, 
  Sparkles, CheckCircle, BrainCircuit, Library, X, ChevronRight, Bookmark
} from 'lucide-react';
import { useTranslator } from './core/TranslatorContext';

// ---------------------------------------------------------
// Left Panels
// ---------------------------------------------------------

export function ExplorerPanel() {
  const { chapters, activeChapterIndex, setActiveChapterIndex } = useTranslator();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/50 transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="px-2 py-1.5 flex items-center gap-2 group cursor-pointer">
          <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
          <Folder className="w-4 h-4 text-accent-amber opacity-80" />
          <span className="text-[13px] font-medium text-text-secondary group-hover:text-text-primary">Current Project</span>
        </div>
        
        <div className="pl-6 flex flex-col gap-0.5 mt-1">
          {chapters.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-text-tertiary italic text-center bg-white/2 rounded-md border border-white/3">
              No chapters loaded.<br/>Import a document to begin.
            </div>
          ) : (
            chapters.map((ch: { name?: string }, idx: number) => (
              <button
                key={idx}
                onClick={() => setActiveChapterIndex && setActiveChapterIndex(idx)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-left transition-all ${
                  activeChapterIndex === idx 
                  ? 'bg-accent-indigo/20 text-accent-indigo shadow-[inset_2px_0_0_0_#6366f1]' 
                  : 'text-text-tertiary hover:bg-white/5 hover:text-text-secondary'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${activeChapterIndex === idx ? 'text-accent-indigo' : 'opacity-60'}`} />
                <span className="text-[13px] truncate">{ch.name || `Chapter ${idx + 1}`}</span>
              </button>
            ))
          )}
        </div>
      </div>
      
      <div className="p-3 shrink-0 border-t border-white/5">
        <button 
          onClick={() => alert(`새 챕터를 추가합니다.\n\n(참고: TranslatorStudioApp의 importDocument/파일 업로드와 추후 연결됩니다.)`)}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[12px] font-medium transition-colors text-text-secondary">
          <Plus className="w-3.5 h-3.5" />
          <span>New Chapter</span>
        </button>
      </div>
    </div>
  );
}

export function GlossaryPanel() {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <p className="text-[12px] text-text-tertiary mb-3 leading-relaxed">
          Manage project-specific terminology to ensure consistency across AI translation passes.
        </p>
        <button 
          onClick={() => alert('용어 추가/수정 패널(GlossaryEditor) 기능은 프로젝트 설정 메뉴와 함께 연동될 예정입니다.')}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-accent-amber/10 hover:bg-accent-amber/20 text-accent-amber border border-accent-amber/20 rounded-md text-[13px] font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Term</span>
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {/* Mock Item 1 */}
          <div className="bg-black/30 border border-white/5 rounded-md p-3 group relative hover:border-white/10 transition-colors">
            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-red-400 transition-all rounded hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="font-medium text-[13px] text-text-primary mb-1">Etherworks</div>
            <div className="text-[12px] text-accent-amber font-mono mb-2">에테르웍스</div>
            <p className="text-[11px] text-text-tertiary line-clamp-2">
              The overarching organization that controls the universal index.
            </p>
          </div>
          
          {/* Mock Item 2 */}
          <div className="bg-black/30 border border-white/5 rounded-md p-3 group relative hover:border-white/10 transition-colors">
            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-red-400 transition-all rounded hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="font-medium text-[13px] text-text-primary mb-1">Codex</div>
            <div className="text-[12px] text-accent-amber font-mono mb-2">코덱스</div>
            <p className="text-[11px] text-text-tertiary line-clamp-2">
              Ancient repository of lost tech blueprints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const { provider, setProvider, from, to, setFrom, setTo, isCatMode } = useTranslator();
  
  return (
    <div className="flex h-full flex-col font-sans p-4 overflow-y-auto space-y-6">
      <div className="space-y-3">
        <h3 className="text-[11px] font-mono font-bold text-text-tertiary uppercase tracking-wider">Language Mapping</h3>
        
        <div className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-text-secondary">Source (From)</span>
            <select 
              value={from} 
              onChange={e => setFrom(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[13px] text-white focus:outline-none focus:border-accent-indigo/50"
            >
              <option value="ja">Japanese</option>
              <option value="en">English</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div className="h-px w-full bg-white/5" />
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-text-secondary">Target (To)</span>
            <select 
              value={to} 
              onChange={e => setTo(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[13px] text-white focus:outline-none focus:border-accent-indigo/50"
            >
              <option value="ko">Korean</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-mono font-bold text-text-tertiary uppercase tracking-wider">AI Engine Engine</h3>
        <div className="bg-black/30 border border-white/5 rounded-lg p-3">
           <select 
            value={provider} 
            onChange={e => setProvider(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-[13px] text-white focus:outline-none focus:border-accent-indigo/50"
          >
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="gemini">Google (Gemini 1.5 Pro)</option>
            <option value="claude">Anthropic (Claude 3.5 Sonnet)</option>
          </select>
          <p className="mt-3 text-[11px] text-text-tertiary leading-relaxed">
            Choose the primary LLM used during standard translation passes. Some specific passes (like QA) may force a specialized model regardless of this setting.
          </p>
        </div>
      </div>

      {isCatMode && (
        <div className="p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg flex gap-3 text-accent-amber">
          <Sparkles className="w-5 h-5 shrink-0" />
          <div className="text-[12px] leading-relaxed">
            <b>Cat Mode is active.</b> UI backgrounds and some AI personas will adopt a thematic &quot;Nya&quot; aesthetic.
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel() {
  const { history } = useTranslator();
  
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-tertiary gap-3">
            <History className="w-8 h-8 opacity-20" />
            <p className="text-[13px]">No translation history yet.</p>
          </div>
        ) : (
          history.map((h: { time: string|number, from: string, to: string, source: string, result: string }, i: number) => (
            <div key={i} className="bg-black/30 border border-white/5 rounded-lg p-3 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded text-text-tertiary">
                  {new Date(h.time).toLocaleTimeString()}
                </span>
                <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                  {h.from} → {h.to}
                </span>
              </div>
              <div className="text-[12px] text-text-secondary line-clamp-2 mb-2 italic">
                {h.source}
              </div>
              <div className="h-px w-full bg-white/5 mb-2" />
              <div className="text-[13px] text-text-primary line-clamp-3">
                {h.result}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Right Panels
// ---------------------------------------------------------

export function ChatPanel() {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-accent-indigo/10 border border-accent-indigo/20 rounded-xl rounded-tl-sm p-4 w-[90%] mb-4">
          <Sparkles className="w-4 h-4 text-accent-indigo mb-2" />
          <p className="text-[13px] text-text-primary leading-relaxed">
            Hello! I am your AI Copilot. Ask me anything about the current text, or ask me to rephrase certain sentences.
          </p>
        </div>
      </div>
      
      <div className="p-3 border-t border-white/10 shrink-0 bg-black/20">
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="Type a message to Copilot..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                alert('Copilot AI 통합 기능이 동작합니다: ' + e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-[13px] text-text-primary focus:outline-none focus:border-accent-indigo/50 transition-colors"
          />
          <button 
            onClick={() => alert('네트워크 에이전트와 연동되는 채팅 모듈입니다.')}
            className="absolute right-2 w-7 h-7 flex items-center justify-center bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-full transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuditPanel() {
  return (
    <div className="flex h-full flex-col font-sans p-4 space-y-4">
      <div className="p-4 bg-black/40 border border-accent-green/20 rounded-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/10 rounded-full blur-3xl group-hover:bg-accent-green/20 transition-all pointer-events-none" />
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-accent-green" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-1">Readability Check</h3>
            <p className="text-[12px] text-text-tertiary leading-relaxed mb-3">
              The translation has a good flow. No highly awkward phrasing detected.
            </p>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-accent-green/10 text-accent-green rounded-full border border-accent-green/20">PASSED</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-text-tertiary rounded-full border border-white/10">0 ISSUES</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-black/40 border border-accent-amber/20 rounded-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber/10 rounded-full blur-3xl group-hover:bg-accent-amber/20 transition-all pointer-events-none" />
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-8 h-8 rounded-full bg-accent-amber/20 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4 text-accent-amber" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-1">Tone Consistency</h3>
            <p className="text-[12px] text-text-tertiary leading-relaxed mb-3">
              Honorifics might be slightly misaligned in paragraph 2. You used &apos;-요&apos; instead of &apos;-습니다&apos;.
            </p>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded-full border border-accent-amber/20">WARNING</span>
            </div>
          </div>
        </div>
      </div>
      
      <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[13px] font-medium transition-colors text-text-secondary">
        <Sparkles className="w-4 h-4 text-text-secondary" />
        <span>Run Deep Audit</span>
      </button>
    </div>
  );
}

export function ReferencePanel() {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
        <h3 className="text-[12px] font-semibold text-text-secondary">Linked Materials</h3>
        <button className="p-1 hover:bg-white/10 rounded text-text-tertiary transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-black/30 border border-white/5 hover:border-white/10 transition-colors rounded-lg p-3 flex gap-3 cursor-pointer group">
          <div className="mt-0.5">
            <Library className="w-4 h-4 text-accent-purple" />
          </div>
          <div>
            <h4 className="text-[13px] font-medium text-text-primary mb-1 group-hover:text-accent-purple transition-colors">
              Story Bible (Core)
            </h4>
            <p className="text-[12px] text-text-tertiary line-clamp-2">
              Main reference document containing character arcs, world mechanics, and timeline.
            </p>
          </div>
        </div>
        
        <div className="bg-black/30 border border-white/5 hover:border-white/10 transition-colors rounded-lg p-3 flex gap-3 cursor-pointer group">
          <div className="mt-0.5">
            <Bookmark className="w-4 h-4 text-accent-indigo" />
          </div>
          <div>
            <h4 className="text-[13px] font-medium text-text-primary mb-1 group-hover:text-accent-indigo transition-colors">
              Web Novel Tropes
            </h4>
            <p className="text-[12px] text-text-tertiary line-clamp-2">
              Shared concepts database across different novel translation projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
