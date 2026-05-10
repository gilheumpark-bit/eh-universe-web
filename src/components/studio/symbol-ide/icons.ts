// ============================================================
// PART 1 — Module Header
// ============================================================
//
// Symbol Kind → Lucide Icon 매핑.
// HoverCard / OutlinePanel / QuickJumpModal 공유.
//
// [K] 단일 책임 — 아이콘 매핑만. 라벨은 호출 측 로컬라이즈.
// ============================================================

import { Users, MapPin, Package, Lightbulb, Zap } from 'lucide-react';
import type { SymbolKind } from '@/lib/symbol-index/types';
import type React from 'react';

export const SYMBOL_KIND_ICON: Record<SymbolKind, React.ComponentType<{ className?: string }>> = {
  character: Users,
  place: MapPin,
  item: Package,
  concept: Lightbulb,
  event: Zap,
};

/** 이모지 매핑 (텍스트 컨텍스트 — 패널 헤더 등) */
export const SYMBOL_KIND_EMOJI: Record<SymbolKind, string> = {
  character: '👥',
  place: '🗺️',
  item: '📦',
  concept: '💡',
  event: '⚡',
};
