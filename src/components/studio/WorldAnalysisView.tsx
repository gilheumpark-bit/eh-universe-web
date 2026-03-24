'use client';

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { Search, Loader2, BookOpen, Layers, Map, Users, Zap, AlertTriangle, Copy, Check } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';

interface WorldAnalysisViewProps {
  language: AppLanguage;
  config?: import('@/lib/studio-types').StoryConfig | null;
}

interface AnalysisResult {
  worldStructure: string;
  powerSystem: string;
  geography: string;
  factions: string;
  inconsistencies: string;
  summary: string;
}

// ============================================================
// PART 2 — Analysis Prompt Builder
// ============================================================

function buildAnalysisPrompt(language: AppLanguage): string {
  const prompts: Record<AppLanguage, string> = {
    KO: `당신은 소설 세계관 분석 전문가입니다. 주어진 텍스트에서 세계관 요소를 추출하고 분석합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:

{
  "worldStructure": "세계의 물리적/형이상학적 구조, 법칙, 시대 배경 분석",
  "powerSystem": "마법/기술/능력 체계, 비용-효과 밸런스, 제한 조건 분석",
  "geography": "지리적 구조, 핵심 장소, 공간적 관계 분석",
  "factions": "세력/종족/조직 구조, 관계도, 갈등 축 분석",
  "inconsistencies": "발견된 세계관 내 모순, 논리적 허점, 미설명 요소",
  "summary": "전체 세계관 평가 (강점, 약점, 독창성 점수 1-10)"
}

텍스트가 짧거나 세계관 요소가 부족하면, 해당 필드에 "정보 부족"이라고 적으세요.`,
    EN: `You are a fiction worldbuilding analysis expert. Extract and analyze worldbuilding elements from the given text.

Respond ONLY in the JSON format below. No other text:

{
  "worldStructure": "Analysis of physical/metaphysical structure, laws, era/setting",
  "powerSystem": "Magic/tech/ability systems, cost-benefit balance, limitations",
  "geography": "Geographic structure, key locations, spatial relationships",
  "factions": "Factions/races/organizations, relationships, conflict axes",
  "inconsistencies": "Contradictions, logical gaps, unexplained elements found",
  "summary": "Overall evaluation (strengths, weaknesses, originality score 1-10)"
}

If text is short or lacks worldbuilding elements, write "Insufficient data" for that field.`,
    JP: `あなたは小説の世界観分析の専門家です。与えられたテキストから世界観要素を抽出し分析します。

必ず以下のJSON形式のみで応答してください。他のテキストなしにJSONのみ出力:

{
  "worldStructure": "世界の物理的/形而上学的構造、法則、時代背景の分析",
  "powerSystem": "魔法/技術/能力体系、コスト効果バランス、制限条件の分析",
  "geography": "地理的構造、核心的場所、空間的関係の分析",
  "factions": "勢力/種族/組織構造、関係図、対立軸の分析",
  "inconsistencies": "発見された世界観内の矛盾、論理的穴、未説明要素",
  "summary": "全体的な世界観評価（強み、弱み、独創性スコア1-10）"
}

テキストが短いか世界観要素が不足している場合、該当フィールドに「情報不足」と記入してください。`,
    CN: `你是小说世界观分析专家。从给定文本中提取和分析世界观元素。

请务必仅以下面的JSON格式回答。不要输出其他文本:

{
  "worldStructure": "世界的物理/形而上学结构、法则、时代背景分析",
  "powerSystem": "魔法/技术/能力体系、成本效果平衡、限制条件分析",
  "geography": "地理结构、核心场所、空间关系分析",
  "factions": "势力/种族/组织结构、关系图、冲突轴分析",
  "inconsistencies": "发现的世界观内矛盾、逻辑漏洞、未解释元素",
  "summary": "整体世界观评价（优点、缺点、独创性评分1-10）"
}

如果文本太短或缺乏世界观元素，请在相应字段填写"信息不足"。`,
  };
  return prompts[language];
}

// ============================================================
// PART 3 — Component
// ============================================================

const SECTION_ICONS = {
  worldStructure: Layers,
  powerSystem: Zap,
  geography: Map,
  factions: Users,
  inconsistencies: AlertTriangle,
  summary: BookOpen,
};

const SECTION_LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: {
    worldStructure: '세계 구조',
    powerSystem: '능력 체계',
    geography: '지리/공간',
    factions: '세력/조직',
    inconsistencies: '모순 탐지',
    summary: '종합 평가',
  },
  EN: {
    worldStructure: 'World Structure',
    powerSystem: 'Power System',
    geography: 'Geography',
    factions: 'Factions',
    inconsistencies: 'Inconsistencies',
    summary: 'Summary',
  },
  JP: {
    worldStructure: '世界構造',
    powerSystem: '能力体系',
    geography: '地理/空間',
    factions: '勢力/組織',
    inconsistencies: '矛盾検出',
    summary: '総合評価',
  },
  CN: {
    worldStructure: '世界结构',
    powerSystem: '能力体系',
    geography: '地理/空间',
    factions: '势力/组织',
    inconsistencies: '矛盾检测',
    summary: '综合评价',
  },
};

