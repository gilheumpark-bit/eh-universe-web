"use client";

import { Suspense } from 'react';
import { StudioPageSkeleton } from '@/components/SkeletonLoader';
import StudioShell from './StudioShell';

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioPageSkeleton />}>
      <StudioShell />
    </Suspense>
  );
}
