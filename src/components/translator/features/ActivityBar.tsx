import React from 'react';
import { useTranslatorLayout, LeftPanelType } from '../core/TranslatorLayoutContext';
import { Files, BookA, Settings, History, Menu, Layers } from 'lucide-react';
import { useLang } from '@/lib/LangContext';

interface IconWrapperProps {
  type: LeftPanelType;
  icon: React.ElementType;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

const IconWrapper = ({ icon: Icon, title, isActive, onClick }: IconWrapperProps) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`group flex h-[48px] w-[50px] items-center justify-center transition-all duration-300 relative cursor-pointer pointer-events-auto border-l-[3px] my-1 ${
        isActive
          ? 'border-accent-amber bg-linear-to-r from-accent-amber/10 to-transparent'
          : 'border-transparent hover:border-text-secondary/30'
      }`}
    >
      <div 
        className={`flex items-center justify-center transition-all duration-300 ${
          isActive 
            ? 'text-accent-amber drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110' 
            : 'text-text-tertiary group-hover:text-text-primary group-hover:scale-105'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
      </div>
      
      {/* Active Glow effect on the left edge */}
      {isActive && (
        <div className="absolute left-[-3px] top-0 bottom-0 w-[4px] bg-accent-amber shadow-[0_0_12px_rgba(251,191,36,0.6)] rounded-r-full" />
      )}
    </button>
  );
};

export function ActivityBar() {
  const layout = useTranslatorLayout();
  const { lang } = useLang();

  const handleToggle = (type: LeftPanelType) => {
    if (layout.activeLeftPanel === type) {
      layout.setActiveLeftPanel(null); // Toggle off
    } else {
      layout.setActiveLeftPanel(type);
    }
  };

  return (
    <div className="flex h-full w-[54px] shrink-0 flex-col border-r border-white/5 bg-black/80 backdrop-blur-2xl pointer-events-auto relative z-50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      {/* 엑티비티 바 상단 장식 로고 */}
      <div className="flex w-full items-center justify-center pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-accent-purple/40 to-accent-amber/40 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-white/10">
          <Layers className="h-4 w-4 text-white opacity-90" />
        </div>
      </div>
      
      <div className="w-8 mx-auto h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-2" />

      <div className="flex flex-1 flex-col items-center py-2 gap-1 w-full">
        {/* Mobile menu toggle fallback (desktop hides usually) */}
        <button
          className="lg:hidden flex h-12 w-full items-center justify-center text-text-tertiary hover:text-text-primary pointer-events-auto transition-colors"
          onClick={() => {
            // Trigger mobile drawer if needed
          }}
        >
          <Menu className="h-5 w-5" />
        </button>

        <IconWrapper
          type="explorer"
          icon={Files}
          title={lang === 'ko' ? '파일/챕터 (Explorer)' : 'Explorer'}
          isActive={layout.activeLeftPanel === 'explorer'}
          onClick={() => handleToggle('explorer')}
        />
        <IconWrapper
          type="history"
          icon={History}
          title={lang === 'ko' ? '번역 기록 (History)' : 'History'}
          isActive={layout.activeLeftPanel === 'history'}
          onClick={() => handleToggle('history')}
        />
        <IconWrapper
          type="glossary"
          icon={BookA}
          title={lang === 'ko' ? '용어집 (Glossary)' : 'Glossary'}
          isActive={layout.activeLeftPanel === 'glossary'}
          onClick={() => handleToggle('glossary')}
        />
      </div>
      
      <div className="flex flex-col items-center py-2 pb-6 gap-2 w-full">
        <div className="w-8 mx-auto h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-2" />
        <IconWrapper
          type="settings"
          icon={Settings}
          title={lang === 'ko' ? '설정 (Settings)' : 'Settings'}
          isActive={layout.activeLeftPanel === 'settings'}
          onClick={() => handleToggle('settings')}
        />
      </div>
    </div>
  );
}
