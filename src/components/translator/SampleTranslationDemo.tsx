'use client';

// ============================================================
// SampleTranslationDemo — 30초 번역 체험 위젯
// 가입 없이 즉시 번역 결과 + 6축 점수 확인 (하드코딩 샘플)
// Translation Studio 랜딩 첫 방문자 이탈 방지
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useLang, type Lang } from '@/lib/LangContext';

// ============================================================
// PART 1 — 타입 + 상수 (샘플 데이터 모듈 상수화: 렌더마다 재생성 방지)
// ============================================================

type GenreKey = 'fantasy' | 'romance' | 'modern' | 'action';

interface SampleTranslation {
  genre: GenreKey;
  korean: string;
  english: string;
  scores: {
    immersion: number;
    emotion: number;
    cultural: number;
    consistency: number;
    grounded: number;
    voice: number;
  };
}

const SAMPLES: readonly SampleTranslation[] = [
  {
    genre: 'fantasy',
    korean: '갑자기 비가 내렸다. 그는 칼자루를 움켜쥐며 어둠 속을 응시했다. 마왕의 기운이 가까워지고 있었다.',
    english:
      "Suddenly, rain began to fall. Gripping the hilt of his sword, he stared into the darkness. The Demon King's aura was drawing near.",
    scores: { immersion: 0.92, emotion: 0.88, cultural: 0.91, consistency: 0.94, grounded: 0.89, voice: 0.93 },
  },
  {
    genre: 'romance',
    korean: '그녀의 손이 떨렸다. "정말... 저를 기억하시는 건가요?" 눈물이 하얀 뺨을 타고 흘러내렸다.',
    english:
      'Her hands trembled. "Do you... truly remember me?" Tears traced down her pale cheeks.',
    scores: { immersion: 0.95, emotion: 0.96, cultural: 0.87, consistency: 0.93, grounded: 0.91, voice: 0.94 },
  },
  {
    genre: 'modern',
    korean: '그는 주식 차트를 보며 한숨을 쉬었다. "이번 달도 망했네." 커피 잔을 들며 창밖을 바라봤다.',
    english:
      'He sighed, staring at the stock chart. "Another bad month." He raised his coffee cup and gazed out the window.',
    scores: { immersion: 0.89, emotion: 0.85, cultural: 0.94, consistency: 0.92, grounded: 0.95, voice: 0.91 },
  },
  {
    genre: 'action',
    korean: '총성이 울렸다. 피가 튀었다. 그는 마지막 탄창을 장전하며 이를 악물었다. "한 놈 더."',
    english:
      'A gunshot rang out. Blood splattered. He loaded the last magazine, gritting his teeth. "One more."',
    scores: { immersion: 0.94, emotion: 0.9, cultural: 0.93, consistency: 0.91, grounded: 0.93, voice: 0.96 },
  },
] as const;

const MAX_CUSTOM_LEN = 200;
const FAKE_TRANSLATE_MS = 2000;

// ============================================================
// PART 2 — i18n 번역 테이블 (4언어)
// ============================================================

type I18nKey =
  | 'title'
  | 'noSignup'
  | 'fantasy'
  | 'romance'
  | 'modern'
  | 'action'
  | 'custom'
  | 'placeholder'
  | 'translate'
  | 'translating'
  | 'enLabel'
  | 'scoreImmersion'
  | 'scoreEmotion'
  | 'scoreCultural'
  | 'scoreConsistency'
  | 'scoreGrounded'
  | 'scoreVoice'
  | 'hint'
  | 'customCtaText'
  | 'tryReal';

