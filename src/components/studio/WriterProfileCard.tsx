"use client";

// ============================================================
// WriterProfileCard — Writer profile summary for SettingsView
// ============================================================

import React from 'react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { loadProfile, buildVoiceFingerprint } from '@/engine/writer-profile';
import { User, BarChart3, RefreshCw, CheckCircle } from 'lucide-react';

interface WriterProfileCardProps {
  language: AppLanguage;
}

const LEVEL_BADGE: Record<string, { label: { ko: string; en: string; ja?: string; zh?: string }; color: string }> = {
  beginner: {
    label: { ko: '입문', en: 'Beginner', ja: '初心者', zh: '入门' },
    color: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  },
  intermediate: {
    label: { ko: '중급', en: 'Intermediate', ja: '中級', zh: '中级' },
    color: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  },
  advanced: {
    label: { ko: '숙련', en: 'Advanced', ja: '上級', zh: '高级' },
    color: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30',
  },
};

const WriterProfileCard: React.FC<WriterProfileCardProps> = ({ language }) => {
  const profile = typeof window !== 'undefined' ? loadProfile('default') : null;
  if (!profile || profile.episodeCount === 0) {
    return (
      <div className="p-4 bg-bg-secondary/30 rounded-xl border border-border text-center">
        <User className="w-6 h-6 mx-auto mb-2 text-text-tertiary opacity-50" />
        <p className="text-xs text-text-tertiary">
          {L4(language, { ko: '에피소드를 작성하면 프로필이 생성됩니다.', en: 'Write episodes to build your profile.', ja: 'エピソードを書くとプロフィールが作成されます。', zh: '撰写章节后将生成个人资料。' })}
        </p>
      </div>
    );
  }

  const isKO = language === 'KO';
  const voice = buildVoiceFingerprint(profile, isKO);
  const levelInfo = LEVEL_BADGE[profile.skillLevel] ?? LEVEL_BADGE.beginner;
  const topIssues = Object.entries(profile.commonIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind]) => kind);

  return (
    <div className="space-y-3">
      {/* Level + Episode count */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${levelInfo.color}`}>
          {L4(language, levelInfo.label)}
        </span>
        <span className="text-xs text-text-tertiary font-mono">
          {profile.episodeCount} {L4(language, { ko: '에피소드', en: 'episodes', ja: 'エピソード', zh: '章节' })}
        </span>
        <span className="text-[10px] text-text-quaternary font-mono" title={L4(language, { ko: '에피소드가 쌓일수록 높아집니다', en: 'Improves as you write more episodes', ja: 'エピソード가 쌓일수록 높아집니다', zh: '章节가 쌓일수록 높아집니다' })}>
          ({L4(language, { ko: '분석 정확도', en: 'analysis accuracy', ja: '分析精度', zh: '分析准确度' })} {Math.round(profile.levelConfidence * 100)}%)
        </span>
      </div>

      {/* Voice fingerprint */}
      {voice && (
        <div className="p-3 bg-bg-secondary/50 rounded-lg border border-border">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
            {L4(language, { ko: '문체 특징', en: 'Writing Style', ja: '文体特徴', zh: '文风特征' })}
          </div>
          <p className="text-xs text-text-primary font-serif">{voice}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 bg-bg-secondary/30 rounded-lg">
          <RefreshCw className="w-3.5 h-3.5 text-accent-amber shrink-0" />
          <div>
            <div className="text-[10px] text-text-tertiary">{L4(language, { ko: '재생성률', en: 'Regen Rate', ja: '再生成率', zh: '重新生成率' })}</div>
            <div className="text-xs font-bold text-text-primary">{Math.round(profile.regenerateRate * 100)}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-bg-secondary/30 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5 text-accent-green shrink-0" />
          <div>
            <div className="text-[10px] text-text-tertiary">{L4(language, { ko: '자동완성 수락률', en: 'Accept Rate', ja: '受入率', zh: '接受率' })}</div>
            <div className="text-xs font-bold text-text-primary">{Math.round(profile.completionAcceptRate * 100)}%</div>
          </div>
        </div>
      </div>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <div className="p-3 bg-bg-secondary/30 rounded-lg border border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-accent-red shrink-0" />
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
              {L4(language, { ko: '빈발 이슈 Top 3', en: 'Top 3 Issues', ja: '頻出イシュー Top 3', zh: '常见问题 Top 3' })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topIssues.map((issue) => (
              <span key={issue} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent-red/10 text-accent-red border border-accent-red/20">
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WriterProfileCard;
