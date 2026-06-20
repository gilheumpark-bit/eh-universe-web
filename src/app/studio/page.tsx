"use client";

// [Phase 2 브리지 — 2026-06-10] /studio 는 새 6탭 셸(LoreguardStudio)을 real 엔진
// provider(StudioShell children-slot) 안에 마운트한 LoreguardStudioMounted 를 렌더.
// → 새 디자인 + 기존 기능 훅(useProjectManager/useStudioAI/useTranslation 등) 재사용.
// dynamic import(ssr:false) 패턴 유지 (First Load JS 축소 + 훅의 브라우저 API 의존).
import dynamic from 'next/dynamic';
import { StudioPageSkeleton } from '@/components/SkeletonLoader';

const LoreguardStudioMounted = dynamic(
  () => import('@/components/loreguard/LoreguardStudioMounted'),
  {
    ssr: false,
    loading: () => <StudioPageSkeleton />,
  },
);

export default function StudioPage() {
  return <LoreguardStudioMounted />;
}