const WorldAnalysisView: React.FC<WorldAnalysisViewProps> = ({ language, config }) => {
  const t = createT(language);
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 설계/시뮬레이터 데이터 불러오기
  const loadFromConfig = useCallback(() => {
    if (!config) return;
    const parts: string[] = [];
    if (config.title) parts.push(`[제목] ${config.title}`);
    if (config.synopsis) parts.push(`[시놉시스]\n${config.synopsis}`);
    if (config.genre) parts.push(`[장르] ${config.genre}`);
    if (config.corePremise) parts.push(`[핵심 전제]\n${config.corePremise}`);
    if (config.powerStructure) parts.push(`[권력 구조]\n${config.powerStructure}`);
    if (config.characters?.length) {
      parts.push(`[캐릭터 ${config.characters.length}명]`);
      config.characters.forEach(c => {
        let line = `- ${c.name} (${c.role}): ${c.traits}`;
        if (c.personality) line += ` / 성격: ${c.personality}`;
        if (c.desire) line += ` / 욕망: ${c.desire}`;
        if (c.deficiency) line += ` / 결핍: ${c.deficiency}`;
        parts.push(line);
      });
    }
    if (config.charRelations?.length) {
      parts.push(`[관계도]`);
      config.charRelations.forEach(r => parts.push(`- ${r.from} ↔ ${r.to}: ${r.type}`));
    }
    setInputText(parts.join('\n\n'));
  }, [config]);

  const handleAnalyze = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const provider = getActiveProvider();
    if (!getApiKey(provider)) {
      setError(t('worldAnalysis.apiKeyAlert'));
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messages: ChatMsg[] = [
        { role: 'user', content: trimmed },
      ];

      let fullResponse = '';
      await streamChat({
        messages,
        onChunk: (chunk: string) => { fullResponse += chunk; },
        systemInstruction: buildAnalysisPrompt(language),
        temperature: 0.3,
        signal: controller.signal,
      });

      // JSON 파싱
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
        setResult(parsed);
      } else {
        setError(t('worldAnalysis.parseFailed'));
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(t('worldAnalysis.analysisFailed'));
      }
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is derived from language (already in deps)
  }, [inputText, language]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    const text = Object.entries(result)
      .map(([key, val]) => `[${SECTION_LABELS[language][key] ?? key}]\n${val}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result, language]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setAnalyzing(false);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-8 animate-in fade-in duration-700 pb-32">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">
          {t('worldAnalysis.title')}
        </h2>
        <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">
          WORLDBUILDING REVERSE ENGINEER
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            {t('worldAnalysis.inputLabel')}
          </label>
          {config && (
            <button
              onClick={loadFromConfig}
              className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/30 rounded-lg text-xs font-bold text-accent-purple hover:bg-accent-purple/20 transition-colors font-[family-name:var(--font-mono)]"
            >
              📥 {language === 'KO' ? '설계 데이터 불러오기' : language === 'JP' ? '設計データ読込' : language === 'CN' ? '加载设计数据' : 'Load Design Data'}
            </button>
          )}
        </div>
        <textarea
          className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-sm h-64 resize-none focus:border-blue-600 outline-none font-serif leading-relaxed"
          placeholder={t('worldAnalysis.inputPlaceholder')}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-mono">
            {inputText.length.toLocaleString()}{t('worldAnalysis.chars')}
          </span>
          <div className="flex gap-2">
            {analyzing && (
              <button onClick={handleCancel}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">
                {t('worldAnalysis.cancelBtn')}
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !inputText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all active:scale-95 disabled:opacity-40"
            >
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {analyzing ? t('worldAnalysis.analyzing') : t('worldAnalysis.analyze')}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              {t('worldAnalysis.results')}
            </h3>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white transition-colors">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? t('worldAnalysis.copied') : t('worldAnalysis.copyAll')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(SECTION_ICONS) as (keyof typeof SECTION_ICONS)[]).map(key => {
              const Icon = SECTION_ICONS[key];
              const label = SECTION_LABELS[language][key] ?? key;
              const value = result[key];
              const isWarning = key === 'inconsistencies';

              return (
                <div key={key}
                  className={`p-5 rounded-2xl border space-y-2 ${
                    key === 'summary'
                      ? 'md:col-span-2 bg-accent-purple/5 border-accent-purple/20'
                      : isWarning
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-zinc-900/30 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isWarning ? 'text-amber-400' : key === 'summary' ? 'text-accent-purple' : 'text-blue-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldAnalysisView;
