"use client";

// ============================================================
// Share to Network — publish studio content to community
// ============================================================

import React, { useState } from 'react';
import { Share2, X, Globe, Lock, Users as UsersIcon } from 'lucide-react';
import type { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface Props {
  language: AppLanguage;
  config: StoryConfig;
  messages: Message[];
  onClose: () => void;
  onShare?: (data: SharePayload) => void;
}

export interface SharePayload {
  type: 'episode' | 'character_sheet' | 'world_bible' | 'style_profile';
  title: string;
  content: string;
  visibility: 'public' | 'members' | 'private';
  episodeIndices?: number[];
}

type ShareType = SharePayload['type'];
type Visibility = SharePayload['visibility'];

const SHARE_TYPES: { value: ShareType; ko: string; en: string }[] = [
  { value: 'episode', ko: '에피소드', en: 'Episode' },
  { value: 'character_sheet', ko: '캐릭터 시트', en: 'Character Sheet' },
  { value: 'world_bible', ko: '세계관 설정', en: 'World Bible' },
  { value: 'style_profile', ko: '문체 프로필', en: 'Style Profile' },
];

const VISIBILITIES: { value: Visibility; ko: string; en: string; icon: React.ElementType }[] = [
  { value: 'public', ko: '전체 공개', en: 'Public', icon: Globe },
  { value: 'members', ko: '멤버 공개', en: 'Members', icon: UsersIcon },
  { value: 'private', ko: '비공개', en: 'Private', icon: Lock },
];

export default function ShareToNetwork({ language, config, messages, onClose, onShare }: Props) {
  const isKO = language === 'KO';
  const [shareType, setShareType] = useState<ShareType>('episode');
  const [visibility, setVisibility] = useState<Visibility>('members');
  const [title, setTitle] = useState(config.title || '');
  const [sending, setSending] = useState(false);

  // Count assistant messages as episodes
  const episodes = messages.filter(m => m.role === 'assistant' && m.content);

  const buildContent = (): string => {
    switch (shareType) {
      case 'episode':
        return episodes.map((m, i) => `## ${isKO ? '에피소드' : 'Episode'} ${i + 1}\n\n${m.content}`).join('\n\n---\n\n');
      case 'character_sheet':
        return config.characters.map(c =>
          `### ${c.name} (${c.role})\n${c.traits}\n${c.appearance ? `외형: ${c.appearance}` : ''}`
        ).join('\n\n');
      case 'world_bible':
        return [
          config.corePremise && `## ${isKO ? '핵심 전제' : 'Core Premise'}\n${config.corePremise}`,
          config.powerStructure && `## ${isKO ? '권력 구조' : 'Power Structure'}\n${config.powerStructure}`,
          config.currentConflict && `## ${isKO ? '현재 갈등' : 'Current Conflict'}\n${config.currentConflict}`,
        ].filter(Boolean).join('\n\n');
      case 'style_profile':
        const sp = config.styleProfile;
        if (!sp) return isKO ? '스타일 프로필이 설정되지 않았습니다.' : 'No style profile configured.';
        return Object.entries(sp.sliders).map(([k, v]) => `${k}: ${v}/5`).join('\n');
      default:
        return '';
    }
  };

  const handleShare = async () => {
    setSending(true);
    const content = buildContent();
    onShare?.({ type: shareType, title, content, visibility });
    // In real implementation, this would call network-firestore.ts
    // For now, signal the parent
    setTimeout(() => {
      setSending(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-primary border border-border rounded-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-accent-purple" />
            <h2 className="text-sm font-black uppercase tracking-wider">
              {L4(language, { ko: '네트워크에 공유', en: 'Share to Network', jp: 'ネットワークに共有', cn: '分享到网络' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-text-tertiary hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share type */}
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            {isKO ? '공유 유형' : 'Content Type'}
          </label>
          <div className="flex gap-1.5">
            {SHARE_TYPES.map(st => (
              <button key={st.value} onClick={() => setShareType(st.value)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                  shareType === st.value ? 'bg-accent-purple/20 border-accent-purple text-white' : 'border-border text-text-tertiary'
                }`}
              >
                {isKO ? st.ko : st.en}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            {isKO ? '제목' : 'Title'}
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            className="w-full ds-input text-sm"
            placeholder={isKO ? '게시물 제목...' : 'Post title...'}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            {isKO ? '공개 범위' : 'Visibility'}
          </label>
          <div className="flex gap-2">
            {VISIBILITIES.map(v => {
              const Icon = v.icon;
              return (
                <button key={v.value} onClick={() => setVisibility(v.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    visibility === v.value ? 'bg-white/10 border-white/20 text-white' : 'border-border text-text-tertiary'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {isKO ? v.ko : v.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="text-[10px] text-text-tertiary bg-bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5">
          {shareType === 'episode' && (
            <>{isKO ? `${episodes.length}개 에피소드가 공유됩니다.` : `${episodes.length} episodes will be shared.`}</>
          )}
          {shareType === 'character_sheet' && (
            <>{isKO ? `${config.characters.length}명의 캐릭터 시트가 공유됩니다.` : `${config.characters.length} character sheets will be shared.`}</>
          )}
          {shareType === 'world_bible' && (
            <>{isKO ? '세계관 설정의 읽기 전용 스냅샷이 공유됩니다.' : 'A read-only snapshot of world settings will be shared.'}</>
          )}
          {shareType === 'style_profile' && (
            <>{isKO ? '현재 문체 프로필이 공유됩니다.' : 'Current style profile will be shared.'}</>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[10px] font-bold border border-border text-text-tertiary hover:text-white transition-all">
            {isKO ? '취소' : 'Cancel'}
          </button>
          <button
            onClick={handleShare}
            disabled={!title.trim() || sending}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-bold bg-accent-purple text-white disabled:opacity-40 transition-all active:scale-95"
          >
            {sending ? (isKO ? '공유 중...' : 'Sharing...') : (isKO ? '공유하기' : 'Share')}
          </button>
        </div>
      </div>
    </div>
  );
}
