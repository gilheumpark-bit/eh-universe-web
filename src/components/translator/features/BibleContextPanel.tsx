import React from 'react';
import { useTranslator } from '../TranslatorContext';
import { useLang } from '@/lib/LangContext';
import { BookMarked, UserCircle2, ScrollText } from 'lucide-react';

export function BibleContextPanel() {
  const { lang } = useLang();
  const { worldContext, setWorldContext, characterProfiles, setCharacterProfiles, storySummary, setStorySummary } = useTranslator();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 1. World Context */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <BookMarked className="w-4 h-4 text-accent-green" />
          <h3 className="text-[13px] font-semibold text-text-primary tracking-wide">
            {lang === 'ko' ? '세계관 컨텍스트' : 'World Context'}
          </h3>
        </div>
        <textarea
          value={worldContext}
          onChange={(e) => setWorldContext(e.target.value)}
          placeholder={lang === 'ko' ? "고유명사, 지명, 시대적 배경 등을 입력하세요..." : "Enter world settings, locations, era..."}
          className="w-full h-32 bg-[#111113] border border-white/10 hover:border-white/20 focus:border-accent-green rounded-lg p-3 text-[13px] text-text-secondary outline-none resize-y transition-colors placeholder:text-white/10"
          spellCheck={false}
        />
      </div>

      {/* 2. Character Profiles */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <UserCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-[13px] font-semibold text-text-primary tracking-wide">
            {lang === 'ko' ? '캐릭터 프로필' : 'Character Profiles'}
          </h3>
        </div>
        <textarea
          value={characterProfiles}
          onChange={(e) => setCharacterProfiles(e.target.value)}
          placeholder={lang === 'ko' ? "인물 이름, 말투, 성격, 관계도 등을 입력하세요..." : "Enter character names, tones, personalities..."}
          className="w-full h-40 bg-[#111113] border border-white/10 hover:border-white/20 focus:border-[#D4AF37] rounded-lg p-3 text-[13px] text-text-secondary outline-none resize-y transition-colors placeholder:text-white/10"
          spellCheck={false}
        />
      </div>

      {/* 3. Story Bible (Auto-Gen) */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-accent-indigo" />
            <h3 className="text-[13px] font-semibold text-text-primary tracking-wide">
              {lang === 'ko' ? '스토리 바이블' : 'Story Bible'}
            </h3>
          </div>
          <span className="text-[10px] bg-accent-indigo/10 text-accent-indigo px-1.5 py-0.5 rounded border border-accent-indigo/20 uppercase tracking-wider">
            Auto
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary mb-3 leading-relaxed">
          {lang === 'ko' ? '번역 진행 시 AI가 이전 줄거리를 요약하여 자동으로 누적 갱신합니다.' : 'AI automatically summarizes and accumulates previous plot points during translation.'}
        </p>
        <textarea
          value={storySummary}
          onChange={(e) => setStorySummary(e.target.value)}
          placeholder={lang === 'ko' ? "줄거리가 비어 있습니다." : "Story summary is empty."}
          className="w-full h-48 bg-[#111113] border border-accent-indigo/20 focus:border-accent-indigo rounded-lg p-3 text-[13px] text-text-secondary outline-none resize-y shadow-[0_0_15px_rgba(99,102,241,0.05)] transition-colors placeholder:text-white/10"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
