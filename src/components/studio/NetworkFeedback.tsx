"use client";

// ============================================================
// Network Feedback Panel — shows comments on shared content
// ============================================================

import React, { useState } from 'react';
import { MessageCircle, RefreshCw, ExternalLink } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface FeedbackItem {
  id: string;
  postTitle: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Props {
  language: AppLanguage;
  /** Feedback items fetched from network */
  items?: FeedbackItem[];
  /** Callback to refresh feedback */
  onRefresh?: () => void;
  loading?: boolean;
}

export default function NetworkFeedback({ language, items = [], onRefresh, loading }: Props) {
  const isKO = language === 'KO';
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-widest hover:text-white transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {L4(language, { ko: '커뮤니티 피드백', en: 'Community Feedback', jp: 'フィードバック', cn: '社区反馈' })}
          <span className="text-accent-purple">({items.length})</span>
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-text-tertiary hover:text-white transition-colors disabled:animate-spin"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {items.length === 0 && !loading && (
            <p className="text-[10px] text-text-tertiary italic py-4 text-center">
              {isKO ? '아직 피드백이 없습니다. 작품을 공유해보세요.' : 'No feedback yet. Share your work to get feedback.'}
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <RefreshCw className="w-4 h-4 text-text-tertiary animate-spin" />
            </div>
          )}

          {items.map(item => (
            <div key={item.id} className="bg-bg-secondary/30 border border-border/30 rounded-xl px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white">{item.authorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-text-tertiary">{new Date(item.createdAt).toLocaleDateString()}</span>
                  <a
                    href={`/network/posts/${item.postId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-tertiary hover:text-accent-purple"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <p className="text-[9px] text-accent-purple/60 truncate">{isKO ? '게시물' : 'On'}: {item.postTitle}</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
