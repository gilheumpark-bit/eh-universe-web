"use client";

import { useState, type FormEvent } from "react";
import { X, Sparkles, Wand2, Loader2, BookOpen } from "lucide-react";
import { Genre, type AppLanguage } from "@/lib/studio-types";
import { GENRE_LABELS } from "@/lib/studio-constants";

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
  const isKO = language === "KO";
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
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/80 bg-bg-primary shadow-2xl shadow-accent-purple/20">
        <div className="relative px-8 pb-4 pt-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label={isKO ? "쾌속 시작 닫기" : "Close quick start"}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10">
              <Sparkles className="h-6 w-6 text-accent-purple" />
            </div>
            <h2 className="font-[family-name:var(--font-mono)] text-2xl font-black italic tracking-tighter">
              {isKO ? "쾌속 시작" : "QUICK START"}
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-text-tertiary">
            {isKO
              ? "장르와 한 줄 아이디어만 적으면 제목, 핵심 인물, 첫 장면 초안까지 바로 이어집니다."
              : "Pick a genre and enter one line. We will set up the title, key cast, and first scene draft for you."}
          </p>

          <div className="mt-4 rounded-2xl border border-white/6 bg-bg-secondary/70 px-4 py-3">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-accent-purple">
              {isKO ? "바로 이어지는 흐름" : "WHAT HAPPENS NEXT"}
            </p>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              {isKO
                ? "세계관 씨앗 생성 → 캐릭터 초안 구성 → 글쓰기 탭에서 첫 장면 받기"
                : "World seed → cast draft → first scene in the Writing tab"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {isKO ? "장르 선택" : "SELECT GENRE"}
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
              {isKO ? "어떤 이야기로 시작할까요?" : "WHAT STORY DO YOU WANT TO START WITH?"}
            </label>
            <div className="relative">
              <textarea
                autoFocus
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  isKO
                    ? "예: 비 오는 밤, 은퇴한 형사가 오래전 사라진 안드로이드를 다시 만난다."
                    : "e.g., On a rainy night, a retired detective meets an android who vanished years ago."
                }
                className="h-32 w-full resize-none rounded-2xl border border-border bg-bg-secondary p-4 text-sm leading-relaxed outline-none transition-all placeholder:text-text-tertiary/50 focus:border-accent-purple"
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
                {isKO ? "첫 장면을 준비하는 중..." : "PREPARING YOUR FIRST SCENE..."}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                {isKO ? "첫 장면 받기" : "GET THE FIRST SCENE"}
              </>
            )}
          </button>

          <p className="text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tight text-text-tertiary/60">
            Title + World Hook + Character Seed + First Scene
          </p>
        </form>
      </div>
    </div>
  );
}
