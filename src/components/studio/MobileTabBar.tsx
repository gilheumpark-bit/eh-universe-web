'use client';

// ============================================================
// PART 1 — Mobile Tab Bar — bottom navigation for mobile screens
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Globe, UserCircle, PenTool, FileText, Menu, X, History, Settings, Map, Zap } from 'lucide-react';
import type { AppTab, AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

interface MobileTabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  language: AppLanguage;
  mode?: 'guided' | 'free';
}

const MORE_TABS: { key: AppTab; icon: React.ElementType }[] = [
  { key: 'style',      icon: Map },
  { key: 'visual',     icon: Zap },
  { key: 'manuscript', icon: FileText },
  { key: 'history',    icon: History },
  { key: 'settings',   icon: Settings },
];

const PRIMARY_TABS: { key: AppTab | 'more'; icon: React.ElementType }[] = [
  { key: 'world',      icon: Globe },
  { key: 'characters', icon: UserCircle },
  { key: 'writing',    icon: PenTool },
  { key: 'rulebook',   icon: FileText },
  { key: 'more',       icon: Menu },
];

const GUIDED_TABS: { key: AppTab; icon: React.ElementType }[] = [
  { key: 'world',      icon: Globe },
  { key: 'characters', icon: UserCircle },
  { key: 'rulebook',   icon: FileText },
  { key: 'settings',   icon: Settings },
];

// IDENTITY_SEAL: PART-1 | role=types-constants | inputs=none | outputs=MobileTabBarProps,tab arrays

// ============================================================
// PART 2 — Component
// ============================================================

export default function MobileTabBar({ activeTab, onTabChange, language, mode = 'free' }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isGuided = mode === 'guided';
  const primaryTabs = isGuided ? GUIDED_TABS : PRIMARY_TABS;
  const t = createT(language);
  const moreScrollRef = useRef<HTMLDivElement>(null);

  const handleTab = useCallback((key: AppTab | 'more') => {
    if (isGuided) { onTabChange(key as AppTab); return; }
    if (key === 'more') {
      setMoreOpen(prev => !prev);
    } else {
      setMoreOpen(false);
      onTabChange(key);
    }
  }, [isGuided, onTabChange]);

  const isMoreActive = !isGuided && (moreOpen || MORE_TABS.some(tab => tab.key === activeTab));

  const getTabLabel = (key: string): string => t(`mobileTab.${key}`, key);

  // Auto-scroll active tab in "more" panel into view
  useEffect(() => {
    if (moreOpen && moreScrollRef.current) {
      const activeBtn = moreScrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden" role="tablist" aria-label="Main navigation">
      {/* More panel — horizontally scrollable when too many tabs */}
      {!isGuided && moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div
            ref={moreScrollRef}
            className="relative mx-2 mb-1 rounded-xl bg-bg-primary border border-border p-2 overflow-x-auto overscroll-x-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-1 min-w-min">
              {MORE_TABS.map(({ key, icon: Icon }) => (
                <button key={key} data-testid={`tab-${key}`} data-active={activeTab === key} onClick={() => handleTab(key)} type="button"
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-lg text-xs min-h-[44px] min-w-[60px] shrink-0 transition-colors
                    ${activeTab === key ? 'text-accent-purple bg-accent-purple/10' : 'text-text-tertiary active:bg-white/5'}`}>
                  <Icon size={20} />
                  <span className="whitespace-nowrap">{getTabLabel(key)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Primary tab bar */}
      <div
        className="bg-bg-primary/95 backdrop-blur-md border-t border-border flex justify-around items-center px-1 pt-1.5"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {primaryTabs.map(({ key, icon: Icon }) => {
          const active = key === 'more' ? isMoreActive : activeTab === key;
          const TabIcon = !isGuided && key === 'more' && moreOpen ? X : Icon;
          return (
            <button key={key} data-testid={`tab-${key}`} onClick={() => handleTab(key)} type="button"
              role="tab"
              aria-selected={active}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] leading-tight min-h-[44px] min-w-[44px] transition-colors
                ${active ? 'text-accent-purple' : 'text-text-tertiary active:text-text-secondary'}`}>
              <TabIcon size={22} />
              <span>{getTabLabel(key)}</span>
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-purple" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// IDENTITY_SEAL: PART-2 | role=tab-bar-component | inputs=activeTab,onTabChange,language,mode | outputs=UI(bottom tabs)
