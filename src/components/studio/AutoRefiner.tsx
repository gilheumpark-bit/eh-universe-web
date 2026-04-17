
'use client';

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Play, Check, X, ChevronDown, ChevronUp, Loader2, SkipForward, CheckCheck, Undo2 } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { streamChat, getApiKey, getActiveProvider, hasDgxService } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';
import { ErrorToast, StreamingIndicator } from './UXHelpers';

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

function buildAnalysisPrompt(text: string, language: AppLanguage, context?: string): string {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const numbered = paragraphs.map((p, i) => `[${i}] ${p.slice(0, 200)}`).join('\n');

  const prompts: Record<AppLanguage, string> = {
    KO: `당신은 상업 소설 편집자입니다. 아래 원고의 각 문단을 분석하고, 개선이 필요한 부분만 골라주세요.

분석 기준 (우선순위):
1. 밋밋한 묘사 → "살 붙이기" (감각/내면 부족)
2. 과잉 묘사 → "압축" (불필요한 수식어 반복)
3. 긴장감 부족 → "긴장감 올리기" (액션/위기 장면인데 느슨)
4. 대사 부자연 → "대사 다듬기" (캐릭터 말투 안 살아남)
5. 전환 부족 → "뒤에 삽입" (장면 전환이 갑작스러움)
6. 문장 어색 → "다시 쓰기" (NOA 톤이 남아있거나 어색)

출력 형식 (JSON 배열만, 다른 텍스트 없이):
[{"p":문단번호,"issue":"문제 한줄 설명","action":"액션명"}]

- 문제 없는 문단은 건너뛰세요
- 최대 8개까지만
- action은 반드시: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after" 중 하나
${context ? `\n작품 정보: ${context}` : ''}

원고:
${numbered}`,
    EN: `You are a commercial fiction editor. Analyze each paragraph and identify parts needing improvement.

Criteria (priority):
1. Flat description → "expand" (lacks sensory/inner detail)
2. Over-description → "compress" (redundant modifiers)
3. Low tension → "tension" (action/crisis scene feels slack)
4. Unnatural dialogue → "dialogue" (character voice not distinct)
5. Missing transition → "insert_after" (abrupt scene change)
6. Awkward prose → "rewrite" (NOA tone or clumsy phrasing)

Output format (JSON array only, no other text):
[{"p":paragraphNumber,"issue":"one-line issue","action":"actionName"}]

- Skip paragraphs with no issues
- Maximum 8 suggestions
- action must be: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after"
${context ? `\nWork info: ${context}` : ''}

Manuscript:
${numbered}`,
    JP: `あなたは商業小説の編集者です。以下の原稿の各段落を分析し、改善が必要な部分だけを選んでください。

分析基準（優先順位）:
1. 平坦な描写 → "expand"（感覚/内面の詳細不足）
2. 過剰描写 → "compress"（冗長な修飾語の繰り返し）
3. 緊張感不足 → "tension"（アクション/危機シーンが緩い）
4. 不自然な台詞 → "dialogue"（キャラクターの声が区別できない）
5. 転換不足 → "insert_after"（場面転換が唐突）
6. ぎこちない文章 → "rewrite"（NOAトーンまたは不自然な表現）

出力形式（JSON配列のみ、他のテキストなし）:
[{"p":段落番号,"issue":"問題の一行説明","action":"アクション名"}]

- 問題のない段落はスキップ
- 最大8つまで
- actionは必ず: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after" のいずれか
${context ? `\n作品情報: ${context}` : ''}

原稿:
${numbered}`,
    CN: `你是一位商业小说编辑。分析以下稿件的每个段落，只选出需要改进的部分。

分析标准（优先级）:
1. 平淡描写 → "expand"（缺乏感官/内心细节）
2. 过度描写 → "compress"（冗余修饰语重复）
3. 紧张感不足 → "tension"（动作/危机场景松弛）
4. 对话不自然 → "dialogue"（角色声音不鲜明）
5. 缺少转场 → "insert_after"（场景切换突兀）
6. 文笔生硬 → "rewrite"（NOA腔调或表达笨拙）

输出格式（仅JSON数组，无其他文本）:
[{"p":段落号,"issue":"问题一行描述","action":"动作名"}]

- 跳过没有问题的段落
- 最多8条建议
- action必须是: "rewrite" | "expand" | "compress" | "tension" | "dialogue" | "insert_after" 之一
${context ? `\n作品信息: ${context}` : ''}

稿件:
${numbered}`,
  };

  return prompts[language];
}

