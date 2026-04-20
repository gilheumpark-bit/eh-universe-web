"use client";

// [E 번들 분할] StudioShell(1131줄, M1 Fortress)을 dynamic import(ssr:false)로 래핑.
// Initial SSR payload에서 StudioShell 트리 전체 제외 → First Load JS 축소.
// client 측 hydration 시 StudioPageSkeleton 으로 대체 렌더.
import dynamic from 'next/dynamic';
import { StudioPageSkeleton } from '@/components/SkeletonLoader';

const StudioShell = dynamic(() => import('./StudioShell'), {
  ssr: false,
  loading: () => <StudioPageSkeleton />,
});

export default function StudioPage() {
  return <StudioShell />;
}
