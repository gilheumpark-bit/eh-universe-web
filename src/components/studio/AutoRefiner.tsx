'use client';

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Play, Check, X, ChevronDown, ChevronUp, Loader2, SkipForward, CheckCheck } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';

interface Suggestion {
  id: string;
  paragraphIndex: number;
  original: string;
  issue: string;
  action: string;
  status: 'pending' | 'generating' | 'ready' | 'applied' | 'skipped';
  result?: string;
}

interface AutoRefinerProps {
  content: string;
  language: AppLanguage;
  context?: string;
  onApply: (newContent: string) => void;
}

// ============================================================
// PART 2 — Analysis prompt
// ============================================================

function buildAnalysisPrompt(text: string, isKO: boolean, context?: string): string {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const numbered = paragraphs.map((p, i) => `[${i}] ${p.slice(0, 200)}`).join('\n');

  if (isKO) {
    return `당신은 상업 소설 편집자입니다. 아래 원고의 각 문단을 분석하고, 개선이 필요한 부분만 골라주세요.

분석 기준 (우선순위):
1. 밋밋한 묘사 → "살 붙이기" (감각/내면 부족)
2. 과잉 묘사 → "압축" (불필요한 수식어 반복)
3. 긴장감 부족 → "긴장감 올리기" (액션/위기 장면인데 느슨)
4. 대사 부자연 → "대사 다듬기" (캐릭터 말투 안 살아남)
5. 전환 부족 → "뒤에 삽입" (장면 전환이 갑작스러움)
6. 문장 어색 → "다시 쓰기" (AI 톤이 남아있거나 어색)

출력 형식 (JSON 배열만, 다른 텍스트 없이):
[{"p":문단번호,"issue":"문제 한줄 설명","action":"액션명"}]

- 문제 없는 문단은 건너뛰세요
- 최대 8개까지만
- action은 반드시: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after" 중 하나
${context ? `\n작품 정보: ${context}` : ''}

원고:
${numbered}`;
  }

  return `You are a commercial fiction editor. Analyze each paragraph and identify parts needing improvement.

Criteria (priority):
1. Flat description → "expand" (lacks sensory/inner detail)
2. Over-description → "compress" (redundant modifiers)
3. Low tension → "tension" (action/crisis scene feels slack)
4. Unnatural dialogue → "dialogue" (character voice not distinct)
5. Missing transition → "insert_after" (abrupt scene change)
6. Awkward prose → "rewrite" (AI tone or clumsy phrasing)

Output format (JSON array only, no other text):
[{"p":paragraphNumber,"issue":"one-line issue","action":"actionName"}]

- Skip paragraphs with no issues
- Maximum 8 suggestions
- action must be: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after"
${context ? `\nWork info: ${context}` : ''}

Manuscript:
${numbered}`;
}

function buildFixPrompt(original: string, action: string, before: string, after: string, isKO: boolean): string {
  const instructions: Record<string, { ko: string; en: string }> = {
    rewrite: {
      ko: '같은 의미이지만 더 자연스럽고 매끄러운 문장으로 다시 써줘. AI 톤 제거.',
      en: 'Rewrite with more natural, polished prose. Remove AI tone.',
    },
    expand: {
      ko: '감각 묘사, 내면 독백, 환경 묘사를 추가해서 2배로 늘려줘. 원래 사건과 대사는 유지.',
      en: 'Expand 2x with sensory details, inner monologue, environment. Keep events/dialogue.',
    },
    compress: {
      ko: '핵심만 남기고 절반으로 압축. 불필요한 수식어, 반복 제거.',
      en: 'Compress to half. Remove unnecessary modifiers and repetition.',
    },
    tension: {
      ko: '긴장감 높여줘. 짧은 문장, 급박한 호흡, 위기감. 원래 사건 유지.',
      en: 'Increase tension. Short sentences, urgency, crisis. Keep events.',
    },
    dialogue: {
      ko: '대사를 캐릭터 성격에 맞게 더 자연스럽고 개성있게. 지문도 다듬어줘.',
      en: 'Polish dialogue to be more natural and characteristic. Improve tags too.',
    },
    insert_after: {
      ko: '이 문단 뒤에 이어지는 전환 장면을 200~400자로 새로 써줘.',
      en: 'Write a 200-400 char transition scene to follow this paragraph.',
    },
  };

  const inst = instructions[action] ?? instructions.rewrite;
  const prompt = isKO ? inst.ko : inst.en;

  return `${prompt}\n\n[앞 문맥]\n${before}\n\n[대상 문단]\n${original}\n\n[뒤 문맥]\n${after}\n\n순수 소설 텍스트만 출력. 설명/코멘트/따옴표 없이.`;
}