const I18N: Record<I18nKey, Record<Lang, string>> = {
  title: {
    ko: '30초 번역 체험',
    en: '30-Second Translation Demo',
    ja: '30秒翻訳デモ',
    zh: '30 秒翻译体验',
  },
  noSignup: {
    ko: '가입 없이 즉시 결과',
    en: 'No signup · Instant result',
    ja: '登録不要・即時結果',
    zh: '无需注册 · 即时结果',
  },
  fantasy: { ko: '판타지', en: 'Fantasy', ja: 'ファンタジー', zh: '奇幻' },
  romance: { ko: '로맨스', en: 'Romance', ja: 'ロマンス', zh: '浪漫' },
  modern: { ko: '현대', en: 'Modern', ja: '現代', zh: '现代' },
  action: { ko: '액션', en: 'Action', ja: 'アクション', zh: '动作' },
  custom: { ko: '직접 입력', en: 'Custom', ja: '直接入力', zh: '自定义' },
  placeholder: {
    ko: '한국어 문장을 입력하세요 (최대 200자)',
    en: 'Enter a Korean sentence (max 200 chars)',
    ja: '韓国語の文を入力 (最大200字)',
    zh: '输入韩语句子 (最多 200 字)',
  },
  translate: {
    ko: '번역 + 6축 점수 보기',
    en: 'Translate + View 6-Axis Scores',
    ja: '翻訳 + 6軸スコア表示',
    zh: '翻译 + 查看 6 轴评分',
  },
  translating: { ko: '번역 중...', en: 'Translating...', ja: '翻訳中...', zh: '翻译中...' },
  enLabel: { ko: 'EN', en: 'EN', ja: 'EN', zh: 'EN' },
  scoreImmersion: { ko: '몰입', en: 'Immersion', ja: '没入', zh: '沉浸' },
  scoreEmotion: { ko: '감정', en: 'Emotion', ja: '感情', zh: '情感' },
  scoreCultural: { ko: '문화', en: 'Cultural', ja: '文化', zh: '文化' },
  scoreConsistency: { ko: '일관', en: 'Consist', ja: '一貫', zh: '一致' },
  scoreGrounded: { ko: '근거', en: 'Grounded', ja: '根拠', zh: '依据' },
  scoreVoice: { ko: '화자', en: 'Voice', ja: '語り手', zh: '声音' },
  hint: {
    ko: '실제 번역에서는 세계관·캐릭터·용어집이 자동 주입됩니다',
    en: 'Real translation auto-injects world, characters, and glossary',
    ja: '実際の翻訳では世界観・キャラ・用語集が自動注入されます',
    zh: '实际翻译会自动注入世界观、角色和术语表',
  },
  customCtaText: {
    ko: '직접 입력한 내용은 가입 후 실제 번역 가능합니다.',
    en: 'Custom text requires signup for real translation.',
    ja: '直接入力した内容は登録後に実翻訳できます。',
    zh: '自定义内容需注册后方可实际翻译。',
  },
  tryReal: {
    ko: '실제 번역 시작',
    en: 'Start Real Translation',
    ja: '実翻訳を開始',
    zh: '开始实际翻译',
  },
};

function t(key: I18nKey, lang: Lang): string {
  return I18N[key][lang] ?? I18N[key].ko;
}

// ============================================================
// PART 3 — 메인 컴포넌트
// ============================================================

