// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  ReaderLevel, READER_LEVELS, GenreLevelReview,
  runGenreLevelReview, GENRE_BENCHMARKS, type AspectResult,
} from '@/engine/genre-review';
import { Genre, AppLanguage, StoryConfig } from '@/lib/studio-types';
import { Send, BarChart3, User, Bot, ChevronDown, Sparkles } from 'lucide-react';
import { createT } from '@/lib/i18n';

// ============================================================
// PART 1 — CHAT MESSAGE TYPES
// ============================================================

interface ReviewMessage {
  id: string;
  role: 'user' | 'reviewer';
  content: string;
  review?: GenreLevelReview;
  timestamp: number;
}

interface GenreReviewChatProps {
  language: AppLanguage;
  config: StoryConfig;
  /** 현재 세션의 원고 텍스트 (messages에서 추출) */
  manuscriptText: string;
}

// ============================================================
// PART 2 — SEVERITY / GRADE COLORS
// ============================================================

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ok:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  warn:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  danger: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
};

const GRADE_COLOR: Record<string, string> = {
  S: 'text-amber-300', A: 'text-emerald-400', B: 'text-blue-400', C: 'text-amber-500', D: 'text-red-400',
};

// ============================================================
// PART 3 — ASPECT BAR SUB-COMPONENT
// ============================================================

