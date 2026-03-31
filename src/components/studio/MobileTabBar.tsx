'use client';

// ============================================================
// PART 1 — Mobile Tab Bar — Premium bottom navigation for mobile screens
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
// PART 2 — Premium Component
// ============================================================

export default function MobileTabBar({ activeTab, onTabChange, language, mode = 'free' }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
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

  // Haptic feedback simulation
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <nav 
      className="fixed bottom-0 inset-x-0 z-50 md:hidden" 
      role="tablist" 
      aria-label="Studio navigation"
    >
      {/* More panel — horizontally scrollable overlay */}
      {!isGuided && moreOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-scale" 
            onClick={() => setMoreOpen(false)} 
            aria-hidden="true"
          />
          <div
            ref={moreScrollRef}
            className="relative mx-3 mb-2 rounded-2xl bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-3 overflow-x-auto overscroll-x-contain shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-2 min-w-min">
              {MORE_TABS.map(({ key, icon: Icon }, index) => {
                const isActive = activeTab === key;
                return (
                  <button 
                    key={key} 
                    data-testid={`tab-${key}`} 
                    data-active={isActive} 
                    onClick={() => { triggerHaptic(); handleTab(key); }} 
                    type="button"
                    className={`
                      relative flex flex-col items-center gap-1 py-3 px-4 rounded-xl text-xs 
                      min-h-[52px] min-w-[68px] shrink-0 
                      transition-all duration-200 ease-out
                      ${isActive 
                        ? 'text-accent-purple bg-accent-purple/15 shadow-[0_0_16px_rgba(141,123,195,0.2)]' 
                        : 'text-text-tertiary hover:text-text-secondary active:bg-white/5 active:scale-95'
                      }
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="whitespace-nowrap font-medium">{getTabLabel(key)}</span>
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent-purple" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Primary tab bar — glass morphism style */}
      <div
        className="relative bg-bg-primary/90 backdrop-blur-xl border-t border-white/[0.08] flex justify-around items-center px-2 pt-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Subtle top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {primaryTabs.map(({ key, icon: Icon }) => {
          const active = key === 'more' ? isMoreActive : activeTab === key;
          const TabIcon = !isGuided && key === 'more' && moreOpen ? X : Icon;
          const isPressed = pressedTab === key;
          
          return (
            <button 
              key={key} 
              data-testid={`tab-${key}`} 
              onClick={() => { triggerHaptic(); handleTab(key); }}
              onTouchStart={() => setPressedTab(key)}
              onTouchEnd={() => setPressedTab(null)}
              onMouseDown={() => setPressedTab(key)}
              onMouseUp={() => setPressedTab(null)}
              onMouseLeave={() => setPressedTab(null)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={getTabLabel(key)}
              className={`
                relative flex flex-col items-center gap-1 py-2.5 px-4 
                text-[11px] font-medium leading-tight 
                min-h-[52px] min-w-[52px] rounded-xl
                transition-all duration-200 ease-out
                ${active 
                  ? 'text-accent-purple' 
                  : 'text-text-tertiary'
                }
                ${isPressed ? 'scale-90' : 'scale-100'}
              `}
            >
              {/* Active background glow */}
              {active && (
                <span 
                  className="absolute inset-0 rounded-xl bg-accent-purple/10 animate-fade-in-scale"
                  style={{ animationDuration: '200ms' }}
                />
              )}
              
              {/* Icon with subtle bounce on active */}
              <span className={`relative z-10 transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                <TabIcon size={22} strokeWidth={active ? 2.5 : 2} />
              </span>
              
              {/* Label */}
              <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-accent-purple font-semibold' : ''}`}>
                {getTabLabel(key)}
              </span>
              
              {/* Active indicator bar */}
              {active && (
                <span 
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-accent-purple shadow-[0_0_8px_rgba(141,123,195,0.5)]"
                  style={{ animation: 'scale-in 200ms ease-out' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { transform: translateX(-50%) scaleX(0); }
          to { transform: translateX(-50%) scaleX(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 200ms ease-out forwards;
        }
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </nav>
  );
}

// IDENTITY_SEAL: PART-2 | role=premium-tab-bar | inputs=activeTab,onTabChange,language,mode | outputs=UI(glass-morphism bottom tabs)
