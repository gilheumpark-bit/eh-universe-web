"use client";

// ============================================================
// PART 1 — Types, constants, and planet loader
// ============================================================

import React, { useState, useEffect } from 'react';
import { Share2, X, Globe, Lock, Users as UsersIcon, Check, AlertCircle, ChevronDown } from 'lucide-react';
import type { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { listPlanetsByOwner, createBoardPost } from '@/lib/network-firestore';
import type { PlanetRecord, BoardType } from '@/lib/network-types';

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
  /** Set after successful network publish */
  publishedPostId?: string;
}

type ShareType = SharePayload['type'];
type Visibility = SharePayload['visibility'];
type PublishStatus = 'idle' | 'loading' | 'success' | 'error';

const SHARE_TYPES: { value: ShareType; ko: string; en: string; boardType: BoardType }[] = [
  { value: 'episode', ko: '에피소드', en: 'Episode', boardType: 'log' },
  { value: 'character_sheet', ko: '캐릭터 시트', en: 'Character Sheet', boardType: 'log' },
  { value: 'world_bible', ko: '세계관 설정', en: 'World Bible', boardType: 'registry' },
  { value: 'style_profile', ko: '문체 프로필', en: 'Style Profile', boardType: 'feedback' },
];

const VISIBILITIES: { value: Visibility; ko: string; en: string; icon: React.ElementType }[] = [
  { value: 'public', ko: '전체 공개', en: 'Public', icon: Globe },
  { value: 'members', ko: '멤버 공개', en: 'Members', icon: UsersIcon },
  { value: 'private', ko: '비공개', en: 'Private', icon: Lock },
];

// IDENTITY_SEAL: PART-1 | role=type definitions and constants | inputs=none | outputs=share type enums and planet loader

// ============================================================
// PART 2 — Main component
// ============================================================

export default function ShareToNetwork({ language, config, messages, onClose, onShare }: Props) {
  const isKO = language === 'KO';
  const { user } = useAuth();
  const [shareType, setShareType] = useState<ShareType>('episode');
  const [visibility, setVisibility] = useState<Visibility>('members');
  const [title, setTitle] = useState(config.title || '');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  // Planet selection for network publish
  const [planets, setPlanets] = useState<PlanetRecord[]>([]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('');
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [showPlanetDropdown, setShowPlanetDropdown] = useState(false);

  // Load user's planets
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setPlanetsLoading(true);
      try {
        const owned = await listPlanetsByOwner(user.uid);
        if (!cancelled) {
          setPlanets(owned);
          if (owned.length > 0) setSelectedPlanetId(owned[0].id);
        }
      } catch {
        // Non-critical — user can still share without planet
      } finally {
        if (!cancelled) setPlanetsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [user]);

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

  const handlePublishToNetwork = async () => {
    if (!user) return;

    setPublishStatus('loading');
    setPublishError(null);

    const content = buildContent();
    const matchedType = SHARE_TYPES.find(st => st.value === shareType);
    const boardType: BoardType = matchedType?.boardType ?? 'log';

    try {
      const postRecord = await createBoardPost({
        authorId: user.uid,
        boardType,
        title: title.trim(),
        content,
        tags: shareType === 'world_bible' ? ['world-bible', 'studio-export'] : ['studio-export'],
        planetId: selectedPlanetId || undefined,
        visibility,
      });

      setPublishStatus('success');
      onShare?.({ type: shareType, title, content, visibility, publishedPostId: postRecord.id });

      // Auto-close after 2s on success
      setTimeout(() => onClose(), 2000);
    } catch (caught) {
      setPublishStatus('error');
      setPublishError(
        caught instanceof Error
          ? caught.message
          : isKO ? '게시에 실패했습니다.' : 'Failed to publish.',
      );
    }
  };

  const handleLocalShare = () => {
    const content = buildContent();
    onShare?.({ type: shareType, title, content, visibility });
    onClose();
  };

  const selectedPlanet = planets.find(p => p.id === selectedPlanetId);

  // IDENTITY_SEAL: PART-2 | role=main share modal component | inputs=studio config, messages, auth | outputs=share/publish UI

  // ============================================================
  // PART 3 — Render
  // ============================================================

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

        {/* Planet selection (only if user has planets) */}
        {user && planets.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
              {isKO ? '게시할 행성' : 'Target Planet'}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlanetDropdown(prev => !prev)}
                className="w-full flex items-center justify-between ds-input text-sm text-left"
              >
                <span className={selectedPlanet ? 'text-text-primary' : 'text-text-tertiary'}>
                  {planetsLoading
                    ? (isKO ? '불러오는 중...' : 'Loading...')
                    : selectedPlanet?.name ?? (isKO ? '행성 선택 (선택사항)' : 'Select planet (optional)')
                  }
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              {showPlanetDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-bg-primary border border-border rounded-xl shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setSelectedPlanetId(''); setShowPlanetDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-text-tertiary hover:bg-white/5 transition"
                  >
                    {isKO ? '행성 없이 게시' : 'Post without planet'}
                  </button>
                  {planets.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPlanetId(p.id); setShowPlanetDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition ${
                        selectedPlanetId === p.id ? 'text-accent-amber font-semibold' : 'text-text-secondary'
                      }`}
                    >
                      {p.name} <span className="text-text-tertiary">· {p.genre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Publish status feedback */}
        {publishStatus === 'success' && (
          <div className="flex items-center gap-2 text-[11px] text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-2.5">
            <Check className="w-4 h-4" />
            {isKO ? '네트워크에 게시되었습니다!' : 'Published to Network!'}
          </div>
        )}
        {publishStatus === 'error' && publishError && (
          <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4" />
            {publishError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[10px] font-bold border border-border text-text-tertiary hover:text-white transition-all">
            {isKO ? '취소' : 'Cancel'}
          </button>
          {!user ? (
            <button
              onClick={handleLocalShare}
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-bold bg-accent-purple text-white disabled:opacity-40 transition-all active:scale-95"
            >
              {isKO ? '로컬 공유' : 'Share Locally'}
            </button>
          ) : (
            <button
              onClick={handlePublishToNetwork}
              disabled={!title.trim() || publishStatus === 'loading' || publishStatus === 'success'}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-bold bg-accent-purple text-white disabled:opacity-40 transition-all active:scale-95"
            >
              {publishStatus === 'loading'
                ? (isKO ? '게시 중...' : 'Publishing...')
                : publishStatus === 'success'
                  ? (isKO ? '완료!' : 'Done!')
                  : (isKO ? '네트워크에 게시' : 'Publish to Network')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=share modal renderer | inputs=state, publish handlers | outputs=share modal UI with planet selection and publish feedback
