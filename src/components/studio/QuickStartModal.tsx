"use client";

import { useState, type FormEvent } from "react";
import { X, Sparkles, Wand2, Loader2, BookOpen } from "lucide-react";
import { Genre, type AppLanguage } from "@/lib/studio-types";
import { GENRE_LABELS } from "@/lib/studio-constants";
import { createT } from "@/lib/i18n";

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
  const [selectedGenre, setSelectedGenre] = useState<Genre>(Genre.SF);
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
    <div className="animate-in fade-in zoom-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/80 bg-bg-primary shadow-2xl shadow-accent-purple/20" role="dialog" aria-modal="true">
        <div className="relative px-8 pb-4 pt-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
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
                  className={`rounded-xl border px-4 py-2 text-[11px] font-bold transition-all ${
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
                autoFocus
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('quickStartModal.placeholder')}
                className="h-32 w-full resize-none rounded-2xl border border-border bg-bg-secondary p-4 text-sm leading-relaxed outline-none transition-all placeholder:text-text-tertiary focus:border-accent-purple"
                disabled={isGenerating}
                maxLength={240}
              />
              <div className="absolute bottom-3 right-3 opacity-20">
                <BookOpen className="h-5 w-5 text-text-tertiary" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!trimmedPrompt || isGenerating}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${
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