const AspectBar: React.FC<{ aspect: AspectResult; lang: 'ko' | 'en' }> = ({ aspect, lang }) => {
  const style = SEVERITY_STYLE[aspect.severity];
  const pct = Math.min(100, aspect.value);
  const bmLeft = aspect.benchmark.min;
  const bmRight = aspect.benchmark.max;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-3 space-y-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold">{aspect.label[lang]}</span>
        <span className={`text-[10px] font-bold ${style.text}`}>
          {aspect.value}{aspect.unit === '%' ? '%' : ` ${aspect.unit}`}
        </span>
      </div>
      {/* Benchmark bar */}
      <div className="relative h-3 bg-bg-primary rounded-full overflow-visible">
        {/* Benchmark zone */}
        <div
          className="absolute h-full bg-white/5 rounded-full"
          style={{ left: `${bmLeft}%`, width: `${bmRight - bmLeft}%` }}
        />
        {/* Benchmark labels */}
        <span className="absolute text-[7px] text-text-tertiary" style={{ left: `${bmLeft}%`, top: '-12px' }}>{bmLeft}</span>
        <span className="absolute text-[7px] text-text-tertiary" style={{ left: `${bmRight}%`, top: '-12px' }}>{bmRight}</span>
        {/* Current value marker */}
        <div
          className="absolute top-0 h-full w-1.5 rounded-full transition-all"
          style={{
            left: `${Math.min(98, pct)}%`,
            backgroundColor: aspect.severity === 'ok' ? '#22c55e' : aspect.severity === 'warn' ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <p className="text-[10px] text-text-secondary">{aspect.comment[lang]}</p>
    </div>
  );
};

// ============================================================
// PART 4 — REVIEW RESULT BUBBLE
// ============================================================

const ReviewBubble: React.FC<{ review: GenreLevelReview; lang: 'ko' | 'en' }> = ({ review, lang }) => {
  const [expanded, setExpanded] = useState(true);
  const genreBm = GENRE_BENCHMARKS[review.genre];
  const genreLabel = genreBm?.label[lang] ?? review.genre;

  return (
    <div className="space-y-3">
      {/* Grade header */}
      <div className="flex items-center gap-3">
        <span className={`text-3xl font-black ${GRADE_COLOR[review.overallGrade] ?? 'text-text-primary'}`}>
          {review.overallGrade}
        </span>
        <div>
          <p className="text-xs font-bold">{review.levelMeta.label[lang]}</p>
          <p className="text-[10px] text-text-tertiary">{genreLabel} · {review.levelMeta.desc[lang]}</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-text-secondary">{review.summary[lang]}</p>

      {/* Toggle details */}
      <button onClick={() => setExpanded(p => !p)} className="flex items-center gap-1 text-[10px] text-accent-purple font-bold">
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        {(() => { const tw = createT(lang === 'ko' ? 'KO' : 'EN'); return expanded ? tw('genreReview.collapseDetail') : tw('genreReview.expandDetail'); })()}
      </button>

      {expanded && (
        <div className="space-y-2">
          {review.aspects.map(a => (
            <AspectBar key={a.key} aspect={a} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PART 5 — MAIN CHAT COMPONENT
// ============================================================

const GenreReviewChat: React.FC<GenreReviewChatProps> = ({ language, config, manuscriptText }) => {
  const lang = (language === 'KO' || language === 'JA') ? 'ko' : 'en';
  const t = createT(language);

  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<ReaderLevel>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const genre = config.genre as Genre;
  const genreBm = GENRE_BENCHMARKS[genre];
  const genreLabel = genreBm?.label[lang] ?? genre;

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 웰컴 메시지 (최초 1회)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'reviewer',
        content: ({
          KO: `📊 장르×레벨 리뷰어입니다. 현재 장르: ${genreLabel}\n\n레벨을 선택하고 "리뷰 요청"을 누르면, 해당 레벨 독자/편집자/비평가 시점에서 원고를 분석합니다.\n\n평균으로 때리지 않습니다. ${genreLabel} 장르 기준선 위에 현재 원고의 위치를 찍어드립니다.`,
          EN: `📊 Genre×Level Reviewer. Current genre: ${genreLabel}\n\nSelect a level and click "Request Review" to analyze your manuscript from that perspective.\n\nNo averages. We plot your manuscript's position on the ${genreLabel} genre benchmark.`,
          JA: `📊 ジャンル×レベルレビュアーです。現在のジャンル: ${genreLabel}\n\nレベルを選択し「レビュー依頼」をクリックすると、該当レベルの読者/編集者/批評家の視点で原稿を分析します。\n\n平均で打ちません。${genreLabel}ジャンル基準線上に現在の原稿の位置をプロットします。`,
          ZH: `📊 类型×等级审阅器。当前类型: ${genreLabel}\n\n选择等级并点击"请求审阅"，将从该等级读者/编辑/评论家的角度分析稿件。\n\n不打平均分。我们在${genreLabel}类型基准线上标注您稿件的位置。`,
        }[language]),
        timestamp: Date.now(),
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestReview = () => {
    if (!manuscriptText || manuscriptText.trim().length < 50) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'reviewer',
        content: t('genreReview.insufficientMs'),
        timestamp: Date.now(),
      }]);
      return;
    }

    const levelMeta = READER_LEVELS.find(l => l.level === selectedLevel) ?? READER_LEVELS[0];

    // 유저 메시지
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: ({
        KO: `${genreLabel} 장르 / ${levelMeta.label.ko} 시점으로 리뷰해줘`,
        EN: `Review as ${genreLabel} / ${levelMeta.label.en}`,
        JA: `${genreLabel}ジャンル / ${levelMeta.label.ko}の視点でレビューして`,
        ZH: `以${genreLabel}类型 / ${levelMeta.label.en}视角审阅`,
      }[language]),
      timestamp: Date.now(),
    }]);

    setIsAnalyzing(true);

    // 비동기 시뮬레이션 (실제로는 동기지만 UX를 위해 딜레이)
    setTimeout(() => {
      const review = runGenreLevelReview(manuscriptText, genre, selectedLevel);

      setMessages(prev => [...prev, {
        id: `review-${Date.now()}`,
        role: 'reviewer',
        content: '',
        review,
        timestamp: Date.now(),
      }]);

      setIsAnalyzing(false);
    }, 800);
  };

  const runAllLevels = () => {
    if (!manuscriptText || manuscriptText.trim().length < 50) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'reviewer',
        content: t('genreReview.insufficientShort'),
        timestamp: Date.now(),
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: ({KO:`${genreLabel} 장르 / 전체 레벨 (Lv.1~4) 풀 리뷰`,EN:`Full review: ${genreLabel} / All levels (Lv.1~4)`,JA:`${genreLabel}ジャンル / 全レベル (Lv.1~4) フルレビュー`,ZH:`${genreLabel}类型 / 全等级 (Lv.1~4) 完整审阅`}[language]),
      timestamp: Date.now(),
    }]);

    setIsAnalyzing(true);

    setTimeout(() => {
      const reviews: GenreLevelReview[] = ([1, 2, 3, 4] as ReaderLevel[]).map(lv =>
        runGenreLevelReview(manuscriptText, genre, lv)
      );

      for (const review of reviews) {
        setMessages(prev => [...prev, {
          id: `review-${Date.now()}-${review.level}`,
          role: 'reviewer',
          content: '',
          review,
          timestamp: Date.now() + review.level,
        }]);
      }

      setIsAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[600px] bg-bg-primary border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent-purple" />
          <span className="text-xs font-bold">{t('genreReview.title')}</span>
          <span className="text-[9px] text-text-tertiary px-2 py-0.5 bg-bg-primary rounded-full">{genreLabel}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'reviewer' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-accent-purple" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-accent-purple text-white rounded-br-md'
                : 'bg-bg-secondary border border-border rounded-bl-md'
            }`}>
              {msg.review ? (
                <ReviewBubble review={msg.review} lang={lang} />
              ) : (
                <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-accent-purple animate-pulse" />
            </div>
            <div className="bg-bg-secondary border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border px-4 py-3 bg-bg-secondary space-y-2">
        {/* Level selector */}
        <div className="flex gap-1.5 flex-wrap">
          {READER_LEVELS.map(lv => (
            <button
              key={lv.level}
              onClick={() => setSelectedLevel(lv.level)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                selectedLevel === lv.level
                  ? 'bg-accent-purple text-white'
                  : 'bg-bg-primary text-text-tertiary hover:text-text-primary'
              }`}
              title={lv.desc[lang]}
            >
              {lv.label[lang]}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={requestReview}
            disabled={isAnalyzing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-xl text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {t('genreReview.requestReview')}
          </button>
          <button
            onClick={runAllLevels}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('genreReview.fullReview')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenreReviewChat;
