'use client';

import React, { useState, useCallback } from 'react';
import { Globe, UserCircle, PenTool, FileText, Menu, X, History, Settings, Map } from 'lucide-react';
import type { AppTab, AppLanguage } from '@/lib/studio-types';

interface MobileTabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  language: 'KO' | 'EN' | 'JP' | 'CN';
}

const LABELS: Record<string, Record<AppLanguage, string>> = {
  world:      { KO: '세계관', EN: 'World',   JP: '世界',   CN: '世界' },
  characters: { KO: '캐릭터', EN: 'Chars',   JP: 'キャラ', CN: '角色' },
  writing:    { KO: '집필',   EN: 'Write',   JP: '執筆',   CN: '写作' },
  rulebook:   { KO: '연출',   EN: 'Direct',  JP: '演出',   CN: '导演' },
  more:       { KO: '더보기', EN: 'More',    JP: 'その他', CN: '更多' },
  style:      { KO: '문체',   EN: 'Style',   JP: '文体',   CN: '文体' },
  manuscript: { KO: '원고',   EN: 'Script',  JP: '原稿',   CN: '稿件' },
  history:    { KO: '히스토리', EN: 'History', JP: '履歴',  CN: '历史' },
  settings:   { KO: '설정',   EN: 'Settings', JP: '設定',  CN: '设置' },
};

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

export default function MobileTabBar({ activeTab, onTabChange, language }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleTab = useCallback((key: AppTab | 'more') => {
    if (key === 'more') {
      setMoreOpen(prev => !prev);
    } else {
      setMoreOpen(false);
      onTabChange(key);
    }
  }, [onTabChange]);

  const isMoreActive = moreOpen || MORE_TABS.some(t => t.key === activeTab);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      {moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative mx-2 mb-1 rounded-xl bg-bg-primary border border-border p-2 grid grid-cols-5 gap-1">
            {MORE_TABS.map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => handleTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs
                  ${activeTab === key ? 'text-accent-purple' : 'text-text-tertiary'}`}>
                <Icon size={20} />
                <span>{LABELS[key]?.[language] ?? key}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="bg-bg-primary border-t border-border flex justify-around items-center px-1 pt-1.5"
           style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {PRIMARY_TABS.map(({ key, icon: Icon }) => {
          const active = key === 'more' ? isMoreActive : activeTab === key;
          const TabIcon = key === 'more' && moreOpen ? X : Icon;
          return (
            <button key={key} onClick={() => handleTab(key)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 text-[10px] leading-tight
                ${active ? 'text-accent-purple' : 'text-text-tertiary'}`}>
              <TabIcon size={22} />
              <span>{LABELS[key]?.[language] ?? key}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
