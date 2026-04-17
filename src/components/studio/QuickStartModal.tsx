"use client";

import { useState, type FormEvent } from "react";
import { X, Sparkles, Wand2, Loader2, BookOpen } from "lucide-react";
import { Genre, type AppLanguage } from "@/lib/studio-types";
import { GENRE_LABELS } from "@/lib/studio-constants";
import { createT, L4 } from "@/lib/i18n";

interface QuickStartModalProps {
  language: AppLanguage;
  isOpen: boolean;
  onClose: () => void;
  onStart: (genre: Genre, prompt: string) => Promise<void>;
  isGenerating: boolean;
}

export default function QuickStartModal({
  language,
  isOpen,
  onClose,
  onStart,
  isGenerating,
}: QuickStartModalProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(Genre.FANTASY);
  const [prompt, setPrompt] = useState("");
  const t = createT(language);
  const trimmedPrompt = prompt.trim();

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedPrompt || isGenerating) {
      return;
    }
    void onStart(selectedGenre, trimmedPrompt);
  };

  return (
    <div className="animate-in fade-in zoom-in fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md duration-300">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[2rem] border border-border/80 bg-bg-primary shadow-2xl shadow-accent-purple/20" role="dialog" aria-modal="true">
        <div className="relative px-8 pb-4 pt-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label={t('quickStartModal.closeQuickStart')}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10">
              <Sparkles className="h-6 w-6 text-accent-purple" />
            </div>
            <h2 className="font-mono text-2xl font-black italic tracking-tighter">
              {t('quickStartModal.title')}
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-text-tertiary">
            {t('quickStartModal.desc')}
          </p>

          <div className="mt-4 rounded-2xl border border-white/6 bg-bg-secondary/70 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-purple">
              {t('quickStartModal.flowLabel')}
            </p>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              {t('quickStartModal.flowDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {t('quickStartModal.selectGenre')}
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Genre).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-xl border px-4 min-h-[40px] text-[13px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                    selectedGenre === genre
                      ? "border-accent-purple bg-accent-purple text-white shadow-lg shadow-accent-purple/20"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary"
                  }`}
                >
                  {GENRE_LABELS[language][genre]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {t('quickStartModal.storyPrompt')}
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('quickStartModal.placeholder')}
                className="h-32 w-full resize-none rounded-2xl border border-border bg-bg-secondary p-4 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color] placeholder:text-text-tertiary focus:border-accent-purple"
                disabled={isGenerating}
                maxLength={240}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[11px] font-mono text-text-tertiary tabular-nums">{prompt.length}/240</span>
                <BookOpen className="h-5 w-5 text-text-tertiary opacity-20" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { ko: '회귀한 공작이 망해가는 가문을 구한다', en: 'A regressed duke saves his crumbling family', ja: '回帰した公爵が没落する家門を救う', zh: '回归的公爵拯救没落的家族' },
                { ko: '시스템 능력을 얻은 평범한 고등학생', en: 'An ordinary student gains a System ability', ja: 'システム能力を得た普通の高校生', zh: '获得系统能力的普通高中生' },
                { ko: '마왕을 쓰러뜨린 용사의 일상', en: 'The daily life of a hero who defeated the Demon King', ja: '魔王を倒した勇者の日常', zh: '打败魔王的勇者的日常' },
              ].map((ex, i) => (
                <button key={i} type="button" onClick={() => setPrompt(L4(language, ex))}
                  className="px-3 min-h-[36px] rounded-lg border border-border/50 text-[12px] text-text-tertiary hover:text-text-secondary hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-colors">
                  {L4(language, ex)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!trimmedPrompt || isGenerating}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-[0.2em] transition-[transform,opacity,background-color,border-color,color] ${
              !trimmedPrompt || isGenerating
                ? "cursor-not-allowed bg-bg-secondary text-text-tertiary"
                : "bg-accent-purple text-white shadow-xl shadow-accent-purple/20 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('quickStartModal.generating')}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                {t('quickStartModal.submit')}
              </>
            )}
          </button>

          <p className="text-center font-mono text-[10px] uppercase tracking-tight text-text-tertiary/60">
            Title + World Hook + Character Seed + First Scene
          </p>
        </form>
      </div>
    </div>
  );
}