function buildFixPrompt(original: string, action: string, before: string, after: string, language: AppLanguage): string {
  const instructions: Record<string, Record<AppLanguage, string>> = {
    rewrite: {
      KO: '같은 의미이지만 더 자연스럽고 매끄러운 문장으로 다시 써줘. NOA 톤 제거.',
      EN: 'Rewrite with more natural, polished prose. Remove NOA tone.',
      JP: '同じ意味でより自然で滑らかな文章に書き直してください。NOAトーンを除去。',
      CN: '用相同含义但更自然流畅的句子重写。去除NOA腔调。',
    },
    expand: {
      KO: '감각 묘사, 내면 독백, 환경 묘사를 추가해서 2배로 늘려줘. 원래 사건과 대사는 유지.',
      EN: 'Expand 2x with sensory details, inner monologue, environment. Keep events/dialogue.',
      JP: '感覚描写、内面の独白、環境描写を追加して2倍に拡張してください。元の事件と台詞は維持。',
      CN: '添加感官描写、内心独白、环境描写，扩展为2倍。保留原有事件和对话。',
    },
    compress: {
      KO: '핵심만 남기고 절반으로 압축. 불필요한 수식어, 반복 제거.',
      EN: 'Compress to half. Remove unnecessary modifiers and repetition.',
      JP: '核心だけ残して半分に圧縮。不要な修飾語、繰り返しを除去。',
      CN: '只留核心压缩到一半。删除不必要的修饰语和重复。',
    },
    tension: {
      KO: '긴장감 높여줘. 짧은 문장, 급박한 호흡, 위기감. 원래 사건 유지.',
      EN: 'Increase tension. Short sentences, urgency, crisis. Keep events.',
      JP: '緊張感を高めてください。短い文、切迫した呼吸、危機感。元の事件を維持。',
      CN: '提高紧张感。短句、紧迫节奏、危机感。保留原有事件。',
    },
    dialogue: {
      KO: '대사를 캐릭터 성격에 맞게 더 자연스럽고 개성있게. 지문도 다듬어줘.',
      EN: 'Polish dialogue to be more natural and characteristic. Improve tags too.',
      JP: 'セリフをキャラクターの性格に合わせてより自然で個性的に。ト書きも整えてください。',
      CN: '打磨对话使其更自然、更有个性。也润色对话标签。',
    },
    insert_after: {
      KO: '이 문단 뒤에 이어지는 전환 장면을 200~400자로 새로 써줘.',
      EN: 'Write a 200-400 char transition scene to follow this paragraph.',
      JP: 'この段落の後に続く転換シーンを200〜400字で新しく書いてください。',
      CN: '在这段之后写一个200-400字的过渡场景。',
    },
  };

  const inst = instructions[action] ?? instructions.rewrite;
  const prompt = inst[language];
  const footer: Record<AppLanguage, string> = {
    KO: '순수 소설 텍스트만 출력. 설명/코멘트/따옴표 없이.',
    EN: 'Output pure fiction text only. No explanations/comments/quotes.',
    JP: '純粋な小説テキストのみ出力。説明/コメント/引用符なし。',
    CN: '仅输出纯小说文本。无解释/评论/引号。',
  };

  return `${prompt}\n\n[앞 문맥]\n${before}\n\n[대상 문단]\n${original}\n\n[뒤 문맥]\n${after}\n\n${footer[language]}`;
}

// ============================================================
// PART 3 — Component
// ============================================================

const ACTION_LABEL: Record<string, { label: Record<AppLanguage, string>; color: string }> = {
  rewrite: { label: { KO: '다시 쓰기', EN: 'Rewrite', JP: 'リライト', CN: '重写' }, color: 'text-blue-400 bg-blue-600/10 border-blue-500/20' },
  expand: { label: { KO: '살 붙이기', EN: 'Expand', JP: '拡張', CN: '扩展' }, color: 'text-green-400 bg-green-600/10 border-green-500/20' },
  compress: { label: { KO: '압축', EN: 'Compress', JP: '圧縮', CN: '压缩' }, color: 'text-orange-400 bg-orange-600/10 border-orange-500/20' },
  tension: { label: { KO: '긴장감', EN: 'Tension', JP: '緊張感', CN: '紧张感' }, color: 'text-red-400 bg-red-600/10 border-red-500/20' },
  dialogue: { label: { KO: '대사', EN: 'Dialogue', JP: 'セリフ', CN: '台词' }, color: 'text-pink-400 bg-pink-600/10 border-pink-500/20' },
  insert_after: { label: { KO: '삽입', EN: 'Insert', JP: '挿入', CN: '插入' }, color: 'text-purple-400 bg-purple-600/10 border-purple-500/20' },
};

