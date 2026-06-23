"use client";

import dynamic from 'next/dynamic';
import Image from 'next/image';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import type { AppLanguage, AppTab } from '@/lib/studio-types';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false, loading: DynSkeleton });

interface StudioMainOnboardingProps {
  language: AppLanguage;
  createNewSession: (tab?: AppTab) => void;
  openQuickStart: () => void;
  createDemoSession: () => void;
  showQuickStartLock: boolean;
}

export function StudioMainOnboarding({
  language,
  createNewSession,
  openQuickStart,
  createDemoSession,
  showQuickStartLock,
}: StudioMainOnboardingProps) {
  return (
    <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden z-1">
      <div className="absolute inset-0 z-0">
        <Image src="/images/gate-infrastructure-visual.jpg" alt="" fill priority={true} className="object-cover opacity-20 studio-onboarding-bg-image" />
      </div>
      <div className="absolute inset-0 z-1 pointer-events-none opacity-4 studio-onboarding-noise" />
      <div className="relative z-10 flex flex-col items-center w-full">
        <OnboardingGuide
          lang={language}
          onComplete={() => { window.dispatchEvent(new Event('storage')); }}
          onNavigate={(tab) => { createNewSession(tab as AppTab); }}
          onQuickStart={openQuickStart}
          onDemo={createDemoSession}
          showQuickStartLock={showQuickStartLock}
        />
      </div>
    </div>
  );
}
