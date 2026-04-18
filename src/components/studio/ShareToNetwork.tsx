"use client";

// ============================================================
// PART 1 — Types, constants, and planet loader
// ============================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Share2, X, Globe, Lock, Users as UsersIcon, Check, AlertCircle, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import type { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { listPlanetsByOwner, createBoardPost } from '@/lib/network-firestore';
import type { PlanetRecord, BoardType } from '@/lib/network-types';
import { useNetworkAgent } from '@/lib/hooks/useNetworkAgent';
import { logger } from '@/lib/logger';
import {
  buildShareCharacterSheet,
  buildShareEpisodeContent,
  buildShareStyleProfile,
  buildShareWorldBible,
} from '@/lib/studio-share-serialize';

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
  { value: 'episode', ko: 'EP', en: 'EP', boardType: 'log' },
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
  const { ingestAgent } = useNetworkAgent();
  const publishInFlight = useRef(false);
  const [shareType, setShareType] = useState<ShareType>('episode');
  const [visibility, setVisibility] = useState<Visibility>('members');
  const [title, setTitle] = useState(config.title || '');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [ingestWarning, setIngestWarning] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const buildContent = useCallback((): string => {
    switch (shareType) {
      case 'episode':
        return buildShareEpisodeContent(messages, config, language);
      case 'character_sheet':
        return buildShareCharacterSheet(config, language);
      case 'world_bible':
        return buildShareWorldBible(config, language);
      case 'style_profile':
        return buildShareStyleProfile(config, language);
      default:
        return '';
    }
  }, [shareType, messages, config, language]);

  const handlePublishToNetwork = async () => {
    if (!user) return;
    if (publishInFlight.current || publishStatus === 'loading') return;

    setPublishStatus('loading');
    setPublishError(null);
    setIngestWarning(null);
    publishInFlight.current = true;

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
      setPublishedPostId(postRecord.id);
      onShare?.({ type: shareType, title, content, visibility, publishedPostId: postRecord.id });

      const idToken = await user.getIdToken();
      void ingestAgent(
        {
          documentId: postRecord.id,
          title: title.trim(),
          content,
          planetId: selectedPlanetId || undefined,
          isPublic: visibility === 'public',
        },
        idToken,
      ).then((ok) => {
        if (!ok) {
          logger.warn('ShareToNetwork', 'network-agent ingest failed after publish; post kept');
          setIngestWarning(
            isKO
              ? '게시는 완료되었으나 NOA 검색 인덱싱에 실패했습니다. 네트워크 설정을 확인하세요.'
              : 'Published, but NOA search indexing failed. Check Network Agent configuration.',
          );
        }
      });

      // Don't auto-close — let user see the link and copy it
    } catch (caught) {
      setPublishStatus('error');
      setPublishError(
        caught instanceof Error
          ? caught.message
          : isKO ? '게시에 실패했습니다.' : 'Failed to publish.',
      );
    } finally {
      publishInFlight.current = false;
    }
  };

  const handleLocalShare = () => {
    const content = buildContent();
    onShare?.({ type: shareType, title, content, visibility });
    onClose();
  };

  const selectedPlanet = planets.find(p => p.id === selectedPlanetId);

  // Content preview for pre-publish review
  const contentPreview = useMemo(() => {
    const full = buildContent();
    return full.length > 300 ? full.slice(0, 300) + '...' : full;
  }, [buildContent]);

  const publishedUrl = publishedPostId ? `/network/posts/${publishedPostId}` : null;

  const handleCopyLink = async () => {
    if (!publishedUrl) return;
    const fullUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${publishedUrl}`
      : publishedUrl;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback: select-copy not available in all contexts
    }
  };

  // IDENTITY_SEAL: PART-2 | role=main share modal component | inputs=studio config, messages, auth | outputs=share/publish UI

  // ============================================================
  // PART 3 — Render
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-primary border border-border rounded-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-accent-purple" />
            <h2 className="text-sm font-black uppercase tracking-wider">
              {L4(language, { ko: '네트워크에 공유', en: 'Share to Network', ja: 'ネットワークに共有', zh: '分享到网络' })}
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
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-[transform,opacity,background-color,border-color,color] ${
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
                      {selectedPlanetId === p.id && <span className="sr-only">{isKO ? '활성' : 'Active'}</span>}
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold border transition-[transform,opacity,background-color,border-color,color] ${
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

        {/* Content preview (before publish) */}
        {publishStatus !== 'success' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
              {isKO ? '미리보기' : 'Preview'}
            </label>
            <div className="bg-bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-bold text-text-secondary">{title || (isKO ? '(제목 없음)' : '(No title)')}</p>
              <p className="text-[10px] text-text-tertiary leading-relaxed whitespace-pre-wrap">{contentPreview || (isKO ? '(내용 없음)' : '(No content)')}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-mono">
                  {SHARE_TYPES.find(st => st.value === shareType)?.[isKO ? 'ko' : 'en']}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-tertiary font-mono">
                  {VISIBILITIES.find(v => v.value === visibility)?.[isKO ? 'ko' : 'en']}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-[10px] text-text-tertiary bg-bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5">
          {shareType === 'episode' && (
            <>{isKO ? `EP.1~${episodes.length} (${episodes.length}개)가 공유됩니다.` : `EP.1~${episodes.length} (${episodes.length}) will be shared.`}</>
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
        {ingestWarning && (
          <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-900/25 border border-amber-800/40 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {ingestWarning}
          </div>
        )}
        {publishStatus === 'success' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-2.5">
              <Check className="w-4 h-4" />
              {isKO ? '네트워크에 게시되었습니다!' : 'Published to Network!'}
            </div>
            {publishedUrl && (
              <div className="flex items-center gap-2 bg-bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5">
                <ExternalLink className="w-3.5 h-3.5 text-accent-purple shrink-0" />
                <a href={publishedUrl} className="text-[11px] text-accent-purple hover:underline truncate flex-1">
                  {publishedUrl}
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-colors shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  {linkCopied
                    ? (isKO ? '복사됨' : 'Copied!')
                    : (isKO ? '링크 복사' : 'Copy Link')
                  }
                </button>
              </div>
            )}
            {linkCopied && (
              <p className="text-[10px] text-green-400 text-center">{isKO ? '클립보드에 복사됨' : 'Copied to clipboard'}</p>
            )}
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[10px] font-bold border border-border text-text-tertiary hover:text-white transition-colors">
            {isKO ? '취소' : 'Cancel'}
          </button>
          {!user ? (
            <button
              onClick={handleLocalShare}
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-bold bg-accent-purple text-white disabled:opacity-40 transition-[transform,opacity] active:scale-95"
            >
              {isKO ? '로컬 공유' : 'Share Locally'}
            </button>
          ) : (
            <button
              onClick={handlePublishToNetwork}
              disabled={!title.trim() || publishStatus === 'loading' || publishStatus === 'success'}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-bold bg-accent-purple text-white disabled:opacity-40 transition-[transform,opacity] active:scale-95"
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