const AutoRefiner: React.FC<AutoRefinerProps> = ({ content, language, context, onApply }) => {
  const t = createT(language);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'ready' | 'fixing'>('idle');
  const [, setCurrentFixIdx] = useState(-1);
  const [expanded, setExpanded] = useState(true);
  const [workingContent, setWorkingContent] = useState(content);
  const abortRef = useRef<AbortController | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [refinerError, setRefinerError] = useState<unknown>(null);
  const [streamingChars, setStreamingChars] = useState(0);

  // Step 1: AI analyzes the manuscript
  const startAnalysis = useCallback(async () => {
    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey && !hasDgxService()) {
      setRefinerError(new Error(t('autoRefiner.apiKeyMissing')));
      return;
    }

    setPhase('analyzing');
    setStreamingChars(0);
    setSuggestions([]);
    setWorkingContent(content);
    const controller = new AbortController();
    abortRef.current = controller;

    const prompt = buildAnalysisPrompt(content, language, context);
    const messages: ChatMsg[] = [{ role: 'user', content: prompt }];

    let raw = '';
    try {
      await streamChat({
        systemInstruction: ({KO:'소설 편집자. JSON 배열만 출력. 다른 텍스트 절대 금지.',EN:'Fiction editor. Output JSON array only. No other text.',JP:'小説編集者。JSON配列のみ出力。他のテキスト禁止。',CN:'小说编辑。仅输出JSON数组。禁止其他文本。'}[language]),
        messages,
        temperature: 0.3,
        signal: controller.signal,
        onChunk: (chunk) => { raw += chunk; setStreamingChars(prev => prev + chunk.length); },
      });

      // Parse JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        setPhase('idle');
        showAlert(t('autoRefiner.parseFailed'));
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
        showAlert(t('autoRefiner.noImprovements'));
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { /* cancelled */ }
      else { setRefinerError(err); }
      setPhase('idle');
    } finally {
      abortRef.current = null;
    }
  }, [content, language, context, t]);

  // Step 2: Fix suggestions one by one
  const fixSuggestion = useCallback(async (idx: number) => {
    const sug = suggestions[idx];
    if (!sug || sug.status !== 'pending') return;

    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey && !hasDgxService()) {
      showAlert(L4(language, { ko: 'API 키가 필요합니다. 설정에서 등록해주세요.', en: 'API key required. Please add one in Settings.', ja: 'APIキーが必要です。設定で登録してください。', zh: '需要API密钥，请在设置中添加。' }), 'warning');
      return;
    }

    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'generating' } : s));
    setCurrentFixIdx(idx);
    setPhase('fixing');

    const paragraphs = workingContent.split('\n\n').filter(p => p.trim());
    const pIdx = sug.paragraphIndex;
    const before = paragraphs.slice(Math.max(0, pIdx - 1), pIdx).join('\n\n');
    const after = paragraphs.slice(pIdx + 1, pIdx + 2).join('\n\n');

    const prompt = buildFixPrompt(sug.original, sug.action, before, after, language);
    const messages: ChatMsg[] = [{ role: 'user', content: prompt }];

    const controller = new AbortController();
    abortRef.current = controller;

    let result = '';
    try {
      await streamChat({
        systemInstruction: ({KO:'소설 텍스트 리라이터. 순수 소설 텍스트만 출력. 설명 금지.',EN:'Fiction rewriter. Output pure fiction text only. No explanations.',JP:'小説テキストリライター。純粋な小説テキストのみ出力。説明禁止。',CN:'小说文本改写器。仅输出纯小说文本。禁止解释。'}[language]),
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
  }, [suggestions, workingContent, language]);

  // Apply a single fix (with undo support)
  const applySuggestion = useCallback((idx: number) => {
    const sug = suggestions[idx];
    if (!sug?.result) return;

    // Save current state to undo stack
    setUndoStack(prev => [...prev, workingContent]);

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

  // Undo last applied fix
  const undoLast = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setWorkingContent(prev);
    // Revert last applied suggestion
    setSuggestions(prevSugs => {
      const lastApplied = [...prevSugs].reverse().findIndex(s => s.status === 'applied');
      if (lastApplied === -1) return prevSugs;
      const realIdx = prevSugs.length - 1 - lastApplied;
      return prevSugs.map((s, i) => i === realIdx ? { ...s, status: 'ready' } : s);
    });
  }, [undoStack]);

  // Skip a suggestion
  const skipSuggestion = (idx: number) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, status: 'skipped' } : s));
  };

  // Apply all ready fixes and finalize
  const applyAll = () => {
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

  return (
    <div className="border border-accent-purple/20 bg-accent-purple/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          <span className="text-[11px] font-black uppercase tracking-widest text-accent-purple font-mono">
            {t('autoRefiner.header')}
          </span>
          {suggestions.length > 0 && (
            <span className="text-[9px] text-text-tertiary font-mono">
              {appliedCount}/{suggestions.length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <button onClick={startAnalysis} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-mono hover:opacity-80 transition-opacity">
              <Play className="w-3 h-3" /> {t('autoRefiner.analyzeStart')}
            </button>
          )}
          {phase === 'analyzing' && (
            <>
              <StreamingIndicator charCount={streamingChars} language={language} />
              <button onClick={cancel} className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold font-mono hover:bg-red-600/30 transition-colors">
                <X className="w-3 h-3" /> {t('autoRefiner.stop')}
              </button>
            </>
          )}
          {phase === 'ready' && pendingCount > 0 && (
            <button onClick={runAllFixes} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-bold font-mono hover:bg-blue-600/30 transition-colors">
              <Play className="w-3 h-3" /> {t('autoRefiner.generateAll')}
            </button>
          )}
          {undoStack.length > 0 && (
            <button onClick={undoLast} className="flex items-center gap-1.5 px-2 py-1.5 bg-bg-tertiary/30 border border-zinc-600/30 text-text-secondary rounded-lg text-[10px] font-bold font-mono hover:bg-bg-tertiary/50 transition-colors" title={t('ui.undo')}>
              <Undo2 className="w-3 h-3" />
            </button>
          )}
          {appliedCount > 0 && (
            <button onClick={applyAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg text-[10px] font-bold font-mono hover:bg-green-600/30 transition-colors">
              <CheckCheck className="w-3 h-3" /> {t('autoRefiner.applyToMs')}
            </button>
          )}
          {phase !== 'idle' && (
            <button onClick={cancel} aria-label={L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })} className="p-1.5 text-text-tertiary hover:text-accent-red transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary cursor-pointer" onClick={() => setExpanded(false)} /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary cursor-pointer" onClick={() => setExpanded(true)} />}
        </div>
      </div>

      {/* Suggestion list */}
      {expanded && suggestions.length > 0 && (
        <div className="px-4 pb-4 space-y-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar">
          {suggestions.map((sug, idx) => {
            const actionInfo = ACTION_LABEL[sug.action] ?? ACTION_LABEL.rewrite;
            return (
              <div key={sug.id} className={`border rounded-xl p-3 space-y-2 transition-all ${
                sug.status === 'applied' ? 'border-green-500/20 bg-green-900/5' :
                sug.status === 'skipped' ? 'border-border/30 bg-bg-secondary/30 opacity-40' :
                sug.status === 'generating' ? 'border-blue-500/30 bg-blue-900/5' :
                'border-border bg-bg-secondary/30'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-tertiary font-mono">P{sug.paragraphIndex + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${actionInfo.color} font-mono`}>
                      {actionInfo.label[language]}
                    </span>
                    <span className="text-[10px] text-text-secondary">{sug.issue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sug.status === 'pending' && (
                      <>
                        <button onClick={() => fixSuggestion(idx)} className="p-1 rounded hover:bg-blue-900/20 text-blue-500/50 hover:text-blue-400 transition-colors" title={t('ui.generate')}>
                          <Play className="w-3 h-3" />
                        </button>
                        <button onClick={() => skipSuggestion(idx)} className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors" title={t('ui.skip')}>
                          <SkipForward className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {sug.status === 'generating' && (
                      <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    )}
                    {sug.status === 'ready' && (
                      <>
                        <button onClick={() => applySuggestion(idx)} className="p-1 rounded hover:bg-green-900/20 text-green-500/50 hover:text-green-400 transition-colors" title={t('ui.apply')}>
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => skipSuggestion(idx)} className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors" title={t('ui.skip')}>
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
                <p className="text-[10px] text-text-tertiary font-serif leading-relaxed line-clamp-2">{sug.original}</p>

                {/* Generated result */}
                {sug.result && sug.status !== 'skipped' && (
                  <div className="border-t border-border pt-2">
                    <p className="text-[11px] text-text-secondary font-serif leading-relaxed whitespace-pre-wrap">
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
          <p className="text-[11px] text-text-tertiary italic">
            {t('autoRefiner.emptyState')}
          </p>
        </div>
      )}
      {/* Error toast */}
      {refinerError !== null && (
        <ErrorToast error={refinerError} language={language} onDismiss={() => setRefinerError(null)} onRetry={() => { setRefinerError(null); startAnalysis(); }} />
      )}
    </div>
  );
};

export default AutoRefiner;
