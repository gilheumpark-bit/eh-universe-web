"use client";

import React, { useState } from 'react';
import { X, Sparkles, Wand2, Loader2, BookOpen } from 'lucide-react';
import { Genre, AppLanguage } from '@/lib/studio-types';
import { GENRE_LABELS } from '@/lib/studio-constants';

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
  isGenerating
}: QuickStartModalProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(Genre.SF);
  const [prompt, setPrompt] = useState('');
  const isKO = language === 'KO';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    void onStart(selectedGenre, prompt);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-in fade-in zoom-in duration-300">
      <div className="bg-bg-primary border border-border/80 w-full max-w-lg rounded-[2rem] shadow-2xl shadow-accent-purple/20 overflow-hidden">
        <div className="relative px-8 pt-8 pb-4">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-text-tertiary hover:text-text-primary transition-colors hover:bg-bg-secondary rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent-purple" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter font-[family-name:var(--font-mono)]">
              {isKO ? '쾌속 시작' : 'QUICK START'}
            </h2>
          </div>

          <p className="text-text-tertiary text-sm leading-relaxed">
            {isKO
              ? '장르와 아이디어 한 줄만 넣으면 제목, 핵심 인물, 첫 장면 초안을 바로 세팅합니다.'
              : 'Pick a genre and enter one line. We will set up the title, core cast, and first scene draft for you.'}
          </p>

          <div className="mt-4 rounded-2xl border border-white/6 bg-bg-secondary/70 px-4 py-3">
            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-accent-purple uppercase">
              {isKO ? '이 흐름으로 바로 시작' : 'WHAT HAPPENS NEXT'}
            </p>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              {isKO
                ? '세계관 씨앗 생성 → 캐릭터 초안 구성 → 첫 장면으로 즉시 이동'
                : 'World seed → cast draft → first scene in the Writing tab'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">
              {isKO ? '장르 선택' : 'SELECT GENRE'}
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Genre).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                    selectedGenre === genre
                      ? 'bg-accent-purple border-accent-purple text-white shadow-lg shadow-accent-purple/20'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-text-tertiary'
                  }`}
                >
                  {GENRE_LABELS[language][genre]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">
              {isKO ? '어떤 이야기로 시작할까요?' : 'WHAT STORY DO YOU WANT TO START WITH?'}
            </label>
            <div className="relative">
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isKO ? '예: 비 오는 밤, 은퇴한 형사가 오래된 안드로이드를 다시 만난다.' : 'e.g., On a rainy night, a retired detective meets an old android again.'}
                className="w-full h-32 bg-bg-secondary border border-border rounded-2xl p-4 text-sm resize-none focus:border-accent-purple outline-none transition-all placeholder:text-text-tertiary/50 leading-relaxed"
                disabled={isGenerating}
              />
              <div className="absolute bottom-3 right-3 opacity-20">
                <BookOpen className="w-5 h-5 text-text-tertiary" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
              !prompt.trim() || isGenerating
                ? 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-purple text-white hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-accent-purple/20'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isKO ? '첫 장면을 준비하는 중...' : 'PREPARING YOUR FIRST SCENE...'}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {isKO ? '첫 장면 받기' : 'GET THE FIRST SCENE'}
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-text-tertiary/60 font-[family-name:var(--font-mono)] uppercase tracking-tight">
            Title + World Hook + Character Seed + First Scene
          </p>
        </form>
      </div>
    </div>
  );
}