// ============================================================
// PART 3 — Component
// ============================================================

const ACTION_LABEL: Record<string, { ko: string; en: string; color: string }> = {
  rewrite: { ko: '다시 쓰기', en: 'Rewrite', color: 'text-blue-400 bg-blue-600/10 border-blue-500/20' },
  expand: { ko: '살 붙이기', en: 'Expand', color: 'text-green-400 bg-green-600/10 border-green-500/20' },
  compress: { ko: '압축', en: 'Compress', color: 'text-orange-400 bg-orange-600/10 border-orange-500/20' },
  tension: { ko: '긴장감', en: 'Tension', color: 'text-red-400 bg-red-600/10 border-red-500/20' },
  dialogue: { ko: '대사', en: 'Dialogue', color: 'text-pink-400 bg-pink-600/10 border-pink-500/20' },
  insert_after: { ko: '삽입', en: 'Insert', color: 'text-purple-400 bg-purple-600/10 border-purple-500/20' },
};

const AutoRefiner: React.FC<AutoRefinerProps> = ({ content, language, context, onApply }) => {
  const isKO = language === 'KO';
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'ready' | 'fixing'>('idle');
  const [currentFixIdx, setCurrentFixIdx] = useState(-1);
  const [expanded, setExpanded] = useState(true);
  const [workingContent, setWorkingContent] = useState(content);
  const abortRef = useRef<AbortController | null>(null);

  // Step 1: AI analyzes the manuscript
  const startAnalysis = useCallback(async () => {
    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) {
      alert(isKO ? 'API 키를 설정해주세요.' : 'Please set your API key.');
      return;
    }

    setPhase('analyzing');
    setSuggestions([]);
    setWorkingContent(content);
    const controller = new AbortController();
    abortRef.current = controller;

    const prompt = buildAnalysisPrompt(content, isKO, context);
    const messages: ChatMsg[] = [{ role: 'user', content: prompt }];

    let raw = '';
    try {
      await streamChat({
        systemInstruction: isKO
          ? '소설 편집자. JSON 배열만 출력. 다른 텍스트 절대 금지.'
          : 'Fiction editor. Output JSON array only. No other text.',
        messages,
        temperature: 0.3,
        signal: controller.signal,
        onChunk: (chunk) => { raw += chunk; },
      });

      // Parse JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        setPhase('idle');
        alert(isKO ? '분석 결과를 파싱할 수 없습니다.' : 'Could not parse analysis result.');
        return;
      }

      const parsed: { p: number; issue: string; action: string }[] = JSON.parse(jsonMatch[0]);
      const paragraphs = content.split('\n\n').filter(p => p.trim());

      const sugs: Suggestion[] = parsed
        .filter(s => s.p >= 0 && s.p < paragraphs.length)
        .map((s, i) => ({
          id: `sug-${i}`,
          paragraphIndex: s.p,
          original: paragraphs[s.p],
          issue: s.issue,
          action: s.action,
          status: 'pending' as const,
        }));

      setSuggestions(sugs);
      setPhase(sugs.length > 0 ? 'ready' : 'idle');
      if (sugs.length === 0) {
        alert(isKO ? '개선할 부분을 찾지 못했습니다. 원고 상태가 좋습니다!' : 'No improvements found. Your manuscript looks good!');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(isKO ? '분석 중 오류 발생' : 'Analysis error');
      }
      setPhase('idle');
    } finally {
      abortRef.current = null;
    }
  }, [content, isKO, context]);

  // Step 2: Fix suggestions one by one
  const fixSuggestion = useCallback(async (idx: number) => {
    const sug = suggestions[idx];
    if (!sug || sug.status !== 'pending') return;

    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) return;

    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'generating' } : s));
    setCurrentFixIdx(idx);
    setPhase('fixing');

    const paragraphs = workingContent.split('\n\n').filter(p => p.trim());
    const pIdx = sug.paragraphIndex;
    const before = paragraphs.slice(Math.max(0, pIdx - 1), pIdx).join('\n\n');
    const after = paragraphs.slice(pIdx + 1, pIdx + 2).join('\n\n');

    const prompt = buildFixPrompt(sug.original, sug.action, before, after, isKO);
    const messages: ChatMsg[] = [{ role: 'user', content: prompt }];

    const controller = new AbortController();
    abortRef.current = controller;

    let result = '';
    try {
      await streamChat({
        systemInstruction: isKO
          ? '소설 텍스트 리라이터. 순수 소설 텍스트만 출력. 설명 금지.'
          : 'Fiction rewriter. Output pure fiction text only. No explanations.',
        messages,
        temperature: 0.85,
        signal: controller.signal,
        onChunk: (chunk) => {
          result += chunk;
          setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, result } : s));
        },
      });
      setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'ready', result } : s));
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'pending' } : s));
      }
    } finally {
      setPhase('ready');
      abortRef.current = null;
    }
  }, [suggestions, workingContent, isKO]);

  // Apply a single fix
  const applySuggestion = useCallback((idx: number) => {
    const sug = suggestions[idx];
    if (!sug?.result) return;

    const paragraphs = workingContent.split('\n\n').filter(p => p.trim());
    const pIdx = sug.paragraphIndex;

    if (sug.action === 'insert_after') {
      paragraphs.splice(pIdx + 1, 0, sug.result);
    } else {
      paragraphs[pIdx] = sug.result;
    }

    const newContent = paragraphs.join('\n\n');
    setWorkingContent(newContent);
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'applied' } : s));
  }, [suggestions, workingContent]);

  // Skip a suggestion
  const skipSuggestion = (idx: number) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'skipped' } : s));
  };

  // Apply all ready fixes and finalize
  const applyAll = () => {
    let result = workingContent;
    const paragraphs = result.split('\n\n').filter(p => p.trim());

    // Apply from back to front to preserve indices
    const readySugs = suggestions
      .filter(s => s.status === 'applied')
      .sort((a, b) => b.paragraphIndex - a.paragraphIndex);

    // workingContent already has applied changes, just push it
    onApply(workingContent);
    setPhase('idle');
    setSuggestions([]);
  };

  // Run all pending fixes sequentially
  const runAllFixes = useCallback(async () => {
    for (let i = 0; i < suggestions.length; i++) {
      if (suggestions[i].status === 'pending') {
        await fixSuggestion(i);
      }
    }
  }, [suggestions, fixSuggestion]);

  const cancel = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setSuggestions([]);
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const appliedCount = suggestions.filter(s => s.status === 'applied').length;
  const readyCount = suggestions.filter(s => s.status === 'ready').length;

  return (
    <div className="border border-accent-purple/20 bg-accent-purple/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          <span className="text-[11px] font-black uppercase tracking-widest text-accent-purple font-[family-name:var(--font-mono)]">
            {isKO ? 'AUTO 30% — AI 자동 리파인' : 'AUTO 30% — AI Auto-Refine'}
          </span>
          {suggestions.length > 0 && (
            <span className="text-[9px] text-zinc-500 font-[family-name:var(--font-mono)]">
              {appliedCount}/{suggestions.length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <button onClick={startAnalysis} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity">
              <Play className="w-3 h-3" /> {isKO ? '분석 시작' : 'Analyze'}
            </button>
          )}
          {phase === 'analyzing' && (
            <span className="flex items-center gap-1.5 text-[10px] text-accent-purple font-bold font-[family-name:var(--font-mono)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {isKO ? '원고 분석 중...' : 'Analyzing...'}
            </span>
          )}
          {phase === 'ready' && pendingCount > 0 && (
            <button onClick={runAllFixes} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:bg-blue-600/30 transition-colors">
              <Play className="w-3 h-3" /> {isKO ? '전체 생성' : 'Generate All'}
            </button>
          )}
          {appliedCount > 0 && (
            <button onClick={applyAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:bg-green-600/30 transition-colors">
              <CheckCheck className="w-3 h-3" /> {isKO ? '원고 반영' : 'Apply to MS'}
            </button>
          )}
          {phase !== 'idle' && (
            <button onClick={cancel} className="p-1.5 text-zinc-600 hover:text-accent-red transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600 cursor-pointer" onClick={() => setExpanded(false)} /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 cursor-pointer" onClick={() => setExpanded(true)} />}
        </div>
      </div>

      {/* Suggestion list */}
      {expanded && suggestions.length > 0 && (
        <div className="px-4 pb-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {suggestions.map((sug, idx) => {
            const actionInfo = ACTION_LABEL[sug.action] ?? ACTION_LABEL.rewrite;
            return (
              <div key={sug.id} className={`border rounded-xl p-3 space-y-2 transition-all ${
                sug.status === 'applied' ? 'border-green-500/20 bg-green-900/5' :
                sug.status === 'skipped' ? 'border-zinc-800/30 bg-zinc-900/30 opacity-40' :
                sug.status === 'generating' ? 'border-blue-500/30 bg-blue-900/5' :
                'border-border bg-bg-secondary/30'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-zinc-600 font-[family-name:var(--font-mono)]">P{sug.paragraphIndex + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${actionInfo.color} font-[family-name:var(--font-mono)]`}>
                      {isKO ? actionInfo.ko : actionInfo.en}
                    </span>
                    <span className="text-[10px] text-zinc-400">{sug.issue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sug.status === 'pending' && (
                      <>
                        <button onClick={() => fixSuggestion(idx)} className="p-1 rounded hover:bg-blue-900/20 text-blue-500/50 hover:text-blue-400 transition-colors" title={isKO ? '생성' : 'Generate'}>
                          <Play className="w-3 h-3" />
                        </button>
                        <button onClick={() => skipSuggestion(idx)} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors" title={isKO ? '건너뛰기' : 'Skip'}>
                          <SkipForward className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {sug.status === 'generating' && (
                      <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    )}
                    {sug.status === 'ready' && (
                      <>
                        <button onClick={() => applySuggestion(idx)} className="p-1 rounded hover:bg-green-900/20 text-green-500/50 hover:text-green-400 transition-colors" title={isKO ? '적용' : 'Apply'}>
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => skipSuggestion(idx)} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors" title={isKO ? '건너뛰기' : 'Skip'}>
                          <SkipForward className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {sug.status === 'applied' && (
                      <Check className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                </div>

                {/* Original (truncated) */}
                <p className="text-[10px] text-zinc-600 font-serif leading-relaxed line-clamp-2">{sug.original}</p>

                {/* Generated result */}
                {sug.result && sug.status !== 'skipped' && (
                  <div className="border-t border-border pt-2">
                    <p className="text-[11px] text-zinc-300 font-serif leading-relaxed whitespace-pre-wrap">
                      {sug.result}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {expanded && phase === 'idle' && suggestions.length === 0 && (
        <div className="px-4 pb-4 text-center">
          <p className="text-[11px] text-zinc-600 italic">
            {isKO
              ? 'AI가 원고를 문단별로 분석하고, 약한 부분을 찾아 자동으로 리라이트합니다.'
              : 'AI analyzes your manuscript paragraph by paragraph and auto-rewrites weak spots.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoRefiner;
