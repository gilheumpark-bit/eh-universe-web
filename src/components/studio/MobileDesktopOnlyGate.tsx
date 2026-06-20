// ============================================================
// MobileDesktopOnlyGate — PC 전용 기능 모바일 안내 게이트
// ============================================================
// 집필·번역·출고처럼 넓은 화면이 필요한 작업에 진입하면
// 모바일 사용자에게 "데스크톱에서 이용 가능" 안내를 표시.
// "그래도 계속" 옵션으로 우회 가능 (강제 데스크톱 모드).
// ============================================================

"use client";

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, ArrowLeft, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';

interface Props {
  /** 이 기능의 이름 (예: "번역·현지화") */
  featureNameKo: string;
  featureNameEn: string;
  featureNameJa: string;
  featureNameZh: string;
  /** 왜 모바일에서 사용하기 어려운지 설명 */
  reasonKo?: string;
  reasonEn?: string;
  reasonJa?: string;
  reasonZh?: string;
  /** "그래도 계속" 버튼 콜백 (없으면 noa_force_desktop=1 설정 후 reload) */
  onForceContinue?: () => void;
}

export default function MobileDesktopOnlyGate({
  featureNameKo, featureNameEn, featureNameJa, featureNameZh,
  reasonKo, reasonEn, reasonJa, reasonZh,
  onForceContinue,
}: Props) {
  const { lang } = useLang();
  const router = useRouter();
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  // SSR 안전: 마운트 후에만 window 참조
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measure = () => setViewportWidth(window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleForce = () => {
    if (onForceContinue) {
      onForceContinue();
      return;
    }
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('noa_force_desktop', '1'); } catch { /* quota */ }
      window.location.reload();
    }
  };

  const handleShare = async () => {
    if (typeof navigator === 'undefined') return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: L4(lang, { ko: featureNameKo, en: featureNameEn, ja: featureNameJa, zh: featureNameZh }),
          text: L4(lang, {
            ko: '데스크톱에서 이 기능을 이용해보세요',
            en: 'Use this feature on desktop',
            ja: 'デスクトップでこの機能を使ってみてください',
            zh: '请在桌面端使用此功能',
          }),
          url,
        });
      } catch { /* cancelled */ }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch { /* denied */ }
    }
  };

  return (
    <main
      aria-label={L4(lang, {
        ko: `${featureNameKo} 모바일 안내`,
        en: `${featureNameEn} mobile notice`,
        ja: `${featureNameJa} モバイル案内`,
        zh: `${featureNameZh} 移动端提示`,
      })}
      className="flex flex-col min-h-[100dvh] bg-bg-primary text-text-primary p-6"
    >
      <div className="shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-text-tertiary hover:text-text-secondary text-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          {L4(lang, { ko: '홈으로', en: 'Home', ja: 'ホーム', zh: '首页' })}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-8">
        <div className="relative">
          <Monitor className="w-24 h-24 text-accent-purple" strokeWidth={1.2} />
          <Smartphone className="w-10 h-10 text-text-tertiary absolute -bottom-2 -right-2 bg-bg-primary rounded-lg p-1.5" strokeWidth={1.5} />
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-black">
            {L4(lang, {
              ko: `${featureNameKo}은 데스크톱 전용입니다`,
              en: `${featureNameEn} is desktop-only`,
              ja: `${featureNameJa}はデスクトップ専用です`,
              zh: `${featureNameZh} 仅支持桌面端`,
            })}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {L4(lang, {
              ko: reasonKo || '이 기능은 복잡한 편집 환경과 큰 화면이 필요합니다. 모바일에서는 터치 UX 제약과 입력 속도 문제로 품질이 떨어집니다.',
              en: reasonEn || 'This feature requires a complex editing environment and large screen. Mobile has touch UX and input speed limitations.',
              ja: reasonJa || 'この機能は複雑な編集環境と大画面が必要です。モバイルはタッチUXと入力速度の制約があります。',
              zh: reasonZh || '此功能需要复杂的编辑环境和大屏幕。移动端受触控 UX 和输入速度限制。',
            })}
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed mt-2">
            {viewportWidth !== null
              ? L4(lang, {
                  ko: `${featureNameKo}은 최소 1024px 이상의 큰 화면에서 온전히 사용할 수 있어요. 모바일에서는 링크 공유, 검토 대기, 스케치 스튜디오 이동을 권장합니다. (현재 ${viewportWidth}px)`,
                  en: `${featureNameEn} works best on screens at least 1024px wide. On mobile, share the link, hold review, or move to the sketch studio. (current ${viewportWidth}px)`,
                  ja: `${featureNameJa}は最小1024px以上の画面で完全に利用できます。モバイルではリンク共有、確認待ち、スケッチスタジオ移動をおすすめします。(現在 ${viewportWidth}px)`,
                  zh: `${featureNameZh} 在至少 1024px 的屏幕上体验完整。移动端建议分享链接、暂缓审核或前往速写工作室。(当前 ${viewportWidth}px)`,
                })
              : L4(lang, {
                  ko: `${featureNameKo}은 최소 1024px 이상의 큰 화면에서 온전히 사용할 수 있어요. 모바일에서는 링크 공유, 검토 대기, 스케치 스튜디오 이동을 권장합니다.`,
                  en: `${featureNameEn} works best on screens at least 1024px wide. On mobile, share the link, hold review, or move to the sketch studio.`,
                  ja: `${featureNameJa}は最小1024px以上の画面で完全に利用できます。モバイルではリンク共有、確認待ち、スケッチスタジオ移動をおすすめします。`,
                  zh: `${featureNameZh} 在至少 1024px 的屏幕上体验完整。移动端建议分享链接、暂缓审核或前往速写工作室。`,
                })}
          </p>
        </div>

        <div className="grid w-full max-w-sm gap-2 rounded-xl border border-border bg-bg-secondary/30 p-3 text-left">
          {[
            L4(lang, { ko: "모바일: 링크 공유와 검토 대기", en: "Mobile: share link and hold review", ja: "モバイル: リンク共有と確認待ち", zh: "移动端：分享链接并暂缓审核" }),
            L4(lang, { ko: "태블릿 가로: 제한적 확인 가능", en: "Tablet landscape: limited review", ja: "タブレット横向き: 限定確認", zh: "平板横屏：有限审核" }),
            L4(lang, { ko: "데스크톱: 원문/번역/채점 전체 편집", en: "Desktop: full source, target, and scoring edit", ja: "デスクトップ: 原文・訳文・評価の全体編集", zh: "桌面端：完整原文、译文与评分编辑" }),
          ].map((item) => (
            <div key={item} className="flex min-h-8 items-center gap-2 text-xs text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent-purple font-bold text-sm rounded-xl active:scale-98 transition-transform min-h-[44px]"
            style={{ color: '#fff' }}
          >
            <ExternalLink className="w-4 h-4" />
            {L4(lang, {
              ko: '데스크톱 링크 공유/복사',
              en: 'Share/Copy Desktop Link',
              ja: 'デスクトップリンク共有/コピー',
              zh: '分享/复制桌面端链接',
            })}
          </button>

          <button
            onClick={() => router.push('/studio')}
            className="w-full py-3 bg-bg-secondary text-text-primary font-bold text-sm rounded-xl border border-border active:scale-98 transition-transform min-h-[44px]"
          >
            {L4(lang, {
              ko: '모바일 스케치 스튜디오로 이동',
              en: 'Go to Mobile Sketch Studio',
              ja: 'モバイルスケッチスタジオへ',
              zh: '前往移动端速写工作室',
            })}
          </button>

          <button
            onClick={handleForce}
            className="w-full py-2 text-xs text-text-tertiary hover:text-text-secondary underline min-h-[44px]"
          >
            {L4(lang, {
              ko: '그래도 모바일에서 계속 (UX 제한 감수)',
              en: 'Continue on mobile anyway (UX limitations)',
              ja: 'それでもモバイルで続ける (UX制限)',
              zh: '仍在移动端继续 (UX 受限)',
            })}
          </button>
        </div>
      </div>

      <div className="shrink-0 text-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <p className="text-[10px] text-text-quaternary">
          {L4(lang, {
            ko: '로어가드 · 데스크톱 최적화',
            en: 'Loreguard · Desktop Optimized',
            ja: 'ローアガード · デスクトップ最適化',
            zh: '洛尔加德 · 桌面端优化',
          })}
        </p>
      </div>
    </main>
  );
}

export { MobileDesktopOnlyGate };

// IDENTITY_SEAL: MobileDesktopOnlyGate | role=pc-only-mobile-gate | inputs=featureName,reason | outputs=UI(gate+CTAs)