export function SampleTranslationDemo() {
  const { lang } = useLang();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // [C] SAMPLES[selectedIdx] 경계값 방어 (0..length-1)
  const current = useMemo(() => {
    const safeIdx = Math.min(Math.max(0, selectedIdx), SAMPLES.length - 1);
    return SAMPLES[safeIdx];
  }, [selectedIdx]);

  const handleTranslate = useCallback(() => {
    if (useCustom && !customText.trim()) return;
    setIsAnimating(true);
    setShowResult(false);
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setShowResult(true);
    }, FAKE_TRANSLATE_MS);
    return () => clearTimeout(timer);
  }, [useCustom, customText]);

  const handleSelectSample = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setUseCustom(false);
    setShowResult(false);
  }, []);

  const handleSelectCustom = useCallback(() => {
    setUseCustom(true);
    setShowResult(false);
  }, []);

  const disabled = isAnimating || (useCustom && !customText.trim());

  return (
    <section
      className="max-w-3xl mx-auto my-8 p-6 bg-bg-secondary border border-border rounded-xl shadow-lg"
      aria-label={t('title', lang)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-accent-amber" aria-hidden="true" />
        <h2 className="text-xl font-bold text-text-primary">{t('title', lang)}</h2>
        <span className="ml-auto text-xs text-text-tertiary">{t('noSignup', lang)}</span>
      </div>

      {/* Genre selector */}
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label={t('title', lang)}>
        {SAMPLES.map((s, i) => {
          const active = !useCustom && selectedIdx === i;
          return (
            <button
              key={s.genre}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectSample(i)}
              className={`px-3 py-1.5 text-sm rounded transition min-h-[36px] focus-visible:ring-2 focus-visible:ring-accent-amber outline-none ${
                active
                  ? 'bg-accent-amber text-white'
                  : 'bg-bg-primary hover:bg-bg-tertiary text-text-secondary border border-border'
              }`}
            >
              {t(s.genre, lang)}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={useCustom}
          onClick={handleSelectCustom}
          className={`px-3 py-1.5 text-sm rounded transition min-h-[36px] focus-visible:ring-2 focus-visible:ring-accent-amber outline-none ${
            useCustom
              ? 'bg-accent-amber text-white'
              : 'bg-bg-primary hover:bg-bg-tertiary text-text-secondary border border-border'
          }`}
        >
          {t('custom', lang)}
        </button>
      </div>

      {/* Korean input / sample display */}
      {useCustom ? (
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value.slice(0, MAX_CUSTOM_LEN))}
          placeholder={t('placeholder', lang)}
          maxLength={MAX_CUSTOM_LEN}
          rows={3}
          aria-label={t('placeholder', lang)}
          className="w-full p-3 bg-bg-primary border border-border rounded mb-3 text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-accent-amber outline-none"
        />
      ) : (
        <div className="p-3 bg-bg-primary border border-border rounded mb-3 text-sm text-text-primary min-h-[80px] whitespace-pre-wrap">
          {current.korean}
        </div>
      )}

      {/* Translate button */}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={disabled}
        className="w-full py-2.5 bg-accent-amber hover:bg-accent-amber/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium inline-flex items-center justify-center gap-2 transition min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:ring-offset-2 outline-none"
      >
        {isAnimating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t('translating', lang)}
          </>
        ) : (
          <>
            {t('translate', lang)}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>

      {/* Result (sample) */}
      {showResult && !useCustom && (
        <div className="mt-4 space-y-3 cs-animate-fade-in">
          <div className="p-3 bg-accent-amber/5 border border-accent-amber/20 rounded text-sm">
            <div className="text-xs text-accent-amber font-medium mb-1">{t('enLabel', lang)}</div>
            <div className="text-text-primary">{current.english}</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ScoreCard label={t('scoreImmersion', lang)} value={current.scores.immersion} />
            <ScoreCard label={t('scoreEmotion', lang)} value={current.scores.emotion} />
            <ScoreCard label={t('scoreCultural', lang)} value={current.scores.cultural} />
            <ScoreCard label={t('scoreConsistency', lang)} value={current.scores.consistency} />
            <ScoreCard label={t('scoreGrounded', lang)} value={current.scores.grounded} />
            <ScoreCard label={t('scoreVoice', lang)} value={current.scores.voice} />
          </div>

          <p className="text-xs text-text-tertiary mt-2 italic">{t('hint', lang)}</p>
        </div>
      )}

      {/* Result (custom — no fake translation, guide to signup) */}
      {showResult && useCustom && (
        <div className="mt-4 p-4 bg-bg-primary border border-border rounded text-center cs-animate-fade-in">
          <p className="text-sm text-text-secondary mb-2">{t('customCtaText', lang)}</p>
          <a
            href="/translation-studio"
            className="inline-flex items-center gap-1 text-accent-amber hover:underline text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent-amber rounded outline-none"
          >
            {t('tryReal', lang)}
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
}

// ============================================================
// PART 4 — ScoreCard 서브 컴포넌트
// ============================================================

function ScoreCard({ label, value }: { label: string; value: number }) {
  // [C] 값 범위 방어 (0..1)
  const safe = Math.min(Math.max(0, value), 1);
  // 색상 + 텍스트 2가지 신호 (Design System: 색상 단독 금지)
  const color = safe >= 0.9 ? 'text-green-400' : safe >= 0.8 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="p-2 bg-bg-primary border border-border rounded text-center">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${color}`} aria-label={`${label} ${safe.toFixed(2)}`}>
        {safe.toFixed(2)}
      </div>
    </div>
  );
}

export default SampleTranslationDemo;
