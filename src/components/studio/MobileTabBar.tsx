'use client';

import React, { useState, useCallback } from 'react';
import { Globe, UserCircle, PenTool, FileText, Menu, X, History, Settings, Map } from 'lucide-react';
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

export default function MobileTabBar({ activeTab, onTabChange, language, mode = 'free' }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isGuided = mode === 'guided';
  const primaryTabs = isGuided ? GUIDED_TABS : PRIMARY_TABS;
  const t = createT(language);

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

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      {!isGuided && moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative mx-2 mb-1 rounded-xl bg-bg-primary border border-border p-2 grid grid-cols-5 gap-1">
            {MORE_TABS.map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => handleTab(key)} type="button"
                className={`flex flex-col items-center gap-0.5 py-2.5 rounded-lg text-xs min-h-[44px]
                  ${activeTab === key ? 'text-accent-purple' : 'text-text-tertiary'}`}>
                <Icon size={20} />
                <span>{getTabLabel(key)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="bg-bg-primary border-t border-border flex justify-around items-center px-1 pt-1.5"
           style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {primaryTabs.map(({ key, icon: Icon }) => {
          const active = key === 'more' ? isMoreActive : activeTab === key;
          const TabIcon = !isGuided && key === 'more' && moreOpen ? X : Icon;
          return (
            <button key={key} onClick={() => handleTab(key)} type="button"
              className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] leading-tight min-h-[44px]
                ${active ? 'text-accent-purple' : 'text-text-tertiary'}`}>
              <TabIcon size={22} />
              <span>{getTabLabel(key)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
