"use client";

// ============================================================
// FirstVisitOnboarding — 로어가드 스튜디오 첫 진입 온보딩 오버레이
// ============================================================
// localStorage 'loreguard_studio_onboarded' 값이 없으면 1회 표시.
// 프라이머리: "첫 장면 써보기" → QuickStart 모달 오픈 이벤트 디스패치
// 세컨더리: "둘러볼게요" → 단순 닫기
// 두 경로 모두 localStorage에 기록하여 재노출 방지.
// 모바일에서는 비노출 (MobileStudioView가 별도 처리).
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useIsMobile } from '@/hooks/useIsMobile';

// ============================================================
// PART 1 — 상수
// ============================================================

const ONBOARDED_KEY = 'loreguard_studio_onboarded';

// ============================================================
// PART 2 — 컴포넌트
// ============================================================

export default function FirstVisitOnboarding() {
  const { lang } = useLang();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isMobile) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(ONBOARDED_KEY);
    } catch {
      /* private browsing — 그냥 표시하지 않음 */
      return;
    }
    if (!seen) setVisible(true);
  }, [mounted, isMobile]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDED_KEY, Date.now().toString());
    } catch {
      /* quota/private — 다음 진입 때 다시 보여도 무해 */
    }
  }, []);

  const handleStart = useCallback(() => {
    markSeen();
    setVisible(false);
    try {
      window.dispatchEvent(new CustomEvent('noa:open-quickstart'));
    } catch {
      /* ignore */
    }
  }, [markSeen]);

  const handleDismiss = useCallback(() => {
    markSeen();
    setVisible(false);
  }, [markSeen]);

  if (!mounted || isMobile || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fvo-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-bg-elevated border border-border shadow-2xl p-6 md:p-8 space-y-5 animate-in zoom-in-95 duration-300"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={L4(lang, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary hover:text-text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent-purple/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-accent-purple" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="fvo-title"
              className="text-lg md:text-xl font-black text-text-primary leading-tight"
            >
              {L4(lang, {
                ko: '로어가드 스튜디오에 오신 것을 환영합니다',
                en: 'Welcome to Loreguard Studio',
                ja: 'ロアガードスタジオへようこそ',
                zh: '欢迎来到洛尔加德工作室',
              })}
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {L4(lang, {
                ko: '처음이시네요. 30초만 소개해 드릴게요.',
                en: 'First time here? A 30-second tour.',
                ja: '初めてですね。30秒だけご案内します。',
                zh: '第一次来? 30秒简单介绍。',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-sm text-text-secondary">
            {L4(lang, {
              ko: '여기서 할 수 있는 일:',
              en: 'What you can do here:',
              ja: 'ここでできること:',
              zh: '您可以做的事情:',
            })}
          </p>
          <ul className="space-y-2.5 text-sm text-text-primary">
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent-purple/15 text-accent-purple font-bold text-[11px] flex items-center justify-center">1</span>
              <span>
                <strong className="font-semibold">
                  {L4(lang, { ko: '첫 장면 쓰기', en: 'Write your first scene', ja: '最初のシーンを書く', zh: '撰写第一场景' })}
                </strong>
                {' — '}
                <span className="text-text-secondary">
                  {L4(lang, {
                    ko: '장르만 고르면 NOA가 제안합니다',
                    en: 'Pick a genre and NOA suggests the rest',
                    ja: 'ジャンルを選ぶだけでNOAが提案します',
                    zh: '只需选择类型,NOA 会为您提供建议',
                  })}
                </span>
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent-purple/15 text-accent-purple font-bold text-[11px] flex items-center justify-center">2</span>
              <span>
                <strong className="font-semibold">
                  {L4(lang, { ko: '캐릭터 만들기', en: 'Create characters', ja: 'キャラクターを作る', zh: '创建角色' })}
                </strong>
                {' — '}
                <span className="text-text-secondary">
                  {L4(lang, {
                    ko: 'NOA가 프로필을 자동 생성합니다',
                    en: 'NOA auto-generates full profiles',
                    ja: 'NOAがプロフィールを自動生成します',
                    zh: 'NOA 自动生成完整档案',
                  })}
                </span>
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent-purple/15 text-accent-purple font-bold text-[11px] flex items-center justify-center">3</span>
              <span>
                <strong className="font-semibold">
                  {L4(lang, { ko: '세계관 설계', en: 'Design your world', ja: '世界観を設計', zh: '设计世界观' })}
                </strong>
                {' — '}
                <span className="text-text-secondary">
                  {L4(lang, {
                    ko: '3단계로 체계화합니다',
                    en: 'Structured into 3 clear stages',
                    ja: '3段階で体系化します',
                    zh: '分为清晰的 3 个阶段',
                  })}
                </span>
              </span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 bg-accent-purple text-white text-sm font-bold rounded-xl hover:bg-accent-purple/90 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {L4(lang, {
              ko: '첫 장면 써보기',
              en: 'Write first scene',
              ja: '最初のシーンを書く',
              zh: '撰写第一场景',
            })}
            {' →'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[44px] px-4 py-3 bg-bg-secondary text-text-secondary text-sm font-medium rounded-xl border border-border hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
          >
            {L4(lang, {
              ko: '둘러볼게요',
              en: "I'll look around",
              ja: '見て回ります',
              zh: '我先看看',
            })}
          </button>
        </div>
      </div>
    </div>
  );
}

export { FirstVisitOnboarding };

// IDENTITY_SEAL: FirstVisitOnboarding | role=first-visit-overlay | inputs=localStorage(loreguard_studio_onboarded) | outputs=UI(modal) + event(noa:open-quickstart)
