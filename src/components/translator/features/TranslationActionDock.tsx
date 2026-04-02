import React from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useLang } from '@/lib/LangContext';
import { Sparkles, Zap, Brain, Globe, Settings2, ShieldCheck, ChevronRight } from 'lucide-react';

export function TranslationActionDock() {
  const { lang } = useLang();
  // Note: The below functions should exist in TranslatorContext or will need to be passed
  // We mock the loading/translating states here based on what we saw in the old app.
  const loading = false; // const { loading } = useTranslator();
  const statusMsg = ''; // const { statusMsg } = useTranslator();
  const { provider, setProvider } = useTranslator();

  const handleTranslate = () => {
    // call translation logic from context (e.g., translate())
  };

  const handleDeepTranslate = () => {
    // call deep translation logic from context (e.g., deepTranslate())
  };

  return (
    <div className="flex flex-col p-4 gap-4">
      {/* 1. Status Section */}
      {loading ? (
        <div className="bg-accent-indigo/10 border border-accent-indigo/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-accent-indigo rounded-full animate-ping" />
            <span className="text-xs font-mono text-accent-indigo uppercase tracking-wider">{statusMsg || 'Translating...'}</span>
          </div>
          <span className="text-xs text-text-tertiary">0/5</span>
        </div>
      ) : (
        <div className="bg-[#111113] border border-white/5 rounded-lg p-3 flex items-center gap-2 text-xs text-text-tertiary font-mono uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
          Ready
        </div>
      )}

      {/* 2. Provider Settings */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold tracking-wider uppercase text-text-tertiary mb-1">
          {lang === 'ko' ? '엔진 선택' : 'Primary Engine'}
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full bg-[#111113] border border-white/10 rounded-lg p-2 text-sm text-text-secondary outline-none focus:border-accent-green/50 hover:bg-[#151518] cursor-pointer transition-colors"
        >
          <option value="gemini">Google Gemini Pro</option>
          <option value="openai">OpenAI GPT-4o</option>
          <option value="claude">Anthropic Claude</option>
          <option value="deepseek">DeepSeek Reasoner</option>
          <option value="ollama">Local (Ollama)</option>
        </select>
      </div>

      <div className="h-px w-full bg-white/5 my-2" />

      {/* 3. Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="group relative w-full flex align-middle justify-between items-center py-3 px-4 rounded-lg bg-linear-to-r from-[#1A1A1D] to-[#111113] border border-white/10 hover:border-accent-green/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <div className="absolute inset-0 bg-accent-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-1.5 bg-accent-green/10 rounded-md">
              <Zap className="w-4 h-4 text-accent-green" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-text-primary">Fast Draft</span>
              <span className="text-[10px] text-text-tertiary">Quick accurate translation</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-accent-green transition-colors relative z-10 group-hover:translate-x-1" />
        </button>

        <button
          onClick={handleDeepTranslate}
          disabled={loading}
          className="group relative w-full flex align-middle justify-between items-center py-3 px-4 rounded-lg bg-linear-to-r from-accent-indigo/10 to-transparent border border-accent-indigo/20 hover:border-accent-indigo/60 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_15px_rgba(47,155,131,0.05)]"
        >
          <div className="absolute inset-0 bg-accent-indigo/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-1.5 bg-accent-indigo/20 rounded-md relative shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Brain className="w-4 h-4 text-accent-indigo" strokeWidth={2.5} />
              <Sparkles className="w-2.5 h-2.5 text-white absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-accent-indigo">Deep Brain Translation</span>
              <span className="text-[10px] text-accent-indigo/60">5-Stage Pro Pipeline</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-accent-indigo/50 group-hover:text-accent-indigo transition-colors relative z-10 group-hover:translate-x-1" />
        </button>
      </div>

      <div className="h-px w-full bg-white/5 my-2" />

      {/* 4. Mini Utility Map */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button className="flex flex-col items-center justify-center py-3 px-2 bg-[#111113] hover:bg-white/5 border border-white/5 rounded-lg transition-colors gap-1.5 text-text-tertiary hover:text-white">
          <Globe className="w-4 h-4" />
          <span className="text-[10px] font-medium">Auto Glossary</span>
        </button>
        <button className="flex flex-col items-center justify-center py-3 px-2 bg-[#111113] hover:bg-white/5 border border-white/5 rounded-lg transition-colors gap-1.5 text-text-tertiary hover:text-white">
          <Settings2 className="w-4 h-4" />
          <span className="text-[10px] font-medium">Domain Settings</span>
        </button>
      </div>
    </div>
  );
}
